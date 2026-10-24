import { createRequire } from "node:module";
import path from "node:path";

// Reuse the compiler already pinned by tsx in pnpm-lock.yaml. Test tooling only.
const require = createRequire(path.resolve("package.json"));
const tsxRequire = createRequire(require.resolve("tsx/package.json"));
const { build, version } = tsxRequire("esbuild");

export async function domainBrowserBundle() {
  const result = await build({
    entryPoints: [path.resolve("tests/support/domain-browser-entry.ts")],
    bundle: true,
    write: false,
    platform: "browser",
    target: "es2022",
    format: "iife",
    globalName: "DomainVerification",
    logLevel: "silent",
  });
  return { code: result.outputFiles[0].text, compilerVersion: version };
}
