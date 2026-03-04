import { jsonError } from "@/lib/http/errors";
import { CORRELATION_ID_HEADER } from "@/lib/http/request-id";
import { logger } from "@/lib/logging/logger";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { uploadCommitSchema } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  const correlationId = request.headers.get(CORRELATION_ID_HEADER) ?? null;

  const supabase = createSupabaseServerClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();

  if (userErr || !userData.user) {
    return jsonError("UNAUTHORIZED", "Silakan login terlebih dahulu.", 401);
  }

  const body = await request.json().catch(() => null);
  const parsed = uploadCommitSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("BAD_REQUEST", "Payload tidak valid.", 400, {
      issues: parsed.error.issues,
    });
  }

  const { bucket, object_path, original_name, mime_type, size_bytes } =
    parsed.data;

  // Ensure object_path belongs to user (basic guard)
  if (!object_path.startsWith(`${userData.user.id}/`)) {
    return jsonError("FORBIDDEN", "Akses ditolak.", 403);
  }

  // Insert metadata record
  const { data: fileRow, error: insertErr } = await supabase
    .from("files")
    .insert({
      owner_id: userData.user.id,
      bucket,
      object_path,
      original_name,
      mime_type,
      size_bytes,
    })
    .select("id")
    .single();

  if (insertErr) {
    logger.error(
      { correlation_id: correlationId, err: insertErr },
      "commit insert files failed"
    );
    return jsonError("INTERNAL_ERROR", "Gagal menyimpan metadata file.", 500);
  }

  // Audit log (best-effort)
  await supabase.from("audit_logs").insert({
    actor_id: userData.user.id,
    action: "UPLOAD",
    target_type: "FILE",
    target_id: fileRow.id,
    request_id: correlationId,
    metadata_json: { object_path, bucket, mime_type, size_bytes },
  });

  logger.info(
    {
      correlation_id: correlationId,
      user_id: userData.user.id,
      file_id: fileRow.id,
    },
    "upload commit"
  );

  return Response.json({ ok: true, file_id: fileRow.id });
}