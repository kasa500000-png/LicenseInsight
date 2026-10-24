import { expect, it } from "vitest";
import { parseDuration } from "@/components/ui/form-controls";

// UI parsing oracles are synthetic; planner validation remains independent.
it.each([
  ["0", "0", 0], ["24", "0", 1440], ["23", "59", 1439], ["1", "30", 90],
] as const)("converts %s hours / %s minutes to %i integer minutes", (hours, minutes, expected) => {
  expect(parseDuration(hours, minutes)).toEqual({ ok: true, minutes: expected });
});
it.each([
  ["", "0", "REQUIRED"], ["0", "", "REQUIRED"], ["24", "1", "OUT_OF_RANGE"], ["0", "60", "OUT_OF_RANGE"],
  ["25", "0", "OUT_OF_RANGE"], ["-1", "0", "INTEGER_REQUIRED"], ["1.5", "0", "INTEGER_REQUIRED"],
  [" 1", "0", "INTEGER_REQUIRED"], ["NaN", "0", "INTEGER_REQUIRED"], ["10000", "0", "INTEGER_REQUIRED"],
  ["1", "-1", "INTEGER_REQUIRED"], ["1", "1.5", "INTEGER_REQUIRED"],
] as const)("rejects invalid UI duration %s/%s without coercion", (hours, minutes, code) => {
  expect(parseDuration(hours, minutes)).toEqual({ ok: false, code });
});
