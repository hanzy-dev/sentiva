import { jsonError } from "@/lib/http/errors";
import { CORRELATION_ID_HEADER } from "@/lib/http/request-id";
import { logger } from "@/lib/logging/logger";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { renameFileSchema } from "@/lib/validation/schemas";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const correlationId = request.headers.get(CORRELATION_ID_HEADER) ?? null;

  const supabase = createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return jsonError("UNAUTHORIZED", "Silakan login.", 401);
  }

  const body = await request.json().catch(() => ({}));
  const parsed = renameFileSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("BAD_REQUEST", "Payload tidak valid.", 400, {
      issues: parsed.error.issues,
    });
  }

  const fileId = params.id;

  // RLS should enforce ownership
  const { data: updated, error } = await supabase
    .from("files")
    .update({ original_name: parsed.data.original_name })
    .eq("id", fileId)
    .is("deleted_at", null)
    .select("id, original_name")
    .single();

  if (error || !updated) {
    logger.warn({ correlation_id: correlationId, err: error }, "rename file failed");
    return jsonError("NOT_FOUND", "File tidak ditemukan atau sudah dihapus.", 404);
  }

  // best-effort audit
  await supabase.from("audit_logs").insert({
    actor_id: userData.user.id,
    action: "RENAME",
    target_type: "FILE",
    target_id: fileId,
    request_id: correlationId,
    metadata_json: { original_name: updated.original_name },
  });

  return Response.json({ ok: true, file: updated });
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const correlationId = request.headers.get(CORRELATION_ID_HEADER) ?? null;

  const supabase = createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return jsonError("UNAUTHORIZED", "Silakan login.", 401);
  }

  const fileId = params.id;

  const { error } = await supabase.rpc("soft_delete_file", {
    p_file_id: fileId,
  });

  if (error) {
    logger.warn({ correlation_id: correlationId, err: error }, "soft_delete_file rpc failed");
    return jsonError("NOT_FOUND", "File tidak ditemukan atau sudah dihapus.", 404);
  }

  // Audit sudah ditangani di RPC (transactional)
  return Response.json({ ok: true });
}