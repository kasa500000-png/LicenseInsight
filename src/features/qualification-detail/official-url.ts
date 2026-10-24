const OFFICIAL_HOSTS = new Set([
  "www.q-net.or.kr", "q-net.or.kr", "www.data.go.kr", "data.go.kr", "apis.data.go.kr",
  "www.hrdkorea.or.kr", "hrdkorea.or.kr",
]);
const sensitiveName = /service[_-]?key|api[_-]?key|token|secret|authorization|credential|password|access[_-]?key|^key$|^signature$/i;

/** Recheck injected repository DTOs as well as SQL-decoded data before rendering a link. */
export function isOfficialUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 4096 || value !== value.trim() || value.includes("\\") || value.includes("#")) return false;
  const authority = /^https:\/\/([^/?#]+)(?:[/?]|$)/i.exec(value)?.[1];
  if (!authority || !OFFICIAL_HOSTS.has(authority.toLowerCase())) return false;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || !OFFICIAL_HOSTS.has(url.hostname) || url.username || url.password || url.port || url.hash) return false;
    for (const original of url.searchParams.keys()) {
      let name = original;
      for (let attempt = 0; attempt < 3; attempt++) {
        if (sensitiveName.test(name)) return false;
        const decoded = decodeURIComponent(name);
        if (decoded === name) break;
        name = decoded;
      }
      if (name.includes("%") || sensitiveName.test(name)) return false;
    }
    return true;
  } catch { return false; }
}
