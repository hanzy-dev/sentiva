import type { NextResponse } from "next/server";

function getSupabaseOrigin(): string | null {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) return null;
  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
}

export function applySecurityHeaders(res: NextResponse) {
  const isDev = process.env.NODE_ENV !== "production";

  const supabaseOrigin = getSupabaseOrigin();

  const imgSrcAllow = [supabaseOrigin, "https://*.supabase.co"]
    .filter(Boolean)
    .join(" ");
  const frameSrcAllow = [supabaseOrigin, "https://*.supabase.co"]
    .filter(Boolean)
    .join(" ");

  /**
   * NOTE:
   * Next.js membutuhkan inline script untuk hydration/bootstrapping di production.
   * Jika production hanya "script-src 'self'", maka inline script diblokir
   * dan UI client bisa terlihat stuck (mis. skeleton tidak pernah selesai).
   */
  const scriptSrc = isDev
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
    : "script-src 'self' 'unsafe-inline'";

  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",

    // IMPORTANT for preview
    `img-src 'self' data: blob: ${imgSrcAllow}`,
    `frame-src 'self' blob: ${frameSrcAllow}`,

    "style-src 'self' 'unsafe-inline'",
    scriptSrc,

    // keep broad connect-src for API + supabase
    "connect-src 'self' https: ws: wss:",
  ].join("; ");

  res.headers.set("Content-Security-Policy", csp);
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "no-referrer");
  res.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );

  if (process.env.NODE_ENV === "production") {
    res.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }

  return res;
}