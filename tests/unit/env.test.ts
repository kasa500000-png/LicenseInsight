import { describe, expect, it } from "vitest";

import { EnvironmentError, parseEnvironment } from "../../src/config/env";

const local = { APP_ENV: "local", DATA_MODE: "live" };
// Shape-only test origins; these are not configured or verified service domains.
const publicOrigin = "https://www.licenseinsight.kr";
const production = {
  APP_ENV: "production",
  DATA_MODE: "live",
  PUBLIC_SITE_URL: publicOrigin,
};

describe("environment boundaries", () => {
  it("defaults optional local settings without requiring API or DB credentials", () => {
    const env = parseEnvironment(local);
    expect(env).toMatchObject({
      appEnv: "local",
      dataMode: "live",
      adsEnabled: false,
      analyticsEnabled: false,
      previewProtected: false,
    });
    expect(env.siteUrl.origin).toBe("http://localhost:3000");
  });

  it.each(["local", "test"])("allows fixture only within an explicit %s environment", (appEnv) => {
    expect(parseEnvironment({ APP_ENV: appEnv, DATA_MODE: "fixture" }).dataMode).toBe("fixture");
  });

  it("allows production live configuration before API/DB integration exists", () => {
    expect(parseEnvironment(production).appEnv).toBe("production");
  });

  it("does not return a credential when an optional server key is present", () => {
    const env = parseEnvironment({ ...local, DATA_GO_KR_SERVICE_KEY: "SYNTHETIC_SERVER_VALUE" });
    expect(JSON.stringify(env)).not.toContain("SYNTHETIC_SERVER_VALUE");
    expect(env).not.toHaveProperty("DATA_GO_KR_SERVICE_KEY");
  });

  it.each([
    {},
    { APP_ENV: "local" },
    { DATA_MODE: "live" },
    { APP_ENV: "", DATA_MODE: "live" },
    { APP_ENV: "local", DATA_MODE: "" },
    { APP_ENV: "unknown", DATA_MODE: "live" },
    { APP_ENV: "local", DATA_MODE: "mock" },
  ])("fails closed for missing or unknown app/data modes %#", (input) => {
    expect(() => parseEnvironment(input)).toThrow(EnvironmentError);
  });

  it("rejects production fixture even when preview protection is declared", () => {
    expect(() => parseEnvironment({ ...production, DATA_MODE: "fixture", PREVIEW_PROTECTED: "true" }))
      .toThrow("DATA_MODE");
  });

  it.each([undefined, "false"])("rejects unprotected fixture preview (%s)", (previewProtected) => {
    expect(() => parseEnvironment({
      APP_ENV: "preview", DATA_MODE: "fixture", PUBLIC_SITE_URL: publicOrigin,
      PREVIEW_PROTECTED: previewProtected,
    })).toThrow("PREVIEW_PROTECTED");
  });

  it("requires a protection declaration for fixture preview without claiming authentication", () => {
    expect(parseEnvironment({
      APP_ENV: "preview", DATA_MODE: "fixture", PUBLIC_SITE_URL: publicOrigin,
      PREVIEW_PROTECTED: "true",
    })).toMatchObject({ appEnv: "preview", dataMode: "fixture", previewProtected: true });
  });

  it.each(["preview", "production"])("requires an explicit %s canonical origin", (appEnv) => {
    expect(() => parseEnvironment({ APP_ENV: appEnv, DATA_MODE: "live" })).toThrow("PUBLIC_SITE_URL");
    expect(() => parseEnvironment({ APP_ENV: appEnv, DATA_MODE: "live", PUBLIC_SITE_URL: "" }))
      .toThrow("PUBLIC_SITE_URL");
  });

  it.each([
    "not-a-url",
    "javascript:alert(1)",
    "http://www.licenseinsight.kr",
    "https://name:SYNTHETIC_PASSWORD@www.licenseinsight.kr",
    "https://@www.licenseinsight.kr",
    "https://www.licenseinsight.kr/qualifications",
    "https://www.licenseinsight.kr?mode=fixture",
    "https://www.licenseinsight.kr?",
    "https://www.licenseinsight.kr#fragment",
    "https://www.licenseinsight.kr#",
    " https://www.licenseinsight.kr",
    "https://www.licenseinsight.kr\n",
  ])("rejects malformed or non-origin production URLs %#", (url) => {
    expect(() => parseEnvironment({ ...production, PUBLIC_SITE_URL: url })).toThrow("PUBLIC_SITE_URL");
  });

  it.each([
    "https://localhost",
    "https://preview.localhost",
    "https://127.0.0.1",
    "https://2130706433",
    "https://[::1]",
    "https://service.internal",
    "https://service.invalid",
    "https://service.test",
    "https://service.example",
    "https://example.com",
    "https://service.example.org",
    "https://your-domain.kr",
    "https://service",
  ])("rejects local, reserved and placeholder production origins %#", (url) => {
    expect(() => parseEnvironment({ ...production, PUBLIC_SITE_URL: url })).toThrow("PUBLIC_SITE_URL");
  });

  it.each(["true", "TRUE", "1", "", "not-a-boolean"])("keeps ADS_ENABLED off (%s)", (value) => {
    expect(() => parseEnvironment({ ...local, ADS_ENABLED: value })).toThrow("ADS_ENABLED");
  });

  it.each(["true", "TRUE", "1", "", "not-a-boolean"])("keeps ANALYTICS_ENABLED off (%s)", (value) => {
    expect(() => parseEnvironment({ ...local, ANALYTICS_ENABLED: value })).toThrow("ANALYTICS_ENABLED");
  });

  it.each(["TRUE", "1", "", "not-a-boolean"])("requires an exact preview boolean (%s)", (value) => {
    expect(() => parseEnvironment({ ...local, PREVIEW_PROTECTED: value })).toThrow("PREVIEW_PROTECTED");
  });

  it("accepts explicit false optional booleans", () => {
    expect(parseEnvironment({
      ...local, ADS_ENABLED: "false", ANALYTICS_ENABLED: "false", PREVIEW_PROTECTED: "false",
    })).toMatchObject({ adsEnabled: false, analyticsEnabled: false, previewProtected: false });
  });

  it.each([
    "NEXT_PUBLIC_DATA_GO_KR_SERVICE_KEY",
    "NEXT_PUBLIC_SUPABASE_SECRET_KEY",
    "NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY",
    "NEXT_PUBLIC_CRON_SECRET",
    "NEXT_PUBLIC_DATABASE_URL",
    "NEXT_PUBLIC_API_KEY",
    "NEXT_PUBLIC_ACCESS_TOKEN",
    "NEXT_PUBLIC_PASSWORD",
  ])("rejects public secret names before any client bundle is built (%s)", (name) => {
    expect(() => parseEnvironment({ ...local, [name]: "SYNTHETIC_PRIVATE_VALUE" })).toThrow(name);
  });

  it("rejects a named public secret even if its value is empty or undefined", () => {
    expect(() => parseEnvironment({ ...local, NEXT_PUBLIC_SECRET_KEY: "" })).toThrow("NEXT_PUBLIC_SECRET_KEY");
    expect(() => parseEnvironment({ ...local, NEXT_PUBLIC_SECRET_KEY: undefined })).toThrow("NEXT_PUBLIC_SECRET_KEY");
  });

  it("allows unrelated runtime variables without adding them to the result", () => {
    const env = parseEnvironment({ ...local, PATH: "ignored", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "SYNTHETIC_PUBLIC_VALUE" });
    expect(env).not.toHaveProperty("PATH");
    expect(env).not.toHaveProperty("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  });

  it("reports only variable names when input contains credential-like values", () => {
    const values = ["SYNTHETIC_SECRET_MODE", "https://name:SYNTHETIC_URL_SECRET@www.licenseinsight.kr"];
    try {
      parseEnvironment({ ...local, APP_ENV: values[0], PUBLIC_SITE_URL: values[1] });
      throw new Error("Expected environment rejection");
    } catch (error) {
      expect(error).toBeInstanceOf(EnvironmentError);
      const failure = error as EnvironmentError;
      expect(failure.variables).toEqual(["APP_ENV", "PUBLIC_SITE_URL"]);
      expect(failure.message).toBe("Invalid environment: APP_ENV, PUBLIC_SITE_URL");
      for (const value of values) expect(failure.message).not.toContain(value);
      expect(failure.message).not.toContain("SYNTHETIC_URL_SECRET");
    }
  });
});
