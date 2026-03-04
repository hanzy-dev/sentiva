import { jsonError } from "@/lib/http/errors";
import { CORRELATION_ID_HEADER } from "@/lib/http/request-id";
import { logger } from "@/lib/logging/logger";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const correlationId =
    typeof _request !== "undefined"
      ? _request.headers.get(CORRELATION_ID_HEADER) ?? null
      : null;

  const supabase = createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return jsonError("UNAUTHORIZED", "Silakan login.", 401);
  }

  const fileId = params.id;

  const { data: file, error: fileErr } = await supabase
    .from("files")
    .select("id, bucket, object_path")
    .eq("id", fileId)
    .is("deleted_at", null)
    .single();

  if (fileErr || !file) {
    return jsonError("NOT_FOUND", "File tidak ditemukan.", 404);
  }

  const { data: signed, error: signErr } = await supabase.storage
    .from(file.bucket)
    .createSignedUrl(file.object_path, 60); // 60 detik

  if (signErr || !signed?.signedUrl) {
    logger.error(
      { correlation_id: correlationId, err: signErr },
      "signed url failed"
    );
    return jsonError("INTERNAL_ERROR", "Gagal membuat signed URL.", 500);
  }

  // best-effort audit log
  await supabase.from("audit_logs").insert({
    actor_id: userData.user.id,
    action: "DOWNLOAD",
    target_type: "FILE",
    target_id: file.id,
    request_id: correlationId,
    metadata_json: { via: "signed_url" },
  });

  return Response.json({ url: signed.signedUrl });
}