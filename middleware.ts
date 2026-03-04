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

  // refresh session cookies
  const response = await updateSession(request);

  // attach correlation id
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
      return NextResponse.redirect(url);
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