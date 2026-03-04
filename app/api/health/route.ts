import { CORRELATION_ID_HEADER } from "@/lib/http/request-id";
import { logger } from "@/lib/logging/logger";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function isAuthSessionMissing(err: unknown) {
  return (
    typeof err === "object" &&
    err !== null &&
    "name" in err &&
    (err as any).name === "AuthSessionMissingError"
  );
}

export async function GET(request: Request) {
  const correlationId = request.headers.get(CORRELATION_ID_HEADER) ?? null;

  try {
    const supabase = createSupabaseServerClient();

    // This may throw when there's no session; treat as "none" not "down"
    try {
      await supabase.auth.getUser();
    } catch (err) {
      if (isAuthSessionMissing(err)) {
        logger.info(
          { correlation_id: correlationId },
          "health auth session missing (expected for anonymous)"
        );
      } else {
        logger.warn({ correlation_id: correlationId, err }, "health auth failed");
        return Response.json(
          { ok: false, service: "sentiva", checks: { auth: "fail" } },
          { status: 503 }
        );
      }
    }

    // DB check: may be blocked by RLS when not authenticated → degraded (still ok)
    const { error: dbErr } = await supabase.from("files").select("id").limit(1);
    if (dbErr) {
      logger.info(
        { correlation_id: correlationId, err: dbErr },
        "health db degraded (likely RLS for anonymous)"
      );
      return Response.json(
        { ok: true, service: "sentiva", checks: { auth: "none", db: "degraded" } },
        { status: 200 }
      );
    }

    return Response.json(
      { ok: true, service: "sentiva", checks: { auth: "ok", db: "ok" } },
      { status: 200 }
    );
  } catch (err) {
    logger.error({ correlation_id: correlationId, err }, "health error");
    return Response.json({ ok: false, service: "sentiva" }, { status: 500 });
  }
}