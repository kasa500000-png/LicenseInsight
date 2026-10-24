import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { deepStrictEqual } from "node:assert";
import { fileURLToPath } from "node:url";

const cwd = fileURLToPath(new URL("../", import.meta.url));
const expected = { beforeMidnight: 1, afterMidnight: 0, leapDays: 2, rate: "47.0", examinees: "1000", passed: "470", weekMinutes: 660, excludedMinutes: 600, lastStudyDate: "2026-10-25", targetExcluded: true, officialRequiredHours: null };
const zones = ["UTC", "Asia/Seoul", "America/Los_Angeles", "Pacific/Honolulu", "Pacific/Kiritimati"];
const checks = zones.map(TZ => {
  const raw = execFileSync(process.execPath, ["--import", "tsx", "tests/support/domain-timezone-probe.ts"], {
    cwd, env: { ...process.env, TZ }, encoding: "utf8", timeout: 30_000,
  });
  deepStrictEqual(JSON.parse(raw), expected);
  return { timezone: TZ, status: "PASS", result_sha256: createHash("sha256").update(raw).digest("hex") };
});
console.log(JSON.stringify({ status: "PASS", checks, result: expected, official_data: false }, null, 2));
