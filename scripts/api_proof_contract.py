#!/usr/bin/env python3
"""STEP-02 offline proof lab. No network client, DB write, or live API adapter.

The envelope and error mappings below apply only to the labelled synthetic
fixtures. Official source contracts remain separately unconfirmed.
"""
import argparse
import json
import os
import re
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote, unquote, urlencode, urlsplit
from xml.etree import ElementTree
from zoneinfo import ZoneInfo

MAX_BYTES = 65536
MAX_DEPTH = 16
ROOT = Path(__file__).resolve().parents[1]


class ProofContractError(ValueError):
    def __init__(self, reason):
        self.reason = reason
        super().__init__(reason)  # Never include input values or raw exceptions.


def encode_service_key(value, representation="decoded"):
    if not isinstance(value, str) or not value or any(c in value for c in "\r\n\x00"):
        raise ProofContractError("INVALID_CREDENTIAL_INPUT")
    if representation == "percent_encoded":
        if re.search(r"%(?![0-9a-fA-F]{2})", value):
            raise ProofContractError("INVALID_PERCENT_ENCODING")
        try:
            value = unquote(value, encoding="utf-8", errors="strict")
        except UnicodeError:
            raise ProofContractError("INVALID_PERCENT_ENCODING") from None
        if any(c in value for c in "\r\n\x00"):
            raise ProofContractError("INVALID_CREDENTIAL_INPUT")
    elif representation != "decoded":
        raise ProofContractError("UNKNOWN_CREDENTIAL_REPRESENTATION")
    return quote(value, safe="")


@dataclass(frozen=True)
class PreparedRequest:
    url: str = field(repr=False)
    source_id: str
    operation: str
    endpoint: str
    parameters: tuple

    def safe_summary(self):
        return {"kind": "synthetic_request_not_sent", "source_id": self.source_id,
                "operation": self.operation, "endpoint": self.endpoint,
                "parameters": dict(self.parameters), "credential": "OMITTED"}


def prepare_fixture_request(contract, parameters, synthetic_key, representation="decoded"):
    """Build an in-memory .invalid request solely to test encoding and logging."""
    if contract.get("kind") != "synthetic_probe_contract":
        raise ProofContractError("UNCONFIRMED_CONTRACT")
    endpoint = contract.get("endpoint", "")
    try:
        url = urlsplit(endpoint)
        valid = (url.scheme == "https" and url.hostname and url.hostname.endswith(".invalid")
                 and not url.username and not url.password and url.port is None
                 and not url.query and not url.fragment and url.path.startswith("/"))
    except (ValueError, AttributeError):
        valid = False
    if not valid or any(c in endpoint for c in "\r\n\x00"):
        raise ProofContractError("SYNTHETIC_HTTPS_ENDPOINT_REQUIRED")
    source = contract.get("source_id")
    operation = contract.get("operation")
    if not isinstance(source, str) or not source.startswith("SYNTHETIC-") or not operation:
        raise ProofContractError("SYNTHETIC_ID_REQUIRED")
    key_name = contract.get("service_key_parameter")
    if key_name not in ("serviceKey", "ServiceKey"):
        raise ProofContractError("UNCONFIRMED_KEY_PARAMETER")
    allowed = set(contract.get("allowed_parameters", []))
    required = set(contract.get("required_parameters", []))
    safe_names = {"jmCd", "implYy", "baseYY", "grdCd", "pageNo", "numOfRows", "dataFormat", "qualgbCd"}
    if not allowed <= safe_names or not required <= allowed:
        raise ProofContractError("UNSAFE_PARAMETER_CONTRACT")
    if not set(parameters) <= allowed or not required <= set(parameters):
        raise ProofContractError("INVALID_PARAMETERS")
    for name, value in parameters.items():
        if name in ("jmCd", "grdCd") and not isinstance(value, str):
            raise ProofContractError("CODE_MUST_BE_STRING")
        if isinstance(value, bool) or not isinstance(value, (str, int)):
            raise ProofContractError("INVALID_PARAMETER_VALUE")
        text = str(value)
        if name == "dataFormat":
            valid_value = text in ("xml", "json")
        elif name == "qualgbCd":
            valid_value = text == "T"
        else:
            valid_value = bool(text) and text.isascii() and text.isdigit()
        if not valid_value:
            raise ProofContractError("INVALID_PARAMETER_VALUE")
    encoded_key = encode_service_key(synthetic_key, representation)
    pairs = tuple(sorted(parameters.items()))
    query = urlencode(pairs, quote_via=quote) + "&" + key_name + "=" + encoded_key
    return PreparedRequest(endpoint + "?" + query, source, operation, endpoint, pairs)


