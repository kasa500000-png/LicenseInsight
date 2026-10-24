import { EnvironmentError, parseEnvironment } from "../src/config/env";

try {
  const env = parseEnvironment(process.env);
  console.log(JSON.stringify({
    status: "valid",
    appEnv: env.appEnv,
    dataMode: env.dataMode,
    adsEnabled: env.adsEnabled,
    analyticsEnabled: env.analyticsEnabled,
  }));
} catch (error) {
  console.error(error instanceof EnvironmentError ? error.message : "Environment validation failed");
  process.exitCode = 1;
}
