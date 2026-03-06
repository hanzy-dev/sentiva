import { jsonError } from "@/lib/http/errors";
import { CORRELATION_ID_HEADER } from "@/lib/http/request-id";
import { logger } from "@/lib/logging/logger";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const correlationId = request.headers.get(CORRELATION_ID_HEADER) ?? null;

  const supabase = createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return jsonError("UNAUTHORIZED", "Silakan login.", 401);
  }

  const fileId = params.id;

  // Restore metadata only (storage cleanup tetap dikerjakan cron job untuk file yang benar-benar lama)
  const { data: restored, error } = await supabase
    .from("files")
    .update({ deleted_at: null })
    .eq("id", fileId)
    .select("id, original_name")
    .single();

  if (error || !restored) {
    logger.warn({ correlation_id: correlationId, err: error }, "restore file failed");
    return jsonError("NOT_FOUND", "File tidak ditemukan atau tidak bisa direstore.", 404);
  }

  await supabase.from("audit_logs").insert({
    actor_id: userData.user.id,
    action: "RESTORE",
    target_type: "FILE",
    target_id: fileId,
    request_id: correlationId,
    metadata_json: { original_name: restored.original_name },
  });

  return Response.json({ ok: true, file: restored });
}