@dataclass(frozen=True)
class Observation:
    state: str
    items: tuple = ()
    total_count: int | None = None
    page_no: int | None = None
    page_size: int | None = None

    def safe_summary(self):
        return {"kind": "synthetic_response_observation", "state": self.state,
                "item_count": len(self.items), "total_count": self.total_count,
                "page_no": self.page_no, "page_size": self.page_size}


def _integer(value, optional=False):
    if value is None and optional:
        return None
    if isinstance(value, bool) or not isinstance(value, (int, str)):
        raise ProofContractError("INVALID_RESPONSE")
    if isinstance(value, str) and (not value.isascii() or not value.isdigit()):
        raise ProofContractError("INVALID_RESPONSE")
    number = int(value)
    if number < 0:
        raise ProofContractError("INVALID_RESPONSE")
    return number


def _check_depth(value):
    stack = [(value, 1)]
    while stack:
        node, depth = stack.pop()
        if depth > MAX_DEPTH:
            raise ProofContractError("TOO_DEEP")
        if isinstance(node, dict):
            stack.extend((v, depth + 1) for v in node.values())
        elif isinstance(node, list):
            stack.extend((v, depth + 1) for v in node)


def _unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ProofContractError("INVALID_RESPONSE")
        result[key] = value
    return result


def _xml_envelope(text):
    if re.search(r"<!\s*(?:DOCTYPE|ENTITY)\b", text, re.IGNORECASE):
        raise ProofContractError("UNSAFE_XML")
    root = ElementTree.fromstring(text)
    stack = [(root, 1)]
    while stack:
        node, depth = stack.pop()
        if depth > MAX_DEPTH:
            raise ProofContractError("TOO_DEEP")
        stack.extend((child, depth + 1) for child in node)
    if root.tag.lower() == "html":
        raise ProofContractError("UNEXPECTED_FORMAT")
    if root.tag != "response":
        raise ProofContractError("INVALID_RESPONSE")
    _unique_object((c.tag, c) for c in root)
    header = root.find("header")
    body = root.find("body")
    result = {"header": None if header is None else _unique_object((c.tag, c.text) for c in header)}
    if body is not None:
        _unique_object((c.tag, c) for c in body)
        result["body"] = {k: body.findtext(k) for k in ("totalCount", "pageNo", "numOfRows")}
        if body.find("items") is not None:
            result["body"]["items"] = {"item": [
                _unique_object((c.tag, c.text or "") for c in item)
                for item in body.findall("./items/item")]}
    return result


def inspect_fixture_response(http_status, payload):
    """Interpret the synthetic envelope; no official schema or live success claim."""
    if http_status is None:
        return Observation("TRANSPORT_ERROR")
    if http_status == 429:
        return Observation("QUOTA_ERROR")
    if isinstance(http_status, int) and http_status >= 500:
        return Observation("UPSTREAM_ERROR")
    if http_status != 200:
        return Observation("HTTP_ERROR")
    if not isinstance(payload, bytes):
        return Observation("INVALID_RESPONSE")
    if len(payload) > MAX_BYTES:
        return Observation("PAYLOAD_TOO_LARGE")
    if b"\x00" in payload:
        return Observation("INVALID_RESPONSE")
    try:
        text = payload.decode("utf-8-sig").strip()
        if text.startswith("<"):
            result = _xml_envelope(text)
        elif text.startswith("{"):
            data = json.loads(text, object_pairs_hook=_unique_object)
            _check_depth(data)
            result = data.get("response")
        else:
            return Observation("UNEXPECTED_FORMAT")
        if not isinstance(result, dict) or not isinstance(result.get("header"), dict):
            return Observation("INVALID_HEADER")
        code = result["header"].get("resultCode")
        if not isinstance(code, str) or not code:
            return Observation("INVALID_HEADER")
        if code != "00":
            return Observation({"30": "AUTH_ERROR", "22": "QUOTA_ERROR"}.get(code, "BUSINESS_ERROR"))
        body = result.get("body")
        if not isinstance(body, dict) or "items" not in body:
            return Observation("INVALID_RESPONSE")
        count = _integer(body.get("totalCount"))
        page = _integer(body.get("pageNo"), optional=True)
        size = _integer(body.get("numOfRows"), optional=True)
        container = body.get("items")
        if container is None or container == "":
            items = None
        elif isinstance(container, dict):
            items = container.get("item")
        else:
            return Observation("INVALID_RESPONSE")
        if isinstance(items, dict):
            items = [items]
        elif items is None:
            items = []
        if not isinstance(items, list) or any(not isinstance(item, dict) for item in items):
            return Observation("INVALID_RESPONSE")
        if len(items) > count:
            return Observation("INVALID_RESPONSE")
        return Observation("SUCCESS" if items else "EMPTY_UNCONFIRMED", tuple(items), count, page, size)
    except ProofContractError as error:
        return Observation(error.reason)
    except RecursionError:
        return Observation("TOO_DEEP")
    except (ValueError, UnicodeError, ElementTree.ParseError, TypeError, AttributeError):
        return Observation("INVALID_RESPONSE")


