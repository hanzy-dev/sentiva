import {
  CORRELATION_ID_HEADER,
  getOrCreateCorrelationId,
} from "@/lib/http/request-id";
import { logger } from "@/lib/logging/logger";
import { applySecurityHeaders } from "@/lib/security/headers";
import { updateSession } from "@/lib/supabase/middleware";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const start = Date.now();

  const incomingCid = request.headers.get(CORRELATION_ID_HEADER);
  const correlationId = getOrCreateCorrelationId(incomingCid);

  // Refresh session cookies (may set Set-Cookie on the returned response)
  const response = await updateSession(request);

  // Always attach correlation id to the response we will return
  response.headers.set(CORRELATION_ID_HEADER, correlationId);

  // protect /vault routes
  if (request.nextUrl.pathname.startsWith("/vault")) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            // Ensure any cookie refresh is propagated to the response
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    const { data } = await supabase.auth.getUser();

    if (!data.user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", request.nextUrl.pathname);

      // IMPORTANT: redirect response must also carry refreshed cookies + headers
      const redirectResponse = NextResponse.redirect(url);

      // copy refreshed cookies from `response` to `redirectResponse`
      for (const c of response.cookies.getAll()) {
        redirectResponse.cookies.set(c.name, c.value, c);
      }

      // copy correlation header
      redirectResponse.headers.set(CORRELATION_ID_HEADER, correlationId);

      // security headers
      applySecurityHeaders(redirectResponse);

      // latency log
      const ms = Date.now() - start;
      logger.info(
        {
          correlation_id: correlationId,
          method: request.method,
          path: request.nextUrl.pathname,
          status: redirectResponse.status,
          latency_ms: ms,
        },
        "request"
      );

      return redirectResponse;
    }
  }

  // security headers
  applySecurityHeaders(response);

  // latency log (avoid noisy static assets by filtering matcher below)
  const ms = Date.now() - start;
  logger.info(
    {
      correlation_id: correlationId,
      method: request.method,
      path: request.nextUrl.pathname,
      status: response.status,
      latency_ms: ms,
    },
    "request"
  );

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};