"""Independent synthetic-only contract oracles; no live requests or secret files."""
import copy
import hashlib
import json
import unittest
from pathlib import Path
from urllib.parse import parse_qs, urlencode, urlsplit

from scripts.api_proof_contract import (
    ProofContractError,
    encode_service_key,
    inspect_fixture_response,
    merge_fixture_pages,
    prepare_fixture_request,
    resolve_fixture_crosswalk,
)


FIXTURES = Path(__file__).parent / "fixtures/synthetic/api-proof"
SYNTHETIC_KEY = "SYNTHETIC+KEY/ONLY=%"


def fixture_bytes(name):
    return (FIXTURES / name).read_bytes()


def fixture_json(name):
    return json.loads(fixture_bytes(name))


def envelope(items, total=1, page=1, size=10, code="00"):
    return {
        "response": {
            "header": {"resultCode": code, "resultMsg": "SYNTHETIC_CASE"},
            "body": {
                "items": {"item": items},
                "totalCount": total,
                "pageNo": page,
                "numOfRows": size,
            },
        }
    }


def observation(items, total=1, page=1, size=10):
    return inspect_fixture_response(
        200, json.dumps(envelope(items, total, page, size)).encode("utf-8")
    )


class RequestContractTests(unittest.TestCase):
    def setUp(self):
        self.contract = fixture_json("request-contract.json")
        self.parameters = {"jmCd": "0007", "implYy": "2026", "pageNo": 1, "numOfRows": 10}

    def test_raw_key_reserved_characters_have_exact_encoding(self):
        self.assertEqual(encode_service_key(SYNTHETIC_KEY), "SYNTHETIC%2BKEY%2FONLY%3D%25")

    def test_explicit_percent_encoded_key_is_encoded_once(self):
        encoded = "SYNTHETIC%2BKEY%2FONLY%3D%25"
        self.assertEqual(encode_service_key(encoded, "percent_encoded"), encoded)
        self.assertNotIn("%252B", encode_service_key(encoded, "percent_encoded"))

    def test_bad_key_representation_or_percent_escape_is_rejected(self):
        for value, representation in (("", "decoded"), ("synthetic", "guess"),
                                      ("synthetic%ZZ", "percent_encoded"),
                                      ("synthetic%2", "percent_encoded")):
            with self.subTest(representation=representation), self.assertRaises(ProofContractError):
                encode_service_key(value, representation)

    def test_prepared_request_preserves_string_code_and_raw_plus(self):
        request = prepare_fixture_request(self.contract, self.parameters, SYNTHETIC_KEY)
        parsed = parse_qs(urlsplit(request.url).query)
        self.assertEqual(parsed["jmCd"], ["0007"])
        self.assertEqual(parsed["serviceKey"], [SYNTHETIC_KEY])
        self.assertEqual(urlsplit(request.url).hostname, "api.example.invalid")

    def test_key_parameter_case_follows_explicit_contract(self):
        self.contract["service_key_parameter"] = "ServiceKey"
        request = prepare_fixture_request(self.contract, self.parameters, SYNTHETIC_KEY)
        query = parse_qs(urlsplit(request.url).query)
        self.assertIn("ServiceKey", query)
        self.assertNotIn("serviceKey", query)

    def test_summary_and_repr_never_include_raw_or_encoded_credential(self):
        request = prepare_fixture_request(self.contract, self.parameters, SYNTHETIC_KEY)
        for rendered in (repr(request), json.dumps(request.safe_summary(), ensure_ascii=False)):
            self.assertNotIn(SYNTHETIC_KEY, rendered)
            self.assertNotIn(encode_service_key(SYNTHETIC_KEY), rendered)
            self.assertNotIn("serviceKey", rendered)

    def test_nonfixture_or_unsafe_endpoint_is_rejected(self):
        endpoints = [
            "http://api.example.invalid/fixture", "https://apis.data.go.kr/fixture",
            "https://api.example.invalid.evil/fixture", "https://user@api.example.invalid/fixture",
            "https://api.example.invalid/fixture#fragment", "https://api.example.invalid:444/fixture",
            "https://api.example.invalid/fixture?" + urlencode({"serviceKey": "SYNTHETIC_ONLY"}),
        ]
        for endpoint in endpoints:
            with self.subTest(endpoint=endpoint):
                contract = dict(self.contract, endpoint=endpoint)
                with self.assertRaises(ProofContractError):
                    prepare_fixture_request(contract, self.parameters, SYNTHETIC_KEY)

    def test_unknown_parameters_and_secret_parameter_override_are_rejected(self):
        for key in ("unexpected", "serviceKey", "ServiceKey", "access_token"):
            with self.subTest(parameter=key), self.assertRaises(ProofContractError):
                prepare_fixture_request(self.contract, dict(self.parameters, **{key: "SYNTHETIC"}), SYNTHETIC_KEY)

    def test_required_parameter_or_code_type_cannot_be_coerced(self):
        bad_parameters = [dict(self.parameters, jmCd=7), dict(self.parameters, jmCd=True),
                          dict(self.parameters, pageNo=True)]
        missing = dict(self.parameters)
        del missing["implYy"]
        bad_parameters.append(missing)
        for parameters in bad_parameters:
            with self.subTest(parameters=parameters), self.assertRaises(ProofContractError):
                prepare_fixture_request(self.contract, parameters, SYNTHETIC_KEY)

    def test_request_safe_parameters_are_a_snapshot(self):
        request = prepare_fixture_request(self.contract, self.parameters, SYNTHETIC_KEY)
        before = json.dumps(request.safe_summary(), ensure_ascii=False, sort_keys=True)
        self.parameters["jmCd"] = "9999"
        self.assertEqual(json.dumps(request.safe_summary(), ensure_ascii=False, sort_keys=True), before)