def merge_fixture_pages(observations):
    """Return no items unless a whole synthetic result set is complete."""
    if not observations or any(o.state not in ("SUCCESS", "EMPTY_UNCONFIRMED") for o in observations):
        return Observation("INCOMPLETE")
    first = observations[0]
    if first.total_count is None or first.page_size is None or first.page_size <= 0:
        return Observation("INCOMPLETE")
    expected_pages = max(1, (first.total_count + first.page_size - 1) // first.page_size)
    if len(observations) != expected_pages:
        return Observation("INCOMPLETE")
    items = []
    seen = set()
    for index, observation in enumerate(observations, 1):
        if (observation.page_no != index or observation.total_count != first.total_count
                or observation.page_size != first.page_size):
            return Observation("INCOMPLETE")
        expected_count = min(first.page_size, max(0, first.total_count - (index - 1) * first.page_size))
        if len(observation.items) != expected_count:
            return Observation("INCOMPLETE")
        for item in observation.items:
            record_key = json.dumps(item, sort_keys=True, ensure_ascii=False)
            if record_key in seen:
                return Observation("INCOMPLETE")
            seen.add(record_key)
            items.append(item)
    if len(items) != first.total_count:
        return Observation("INCOMPLETE")
    return Observation("SUCCESS" if items else "EMPTY_UNCONFIRMED", tuple(items), first.total_count)


def resolve_fixture_crosswalk(name, grade, year, rows):
    if (not isinstance(name, str) or not name.strip() or not isinstance(grade, str)
            or not grade.strip() or isinstance(year, bool) or not isinstance(year, int)
            or not 1 <= year <= 9999):
        return None
    matches = [r for r in rows if r.get("source_name") == name and r.get("source_grade") == grade
               and r.get("year") == year]
    if len(matches) != 1:
        return None
    match = matches[0]
    if match.get("reviewed") is not True or not isinstance(match.get("evidence"), str) or not match["evidence"].strip():
        return None
    internal = match.get("internal_id")
    return internal if isinstance(internal, str) and internal else None


def write_preflight(output):
    now = datetime.now(timezone.utc)
    seoul_date = now.astimezone(ZoneInfo("Asia/Seoul")).date()
    present = bool(os.environ.get("DATA_GO_KR_SERVICE_KEY"))
    contract_path = ROOT / "docs/contracts/public-api-sources.json"
    data = json.loads(contract_path.read_text())
    sources = data.get("sources", [])
    if isinstance(sources, dict):
        source_ids = list(sources)
    else:
        source_ids = [s["source_id"] for s in sources]
    result = {
        "artifact_kind": "step02_preflight_not_live", "generated_at_utc": now.isoformat(),
        "seoul_date": str(seoul_date), "timezone": "Asia/Seoul",
        "credential": {"variable": "DATA_GO_KR_SERVICE_KEY", "present": present, "value_recorded": False},
        "source_ids": source_ids, "account_development_approval": "UNKNOWN",
        "account_production_approval": "UNKNOWN", "authenticated_requests_executed": 0,
        "live_transport_implemented": False, "candidate_schedule_years": [seoul_date.year, seoul_date.year + 1],
        "candidate_completed_statistic_years": list(range(seoul_date.year - 5, seoul_date.year)),
        "candidate_years_verified": False,
        "targets": [{"requested_name": name, "official_name": None, "official_code": None,
                     "source_grade": None, "statistics_crosswalk": None, "code_status": "NOT_RUN",
                     "schedule_status": "NOT_RUN", "statistics_status": "NOT_RUN",
                     "official_comparison": "NOT_RUN", "public_support": "UNVERIFIED"}
                    for name in ("전기기사", "전기산업기사", "전기기능사")],
        "blockers": (["CREDENTIAL_ABSENT"] if not present else []) + ["ACCOUNT_APPROVAL_UNKNOWN", "OFFICIAL_CONTRACT_UNCONFIRMED"],
        "publication_allowed": False, "G0": "BLOCKED",
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"preflight": "BLOCKED", "credential_present": present,
                      "authenticated_requests_executed": 0, "output": str(output)}, ensure_ascii=False))
    return 3  # Documented blocked preflight, not a successful live proof.


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--preflight", action="store_true", required=True, help="Offline readiness only; no key values read or network calls")
    parser.add_argument("--output", type=Path, required=True, help="Write readiness JSON; BLOCKED exits 3")
    args = parser.parse_args()
    return write_preflight(args.output)


if __name__ == "__main__":
    raise SystemExit(main())
