import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const result = [];
  for (const entry of entries) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await files(filename));
    else result.push(filename);
  }
  return result;
}

const secretNames = ["DATA_GO_KR_SERVICE_KEY", "SUPABASE_SECRET_KEY", "CRON_SECRET", "SYNTHETIC_SERVER_VALUE"];
const failures = [];
const sourceFiles = await files("src");
for (const filename of sourceFiles.filter((file) => /\.(?:ts|tsx)$/.test(file))) {
  const text = await readFile(filename, "utf8");
  if (/^[\s]*["']use client["']/m.test(text) && /(?:@\/server|(?:\.\.\/)+server|server-only|process\.env)/.test(text)) {
    failures.push({ file: filename, reason: "client imports server or environment" });
  }
}
const serverSource = await readFile("src/server/env.ts", "utf8");
if (!serverSource.includes('import "server-only"')) failures.push({ file: "src/server/env.ts", reason: "server-only guard missing" });
const bundleFiles = (await files(".next/static")).filter((file) => /\.(?:js|map)$/.test(file));
for (const filename of bundleFiles) {
  const text = await readFile(filename, "utf8");
  for (const name of secretNames) if (text.includes(name)) failures.push({ file: filename, reason: "server-only marker in client bundle", name });
}
if (bundleFiles.length === 0) failures.push({ reason: "no client bundle found" });
console.log(JSON.stringify({ status: failures.length ? "FAIL" : "PASS", sourceFiles: sourceFiles.length, clientBundleFiles: bundleFiles.length, failures }));
process.exitCode = failures.length ? 1 : 0;
