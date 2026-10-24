import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

function check(input: Record<string, string>) {
  return spawnSync(process.execPath, ["node_modules/tsx/dist/cli.mjs", "scripts/check-env.ts"], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: { PATH: process.env.PATH, NODE_ENV: "test", ...input },
  });
}

describe("environment CLI fails closed before an application can start", () => {
  it("accepts an explicit local configuration without credentials", () => {
    const result = check({ APP_ENV: "local", DATA_MODE: "live" });
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({ status: "valid", adsEnabled: false });
  });

  it("rejects missing required settings", () => {
    const result = check({});
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("APP_ENV");
    expect(result.stderr).toContain("DATA_MODE");
  });

  it("refuses a production fixture even with an HTTPS-shaped origin", () => {
    const result = check({ APP_ENV: "production", DATA_MODE: "fixture", PUBLIC_SITE_URL: "https://unit.licenseinsight.kr" });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("DATA_MODE");
  });

  it("does not print credential-like values in a malformed URL", () => {
    const result = check({ APP_ENV: "production", DATA_MODE: "live", PUBLIC_SITE_URL: "https://user:SYNTHETIC_CLI_VALUE@unit.licenseinsight.kr" });
    expect(result.status).toBe(1);
    expect(result.stdout + result.stderr).not.toContain("SYNTHETIC_CLI_VALUE");
    expect(result.stderr).toContain("PUBLIC_SITE_URL");
  });
});
