/* global fetch, AbortSignal */
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import { writeFile } from "node:fs/promises";

// Local sockets only. The external-looking origin is the existing env unit-test
// input, used for syntax validation; no DNS request or ownership assertion.
const result = { modes: [], request_scope: "loopback destinations only; not an outbound traffic monitor", domain_ownership_verified: false };
async function availablePort() {
  const probe = createServer();
  probe.listen(0, "127.0.0.1"); await once(probe, "listening");
  const port = probe.address().port;
  await new Promise(resolve => probe.close(resolve));
  return port;
}
for (const mode of ["local", "test", "preview", "production"]) {
  const port = await availablePort();
  const origin = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port)], {
    detached: true, stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, APP_ENV: mode, DATA_MODE: "live", ADS_ENABLED: "false", ANALYTICS_ENABLED: "false", NEXT_TELEMETRY_DISABLED: "1", PUBLIC_SITE_URL: mode === "local" || mode === "test" ? origin : "https://www.licenseinsight.kr" },
  });
  const modeResult = { mode, requests: [], server_stopped: false };
  try {
    child.stdout.resume(); child.stderr.resume();
    const deadline = Date.now() + 25_000;
    let ready = false;
    while (Date.now() < deadline && child.exitCode === null) {
      try { if ((await fetch(origin, { signal: AbortSignal.timeout(1000) })).status === 200) { ready = true; break; } } catch { /* Owned server starting. */ }
      await delay(200);
    }
    if (!ready) throw new Error(`Owned local ${mode} server not ready`);
    const paths = ["/ui-gallery", "/ui-gallery?mode=fixture&APP_ENV=test", "/ui-gallery/", "/ui-gallery/nested", "/foundation-check/error", ...(mode === "preview" || mode === "production" ? ["/%75i-gallery"] : [])];
    for (const pathname of paths) {
      const response = await fetch(origin + pathname, { signal: AbortSignal.timeout(8000) });
      const body = await response.text();
      const allowed = (mode === "local" || mode === "test") && !pathname.includes("nested") && !pathname.startsWith("/%75") && !pathname.startsWith("/foundation");
      const expected = pathname.startsWith("/foundation") ? mode === "test" ? 200 : 404 : allowed ? 200 : 404;
      const syntheticPayload = body.includes("공통 UI 검증실") || body.includes("합성 검증용 초고압");
      const record = { path: pathname, expected, status: response.status, synthetic_payload: syntheticPayload, noindex: response.headers.get("x-robots-tag")?.includes("noindex") ?? false };
      modeResult.requests.push(record);
      if (response.status !== expected || !allowed && syntheticPayload || allowed && !syntheticPayload) throw new Error(`Local gallery isolation failed: ${mode} ${pathname}`);
    }
  } finally {
    if (child.exitCode === null && child.signalCode === null) {
      process.kill(-child.pid, "SIGTERM");
      await Promise.race([once(child, "exit"), delay(3000)]);
      if (child.exitCode === null && child.signalCode === null) { process.kill(-child.pid, "SIGKILL"); await once(child, "exit"); }
    }
    modeResult.server_stopped = child.exitCode !== null || child.signalCode !== null;
    result.modes.push(modeResult);
    if (process.env.STEP_EVIDENCE_DIR) await writeFile(`${process.env.STEP_EVIDENCE_DIR}/gallery-isolation.json`, JSON.stringify(result, null, 2));
  }
}
console.log(JSON.stringify({ ...result, status: "PASS" }, null, 2));
