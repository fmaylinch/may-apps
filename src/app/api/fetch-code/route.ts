import type { NextRequest } from "next/server";

// Proxy that pulls source code from a well-known host on the server side, so the
// editor can import code from sites that don't send permissive CORS headers.

// Allow only a handful of well-known code-hosting sites. An allowlist keeps this
// simple and sidesteps SSRF entirely: internal / loopback / metadata hosts can
// never match, so there's no blocklist to keep in sync with.
const ALLOWED_HOSTS = [
  "github.com",
  "raw.githubusercontent.com",
  "gist.github.com",
  "gist.githubusercontent.com",
  "gitlab.com",
  "bitbucket.org",
  "codeberg.org",
  "cdn.jsdelivr.net",
  "unpkg.com",
  "esm.sh",
];

// True when the hostname is an allowed host or a subdomain of one.
function isAllowedHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return ALLOWED_HOSTS.some((allowed) => h === allowed || h.endsWith(`.${allowed}`));
}

export async function GET(request: NextRequest) {
  const target = request.nextUrl.searchParams.get("url");
  if (!target) {
    return Response.json({ error: "Missing 'url' query parameter." }, { status: 400 });
  }

  let url: URL;
  try {
    url = new URL(target);
  } catch {
    return Response.json({ error: "Invalid URL." }, { status: 400 });
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return Response.json({ error: "Only http and https URLs are allowed." }, { status: 400 });
  }
  if (!isAllowedHost(url.hostname)) {
    return Response.json(
      {
        error: `Host "${url.hostname}" is not allowed. Allowed hosts: ${ALLOWED_HOSTS.join(", ")}.`,
      },
      { status: 403 },
    );
  }

  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(15_000),
      headers: { Accept: "text/plain, */*" },
    });
    if (!res.ok) {
      return Response.json(
        { error: `Upstream responded ${res.status} ${res.statusText}.` },
        { status: 502 },
      );
    }
    const code = await res.text();
    return Response.json({ code });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: `Failed to fetch: ${message}` }, { status: 502 });
  }
}