class ResponseContractTests(unittest.TestCase):
    def test_json_single_item_preserves_code_zero_and_counts(self):
        result = inspect_fixture_response(200, fixture_bytes("success-single.json"))
        self.assertEqual(result.state, "SUCCESS")
        self.assertEqual(result.items[0]["jmcd"], "0007")
        self.assertEqual((result.total_count, result.page_no, result.page_size), (1, 1, 10))

    def test_json_many_items_and_string_total_are_normalized(self):
        result = inspect_fixture_response(200, fixture_bytes("success-many.json"))
        self.assertEqual(result.state, "SUCCESS")
        self.assertEqual(result.total_count, 2)
        self.assertEqual(tuple(item["jmcd"] for item in result.items), ("0007", "0012"))

    def test_xml_single_item_preserves_code_zero(self):
        result = inspect_fixture_response(200, fixture_bytes("success-single.xml"))
        self.assertEqual(result.state, "SUCCESS")
        self.assertEqual(result.items[0]["jmcd"], "0007")

    def test_xml_many_items_preserve_korean_text(self):
        result = inspect_fixture_response(200, fixture_bytes("success-many.xml"))
        self.assertEqual(result.state, "SUCCESS")
        self.assertEqual(tuple(item["jmfldnm"] for item in result.items), ("합성종목A", "합성종목B"))

    def test_empty_or_null_items_remain_unconfirmed(self):
        for items in (None, []):
            with self.subTest(item_type=type(items).__name__):
                result = observation(items, total=0)
                self.assertEqual(result.state, "EMPTY_UNCONFIRMED")
                self.assertEqual(result.items, ())

    def test_transport_and_http_errors_are_not_response_success(self):
        cases = ((None, "TRANSPORT_ERROR"), (429, "QUOTA_ERROR"),
                 (500, "UPSTREAM_ERROR"), (503, "UPSTREAM_ERROR"), (401, "HTTP_ERROR"))
        for status, expected in cases:
            with self.subTest(http_status=status):
                self.assertEqual(inspect_fixture_response(status, None).state, expected)

    def test_http_200_business_codes_are_distinct_from_http_success(self):
        for code, expected in (("30", "AUTH_ERROR"), ("22", "QUOTA_ERROR"), ("99", "BUSINESS_ERROR")):
            with self.subTest(synthetic_code=code):
                body = json.dumps(envelope(None, total=0, code=code)).encode()
                self.assertEqual(inspect_fixture_response(200, body).state, expected)

    def test_xml_business_error_needs_no_success_body(self):
        self.assertEqual(inspect_fixture_response(200, fixture_bytes("auth-error.xml")).state, "AUTH_ERROR")

    def test_missing_header_is_invalid_even_with_items(self):
        self.assertEqual(inspect_fixture_response(200, fixture_bytes("missing-header.json")).state, "INVALID_HEADER")

    def test_malformed_documents_and_missing_success_body_are_invalid(self):
        cases = [b'{"response":', b"<response><header>",
                 b'{"response":{"header":{"resultCode":"00"}}}',
                 b'{"response":{"header":{"resultCode":"00"},"body":{"totalCount":0}}}',
                 b'<response><header><resultCode>00</resultCode></header><body><totalCount>0</totalCount></body></response>']
        for payload in cases:
            with self.subTest(payload=payload):
                self.assertEqual(inspect_fixture_response(200, payload).state, "INVALID_RESPONSE")

    def test_html_error_page_is_not_xml_api_data(self):
        self.assertEqual(inspect_fixture_response(200, b"<html><body>synthetic outage</body></html>").state,
                         "UNEXPECTED_FORMAT")

    def test_doctype_and_external_entity_declarations_are_refused(self):
        self.assertEqual(inspect_fixture_response(200, fixture_bytes("unsafe-doctype.xml")).state, "UNSAFE_XML")
        entity_only = b'<!ENTITY synthetic SYSTEM "https://host.example.invalid/never-fetch"><response/>'
        self.assertEqual(inspect_fixture_response(200, entity_only).state, "UNSAFE_XML")

    def test_non_utf8_and_nul_content_never_passes(self):
        payloads = [b"\xff\xfe<response/>", b"<response>\x00</response>",
                    "<response/>".encode("utf-16-le")]
        for payload in payloads:
            with self.subTest(bytes_count=len(payload)):
                self.assertNotIn(inspect_fixture_response(200, payload).state,
                                 ("SUCCESS", "EMPTY_UNCONFIRMED"))

    def test_payload_size_limit_prevents_parsing(self):
        self.assertEqual(inspect_fixture_response(200, b" " * 65537).state, "PAYLOAD_TOO_LARGE")

    def test_deep_json_and_xml_are_refused(self):
        payloads = [('{"nested":' * 40 + "0" + "}" * 40).encode(),
                    ("<node>" * 40 + "value" + "</node>" * 40).encode()]
        for payload in payloads:
            with self.subTest(prefix=payload[:5]):
                self.assertEqual(inspect_fixture_response(200, payload).state, "TOO_DEEP")

    def test_total_count_does_not_accept_boolean_negative_or_noninteger(self):
        for total in (True, -1, 1.5, "not-an-integer"):
            with self.subTest(total=total):
                self.assertEqual(observation({"jmcd": "0007"}, total=total).state, "INVALID_RESPONSE")

    def test_duplicate_envelope_or_pagination_fields_are_invalid(self):
        header = "<header><resultCode>00</resultCode></header>"
        body = "<body><items/><totalCount>0</totalCount><pageNo>1</pageNo><numOfRows>10</numOfRows></body>"
        payloads = [
            ("<response>" + header + header + body + "</response>").encode(),
            ("<response>" + header + body + body + "</response>").encode(),
            b'{"response":{"header":{"resultCode":"00"},"header":{"resultCode":"30"}}}',
        ]
        for field, value in (("totalCount", "0"), ("pageNo", "1"), ("numOfRows", "10")):
            extra = "<" + field + ">" + value + "</" + field + ">"
            duplicate_body = body.replace("</body>", extra + "</body>")
            payloads.append(("<response>" + header + duplicate_body + "</response>").encode())
        for payload in payloads:
            with self.subTest(payload=payload):
                self.assertEqual(inspect_fixture_response(200, payload).state, "INVALID_RESPONSE")


