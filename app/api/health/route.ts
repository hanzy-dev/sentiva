import { CORRELATION_ID_HEADER } from "@/lib/http/request-id";
import { logger } from "@/lib/logging/logger";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const correlationId = request.headers.get(CORRELATION_ID_HEADER) ?? null;

  try {
    const supabase = createSupabaseServerClient();

    // Ping auth (checks connectivity)
    const { error: userError } = await supabase.auth.getUser();
    if (userError) {
      logger.warn({ correlation_id: correlationId, err: userError }, "health auth failed");
      return Response.json(
        { ok: false, service: "sentiva", checks: { auth: "fail" } },
        { status: 503 }
      );
    }

    // Optional: lightweight DB ping (requires table access; use a simple select)
    const { error: dbError } = await supabase.from("files").select("id").limit(1);
    if (dbError) {
      logger.warn({ correlation_id: correlationId, err: dbError }, "health db failed");
      return Response.json(
        { ok: false, service: "sentiva", checks: { db: "fail" } },
        { status: 503 }
      );
    }

    return Response.json({ ok: true, service: "sentiva" });
  } catch (err) {
    logger.error({ correlation_id: correlationId, err }, "health error");
    return Response.json({ ok: false, service: "sentiva" }, { status: 500 });
  }
}