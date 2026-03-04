import { jsonError } from "@/lib/http/errors";
import { CORRELATION_ID_HEADER } from "@/lib/http/request-id";
import { logger } from "@/lib/logging/logger";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const correlationId = request.headers.get(CORRELATION_ID_HEADER) ?? null;

  const supabase = createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return jsonError("UNAUTHORIZED", "Silakan login.", 401);
  }

  const id = params.id;

  const { data, error } = await supabase
    .from("share_links")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
    .is("revoked_at", null)
    .select("id, file_id")
    .single();

  if (error || !data) {
    logger.warn({ correlation_id: correlationId, err: error }, "share revoke failed");
    return jsonError("NOT_FOUND", "Tautan tidak ditemukan atau sudah di-revoke.", 404);
  }

  await supabase.from("audit_logs").insert({
    actor_id: userData.user.id,
    action: "SHARE_REVOKE",
    target_type: "FILE",
    target_id: data.file_id,
    request_id: correlationId,
    metadata_json: { share_link_id: data.id },
  });

  return Response.json({ ok: true });
}