class PageAndMappingContractTests(unittest.TestCase):
    def test_complete_pages_merge_without_mutating_observations(self):
        first = observation({"jmcd": "0007"}, total=2, page=1, size=1)
        second = observation({"jmcd": "0012"}, total=2, page=2, size=1)
        before = copy.deepcopy((first.items, second.items))
        merged = merge_fixture_pages([first, second])
        self.assertEqual(merged.state, "SUCCESS")
        self.assertEqual(tuple(item["jmcd"] for item in merged.items), ("0007", "0012"))
        self.assertEqual((first.items, second.items), before)

    def test_middle_page_failure_never_exposes_partial_success(self):
        first = observation({"jmcd": "0007"}, total=2, page=1, size=1)
        failed = inspect_fixture_response(500, None)
        merged = merge_fixture_pages([first, failed])
        self.assertEqual(merged.state, "INCOMPLETE")
        self.assertEqual(merged.items, ())

    def test_page_gaps_count_changes_and_empty_positive_total_are_incomplete(self):
        first = observation({"jmcd": "0007"}, total=2, page=1, size=1)
        cases = [
            [first],
            [observation({"jmcd": "0007"}, total=2, page=2, size=1)],
            [first, observation({"jmcd": "0012"}, total=2, page=3, size=1)],
            [first, observation({"jmcd": "0012"}, total=3, page=2, size=1)],
            [observation(None, total=1, page=1, size=1)],
        ]
        for pages in cases:
            with self.subTest(page_count=len(pages)):
                merged = merge_fixture_pages(pages)
                self.assertEqual(merged.state, "INCOMPLETE")
                self.assertEqual(merged.items, ())

    def test_duplicate_record_between_pages_is_not_complete(self):
        pages = [observation({"jmcd": "0007"}, total=2, page=number, size=1) for number in (1, 2)]
        merged = merge_fixture_pages(pages)
        self.assertEqual(merged.state, "INCOMPLETE")
        self.assertEqual(merged.items, ())

    def test_empty_complete_page_never_claims_not_announced(self):
        empty = inspect_fixture_response(200, fixture_bytes("empty.json"))
        merged = merge_fixture_pages([empty])
        self.assertEqual(merged.state, "EMPTY_UNCONFIRMED")
        self.assertNotEqual(merged.state, "not_announced")

    def test_exact_reviewed_crosswalk_requires_name_grade_and_year(self):
        row = {"source_name": "합성종목A", "source_grade": "합성등급", "year": 2026,
               "internal_id": "fixture-a", "reviewed": True, "evidence": "synthetic-review-only"}
        self.assertEqual(resolve_fixture_crosswalk("합성종목A", "합성등급", 2026, [row]), "fixture-a")
        for name, grade, year in (("합성종목", "합성등급", 2026), ("합성종목A", "다른등급", 2026),
                                  ("합성종목A", "합성등급", 2025)):
            with self.subTest(name=name, grade=grade, year=year):
                self.assertIsNone(resolve_fixture_crosswalk(name, grade, year, [row]))

    def test_unreviewed_unevidenced_or_duplicate_mapping_stays_unmapped(self):
        row = {"source_name": "합성종목A", "source_grade": "합성등급", "year": 2026,
               "internal_id": "fixture-a", "reviewed": True, "evidence": "synthetic-review-only"}
        cases = [[dict(row, reviewed=False)], [dict(row, evidence="")], [row, dict(row)], []]
        for rows in cases:
            with self.subTest(row_count=len(rows)):
                self.assertIsNone(resolve_fixture_crosswalk("합성종목A", "합성등급", 2026, rows))

    def test_null_blank_or_wrong_type_identity_cannot_be_reviewed_into_a_match(self):
        identities = [
            (None, "합성등급", 2026), ("", "합성등급", 2026), (" ", "합성등급", 2026),
            ("합성종목A", None, 2026), ("합성종목A", "", 2026),
            ("합성종목A", "합성등급", True), ("합성종목A", "합성등급", False),
            ("합성종목A", "합성등급", "2026"), ("합성종목A", "합성등급", 2026.0),
        ]
        for name, grade, year in identities:
            with self.subTest(name=name, grade=grade, year=year):
                row = {"source_name": name, "source_grade": grade, "year": year,
                       "internal_id": "fixture-a", "reviewed": True, "evidence": "synthetic-review-only"}
                self.assertIsNone(resolve_fixture_crosswalk(name, grade, year, [row]))


class FixtureProvenanceTests(unittest.TestCase):
    def test_every_fixture_is_labeled_synthetic_and_manifest_hashes_match(self):
        manifest = fixture_json("manifest.json")
        self.assertEqual(manifest["artifact_kind"], "synthetic_fixture_manifest")
        self.assertFalse(manifest["is_official_data"])
        self.assertFalse(manifest["is_recorded_api_response"])
        self.assertFalse(manifest["publication_allowed"])
        self.assertEqual(manifest["network_requests_used_to_create"], 0)
        for entry in manifest["files"]:
            with self.subTest(fixture=entry["path"]):
                self.assertEqual(entry["provenance"], "synthetic")
                self.assertEqual(hashlib.sha256(fixture_bytes(entry["path"])).hexdigest(), entry["sha256"])


if __name__ == "__main__":
    unittest.main()
