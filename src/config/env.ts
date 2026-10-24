export type AppEnvironment = "local" | "test" | "preview" | "production";
export type DataMode = "live" | "fixture";

export type Environment = Readonly<{
  appEnv: AppEnvironment;
  dataMode: DataMode;
  siteUrl: URL;
  adsEnabled: false;
  analyticsEnabled: false;
  previewProtected: boolean;
}>;

type EnvironmentInput = Record<string, string | undefined>;

const APP_ENVIRONMENTS: ReadonlySet<string> = new Set([
  "local",
  "test",
  "preview",
  "production",
]);
const DATA_MODES: ReadonlySet<string> = new Set(["live", "fixture"]);
const PUBLIC_SECRET_NAME =
  /(?:SECRET|TOKEN|PASSWORD|API_?KEY|SERVICE_?KEY|SERVICE_?ROLE|CRON|DATABASE_?URL)/i;

/** Reports variable names only. Never attach input values or raw URL errors. */
export class EnvironmentError extends Error {
  readonly variables: readonly string[];

  constructor(variables: readonly string[]) {
    const names = [...new Set(variables)].sort();
    super(`Invalid environment: ${names.join(", ")}`);
    this.name = "EnvironmentError";
    this.variables = Object.freeze(names);
  }
}

function publicSecretVariables(input: EnvironmentInput): string[] {
  return Object.keys(input)
    .filter((name) => name.startsWith("NEXT_PUBLIC_") && PUBLIC_SECRET_NAME.test(name))
    .map((name) => (/^[A-Z][A-Z0-9_]*$/.test(name) ? name : "NEXT_PUBLIC_*"));
}

function strictBoolean(
  name: string,
  value: string | undefined,
  errors: string[],
): boolean {
  if (value === undefined || value === "false") return false;
  if (value === "true") return true;
  errors.push(name);
  return false;
}

function isPublicHostname(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (
    !host.includes(".") ||
    host.endsWith(".") ||
    host.startsWith("[") ||
    /^\d+(?:\.\d+){3}$/.test(host)
  ) {
    return false;
  }

  const reservedSuffixes = [
    "localhost",
    "localdomain",
    "local",
    "internal",
    "invalid",
    "test",
    "example",
    "onion",
    "example.com",
    "example.net",
    "example.org",
  ];
  if (reservedSuffixes.some((suffix) => host === suffix || host.endsWith(`.${suffix}`))) {
    return false;
  }

  const labels = host.split(".");
  if (
    labels.some(
      (label) =>
        !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label) ||
        label.length > 63 ||
        /^(?:example|placeholder|changeme|your-domain)$/.test(label),
    )
  ) {
    return false;
  }

  return /^[a-z]{2,63}$/.test(labels.at(-1) ?? "");
}

function parseSiteUrl(
  value: string | undefined,
  appEnv: AppEnvironment | undefined,
  errors: string[],
): URL | undefined {
  const external = appEnv === "preview" || appEnv === "production";
  const raw = value === undefined || value === ""
    ? (external ? undefined : "http://localhost:3000")
    : value;
  const hasWhitespaceOrControl = raw !== undefined && [...raw].some((character) => {
    const code = character.charCodeAt(0);
    return code <= 32 || code === 127;
  });
  if (raw === undefined || hasWhitespaceOrControl) {
    errors.push("PUBLIC_SITE_URL");
    return undefined;
  }

  try {
    const url = new URL(raw);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username !== "" ||
      url.password !== "" ||
      /^https?:\/\/[^/?#]*@/.test(raw) ||
      raw.includes("?") ||
      raw.includes("#") ||
      url.pathname !== "/" ||
      (external && (url.protocol !== "https:" || !isPublicHostname(url.hostname)))
    ) {
      errors.push("PUBLIC_SITE_URL");
      return undefined;
    }
    return url;
  } catch {
    errors.push("PUBLIC_SITE_URL");
    return undefined;
  }
}

/**
 * Pure configuration validation. The function does not load .env files, read
 * credentials, contact a service, or establish preview authentication/domain
 * ownership. PREVIEW_PROTECTED is a required deployment declaration for a
 * fixture preview; actual access protection must be verified before deployment.
 */
export function parseEnvironment(input: EnvironmentInput): Environment {
  const errors = publicSecretVariables(input);
  const rawAppEnv = input.APP_ENV;
  const rawDataMode = input.DATA_MODE;
  const appEnv = rawAppEnv !== undefined && APP_ENVIRONMENTS.has(rawAppEnv)
    ? (rawAppEnv as AppEnvironment)
    : undefined;
  const dataMode = rawDataMode !== undefined && DATA_MODES.has(rawDataMode)
    ? (rawDataMode as DataMode)
    : undefined;

  if (appEnv === undefined) errors.push("APP_ENV");
  if (dataMode === undefined) errors.push("DATA_MODE");

  const previewProtected = strictBoolean("PREVIEW_PROTECTED", input.PREVIEW_PROTECTED, errors);
  const adsEnabled = strictBoolean("ADS_ENABLED", input.ADS_ENABLED, errors);
  const analyticsEnabled = strictBoolean("ANALYTICS_ENABLED", input.ANALYTICS_ENABLED, errors);

  // STEP-03 has no approved real advertising or analytics integration.
  if (adsEnabled) errors.push("ADS_ENABLED");
  if (analyticsEnabled) errors.push("ANALYTICS_ENABLED");
  if (dataMode === "fixture" && appEnv === "production") errors.push("DATA_MODE");
  if (dataMode === "fixture" && appEnv === "preview" && !previewProtected) {
    errors.push("PREVIEW_PROTECTED");
  }

  const siteUrl = parseSiteUrl(input.PUBLIC_SITE_URL, appEnv, errors);
  if (errors.length > 0 || appEnv === undefined || dataMode === undefined || siteUrl === undefined) {
    throw new EnvironmentError(errors);
  }

  return Object.freeze({
    appEnv,
    dataMode,
    siteUrl,
    adsEnabled: false,
    analyticsEnabled: false,
    previewProtected,
  });
}
