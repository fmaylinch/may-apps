import type { NextRequest } from "next/server";

// Proxy that pulls source code from an arbitrary URL on the server side, so the
// editor can import code from hosts that don't send permissive CORS headers.

// Block obvious internal / loopback targets to limit SSRF surface.
function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".localhost") || h === "0.0.0.0") return true;
  if (h === "::1" || h === "[::1]") return true;
  if (/^127\./.test(h)) return true;
  if (/^10\./.test(h)) return true;
  if (/^192\.168\./.test(h)) return true;
  if (/^169\.254\./.test(h)) return true; // link-local (incl. cloud metadata)
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return true;
  return false;
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
  if (isBlockedHost(url.hostname)) {
    return Response.json({ error: "That host is not allowed." }, { status: 403 });
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
