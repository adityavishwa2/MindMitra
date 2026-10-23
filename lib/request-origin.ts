type OriginRequest = { url: string; headers: Pick<Headers, "get"> };

function loopback(hostname: string) {
  return ["localhost", "127.0.0.1", "[::1]"].includes(hostname);
}

/** Preserve canonical-origin CSRF checks; permit the actual local development address. */
export function validRequestOrigin(
  req: OriginRequest,
  authUrl = process.env.NEXTAUTH_URL,
) {
  const value = req.headers.get("origin");
  if (!value || value === "null") return false;
  try {
    const origin = new URL(value);
    if (
      !["http:", "https:"].includes(origin.protocol) ||
      value !== origin.origin
    )
      return false;
    const request = new URL(req.url);
    const canonical = new URL(authUrl || req.url);
    if (value === canonical.origin) return true;
    // Next can internally use 0.0.0.0 even when the browser uses localhost.
    // Host is the actual HTTP target. Never trust arbitrary forwarded headers.
    const target = new URL(
      `${request.protocol}//${req.headers.get("host") || request.host}`,
    );
    return (
      (!authUrl || loopback(canonical.hostname)) &&
      loopback(target.hostname) &&
      target.origin === value
    );
  } catch {
    return false;
  }
}

export const ORIGIN_ERROR =
  "Invalid request origin. Open the site using the address configured in NEXTAUTH_URL, then restart the app after changing .env.";
