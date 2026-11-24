import "server-only";

/** CSRF: además de la cookie sameSite, toda escritura exige JSON y el mismo origen que la web. */
export function sameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    return Boolean(origin && host && new URL(origin).host === host) && (req.headers.get("content-type") ?? "").includes("application/json");
  } catch {
    return false;
  }
}
