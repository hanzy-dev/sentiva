import { jsonError } from "@/lib/http/errors";
import { logger } from "@/lib/logging/logger";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Pastikan route ini selalu dinamis (bergantung cookies/session)
export const dynamic = "force-dynamic";
// Hindari caching fetch default di runtime
export const revalidate = 0;

export async function GET() {
  try {
    const supabase = createSupabaseServerClient();
    const { data: userData, error: userErr } = await supabase.auth.getUser();

    if (userErr) {
      logger.error({ err: userErr }, "getUser failed");
      return jsonError("UNAUTHORIZED", "Silakan login.", 401);
    }

    if (!userData.user) {
      return jsonError("UNAUTHORIZED", "Silakan login.", 401);
    }

    const { data, error } = await supabase
      .from("files")
      .select("id, original_name, mime_type, size_bytes, created_at")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      logger.error({ err: error }, "list files failed");
      return jsonError("INTERNAL_ERROR", error.message, 500);
    }

    return Response.json(
      { files: data ?? [] },
      {
        headers: {
          "cache-control": "no-store, max-age=0",
        },
      }
    );
  } catch (err: unknown) {
    logger.error({ err }, "GET /api/files crashed");
    return jsonError("INTERNAL_ERROR", "Terjadi kesalahan pada server.", 500);
  }
}