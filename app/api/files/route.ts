import { jsonError } from "@/lib/http/errors";
import { logger } from "@/lib/logging/logger";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const supabase = createSupabaseServerClient();
    const { data: userData, error: userErr } = await supabase.auth.getUser();

    if (userErr || !userData.user) {
      return jsonError("UNAUTHORIZED", "Silakan login.", 401);
    }

    const url = new URL(request.url);
    const trash = url.searchParams.get("trash") === "1";

    let q = supabase
      .from("files")
      .select("id, original_name, mime_type, size_bytes, created_at, deleted_at")
      .order(trash ? "deleted_at" : "created_at", { ascending: false })
      .limit(50);

    // Active vs Trash
    q = trash ? q.not("deleted_at", "is", null) : q.is("deleted_at", null);

    const { data, error } = await q;

    if (error) {
      logger.error({ err: error, trash }, "list files failed");
      return jsonError("INTERNAL_ERROR", error.message, 500);
    }

    return Response.json(
      { files: data ?? [] },
      { headers: { "cache-control": "no-store, max-age=0" } }
    );
  } catch (err: unknown) {
    logger.error({ err }, "GET /api/files crashed");
    return jsonError("INTERNAL_ERROR", "Terjadi kesalahan pada server.", 500);
  }
}