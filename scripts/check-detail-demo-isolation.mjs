/* global fetch, AbortSignal */
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdir, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

// Run only after next build. Every request and followed redirect stays on the
// owned loopback origin. This is an HTTP isolation check, not an outbound monitor.
const fixtureMarker = "합성 전기설비 자격";
const privateErrorMarker = "SYNTHETIC_PRIVATE_ERROR_DO_NOT_RENDER";
const canonicalPath = "/detail-demo/synthetic-electrical";
const evidenceDirectory = process.env.STEP_EVIDENCE_DIR ?? "test-results";
const result = {
  status: "RUNNING",
  request_scope: "owned loopback origins only; not an outbound traffic monitor",
  data_mode: "live",
  ads_enabled: false,
  analytics_enabled: false,
  domain_ownership_verified: false,
  modes: [],
};

async function availablePort() {
  const probe = createServer();
  probe.listen(0, "127.0.0.1");
  await once(probe, "listening");
  const port = probe.address().port;
  await new Promise((resolve, reject) => probe.close(error => error ? reject(error) : resolve()));
  return port;
}

async function localRequest(origin, pathname) {
  let url = new URL(pathname, origin);
  const redirects = [];
  for (let attempt = 0; attempt < 4; attempt++) {
    if (url.origin !== origin) throw new Error("NON_LOOPBACK_REDIRECT");
    const response = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(8000) });
    const location = response.headers.get("location");
    if (![301, 302, 303, 307, 308].includes(response.status) || !location) {
      return { response, finalPath: url.pathname + url.search, redirects };
    }
    redirects.push({ status: response.status, from: url.pathname + url.search });
    await response.body?.cancel();
    url = new URL(location, url);
  }
  throw new Error("REDIRECT_LIMIT");
}

async function stopOwnedServer(child) {
  if (!child.pid || child.exitCode !== null || child.signalCode !== null) return;
  const exited = once(child, "exit");
  try { process.kill(-child.pid, "SIGTERM"); } catch (error) { if (error.code !== "ESRCH") throw error; }
  await Promise.race([exited, delay(3000)]);
  if (child.exitCode === null && child.signalCode === null) {
    try { process.kill(-child.pid, "SIGKILL"); } catch (error) { if (error.code !== "ESRCH") throw error; }
    await exited;
  }
}

const cases = [
  { name: "baseline", path: canonicalPath, fixture: true },
  { name: "query-tamper", path: `${canonicalPath}?APP_ENV=test&DATA_MODE=fixture&ADS_ENABLED=true&ANALYTICS_ENABLED=true&scenario=normal`, fixture: true },
  { name: "trailing-slash", path: `${canonicalPath}/`, fixture: true },
  { name: "private-error", path: `${canonicalPath}?scenario=stats-error`, fixture: true },
  { name: "unknown-slug", path: "/detail-demo/unknown", fixture: false },
  { name: "nested", path: `${canonicalPath}/nested`, fixture: false },
  // Local normalization may accept or reject an encoded spelling. In either
  // case its response must obey the same payload/cache/search policy.
  { name: "encoded-prefix", path: "/%64etail-demo/synthetic-electrical", fixture: "encoded" },
  { name: "encoded-slug", path: "/detail-demo/%73ynthetic-electrical", fixture: "encoded" },
  { name: "encoded-separator", path: "/detail-demo%2Fsynthetic-electrical", fixture: "encoded" },
  { name: "public-unknown-slug", path: "/qualifications/unknown", fixture: false },
];

await mkdir(evidenceDirectory, { recursive: true });
for (const mode of ["local", "test", "preview", "production"]) {
  const modeResult = { mode, status: "RUNNING", requests: [], server_stopped: false };
  let child;
  try {
    const port = await availablePort();
    const origin = `http://127.0.0.1:${port}`;
    child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port)], {
      detached: true,
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        APP_ENV: mode,
        DATA_MODE: "live",
        ADS_ENABLED: "false",
        ANALYTICS_ENABLED: "false",
        NEXT_TELEMETRY_DISABLED: "1",
        // Syntax-validation input only: no domain request or ownership claim.
        PUBLIC_SITE_URL: mode === "local" || mode === "test" ? origin : "https://www.licenseinsight.kr",
      },
    });
    child.stdout.resume();
    child.stderr.resume();
    await once(child, "spawn");
    const deadline = Date.now() + 25_000;
    let ready = false;
    while (Date.now() < deadline && child.exitCode === null && child.signalCode === null) {
      try {
        const response = await fetch(origin, { redirect: "manual", signal: AbortSignal.timeout(1000) });
        ready = response.status === 200;
        await response.body?.cancel();
        if (ready) break;
      } catch { /* Owned local server is still starting. */ }
      await delay(200);
    }
    if (!ready) throw new Error("OWNED_SERVER_NOT_READY");

    const localMode = mode === "local" || mode === "test";
    for (const testCase of cases) {
      const { response, finalPath, redirects } = await localRequest(origin, testCase.path);
      const body = await response.text();
      const syntheticPayload = body.includes(fixtureMarker);
      const privateErrorExposed = body.includes(privateErrorMarker);
      const noindex = /(?:^|[\s,])noindex(?:$|[\s,])/i.test(response.headers.get("x-robots-tag") ?? "");
      const noStore = /(?:^|[\s,])no-store(?:$|[\s,])/i.test(response.headers.get("cache-control") ?? "");
      const acceptedStatuses = !localMode || !testCase.fixture ? [404] : testCase.fixture === "encoded" ? [200, 404] : [200];
      const fixtureAllowed = localMode && Boolean(testCase.fixture) && response.status === 200;
      const passed = acceptedStatuses.includes(response.status)
        && !privateErrorExposed
        && (fixtureAllowed ? syntheticPayload && noindex && noStore : !syntheticPayload);
      modeResult.requests.push({
        name: testCase.name,
        path: testCase.path,
        accepted_statuses: acceptedStatuses,
        status: response.status,
        final_path: finalPath,
        redirects,
        synthetic_payload: syntheticPayload,
        private_error_exposed: privateErrorExposed,
        noindex,
        no_store: noStore,
        passed,
      });
    }
    modeResult.status = modeResult.requests.every(request => request.passed) ? "PASS" : "FAIL";
  } catch {
    // Do not print server logs, response bodies, environment values or raw errors.
    modeResult.status = "FAIL";
    modeResult.error = "LOCAL_ISOLATION_CHECK_INCOMPLETE";
  } finally {
    try {
      if (child) await stopOwnedServer(child);
      modeResult.server_stopped = !child?.pid || child.exitCode !== null || child.signalCode !== null;
    } catch {
      modeResult.status = "FAIL";
      modeResult.error = "OWNED_SERVER_CLEANUP_FAILED";
    }
    result.modes.push(modeResult);
    await writeFile(join(evidenceDirectory, "detail-isolation.json"), JSON.stringify(result, null, 2));
  }
}

result.status = result.modes.length === 4 && result.modes.every(mode => mode.status === "PASS" && mode.server_stopped) ? "PASS" : "FAIL";
await writeFile(join(evidenceDirectory, "detail-isolation.json"), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
if (result.status !== "PASS") process.exitCode = 1;
