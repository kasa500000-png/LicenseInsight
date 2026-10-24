import "server-only";
import { createHash } from "node:crypto";
import type { Json } from "@/data/database.types";

const secretField = /^(?:service[_-]?key|api[_-]?key|authorization|access[_-]?token|refresh[_-]?token|password|secret|cookie|set-cookie|database[_-]?url)$/i;

function secretVariants(secrets: string[]): string[] {
  return [...new Set(secrets.filter(Boolean).flatMap((secret) => {
    const encoded = encodeURIComponent(secret);
    const values = [secret, encoded, encodeURIComponent(encoded)];
    try { values.push(decodeURIComponent(secret)); } catch { /* Already a raw key. */ }
    return values;
  }))].sort((a, b) => b.length - a.length);
}

/** Persist parsed data only. Never retain request URL, headers or raw errors. */
export function sanitize(value: unknown, secrets: string[] = []): Json {
  const variants = secretVariants(secrets);
  const patterns = variants.map(variant => new RegExp(variant.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/%((?:25)*)([0-9a-f]{2})/gi, (_, nesting: string, hex: string) => "%" + nesting + [...hex].map(c => /[a-f]/i.test(c) ? `[${c.toLowerCase()}${c.toUpperCase()}]` : c).join("")), "g"));
  const redact = (input: string, replacement: string) => patterns.reduce((text, pattern) => text.replace(pattern, replacement), input);
  let nodes = 0;
  function clean(input: unknown, depth: number): Json {
    if (++nodes > 100_000 || depth > 32) throw new Error("SANITIZATION_LIMIT");
    if (input === null) return null;
    if (typeof input === "string") {
      const result = redact(input, "[REDACTED]");
      return result
        .replace(/([?&](?:servicekey|api_key|apikey|token|access_token)=)[^&#\s]*/gi, "$1[REDACTED]")
        .replace(/\b(?:postgres(?:ql)?):\/\/[^\s]+/gi, "[REDACTED_DATABASE_URL]");
    }
    if (typeof input === "number") {
      if (!Number.isFinite(input) || (Number.isInteger(input) && !Number.isSafeInteger(input))) throw new Error("UNSAFE_NUMBER");
      return input;
    }
    if (typeof input === "boolean") return input;
    if (Array.isArray(input)) return input.map((item) => clean(item, depth + 1));
    if (typeof input !== "object" || Object.getPrototypeOf(input) !== Object.prototype && Object.getPrototypeOf(input) !== null) throw new Error("INVALID_JSON_VALUE");
    const output: Record<string, Json> = {};
    for (const [key, item] of Object.entries(input)) {
      if (["__proto__", "constructor", "prototype"].includes(key)) throw new Error("UNSAFE_FIELD");
      const safeKey = redact(key, "[REDACTED_FIELD]");
      if (Object.hasOwn(output, safeKey)) throw new Error("SANITIZED_KEY_COLLISION");
      output[safeKey] = secretField.test(key) ? "[REDACTED]" : clean(item, depth + 1);
    }
    return output;
  }
  return clean(value, 0);
}

export function canonicalJson(value: Json): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
}

export function hashJson(value: Json): string {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}
