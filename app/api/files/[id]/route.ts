import { jsonError } from "@/lib/http/errors";
import { CORRELATION_ID_HEADER } from "@/lib/http/request-id";
import { logger } from "@/lib/logging/logger";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const correlationId = request.headers.get(CORRELATION_ID_HEADER) ?? null;

  const supabase = createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return jsonError("UNAUTHORIZED", "Silakan login.", 401);
  }

  const fileId = params.id;

  // soft delete
  const { data: updated, error } = await supabase
    .from("files")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", fileId)
    .is("deleted_at", null)
    .select("id")
    .single();

  if (error || !updated) {
    logger.error({ correlation_id: correlationId, err: error }, "delete failed");
    return jsonError("NOT_FOUND", "File tidak ditemukan atau sudah dihapus.", 404);
  }

  // best-effort audit
  await supabase.from("audit_logs").insert({
    actor_id: userData.user.id,
    action: "DELETE",
    target_type: "FILE",
    target_id: updated.id,
    request_id: correlationId,
    metadata_json: {},
  });

  return Response.json({ ok: true });
}