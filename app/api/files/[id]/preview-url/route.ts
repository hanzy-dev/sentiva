import { jsonError } from "@/lib/http/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createSupabaseServerClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();

  if (userErr || !userData.user) {
    return jsonError("UNAUTHORIZED", "Silakan login terlebih dahulu.", 401);
  }

  const fileId = params.id;

  // RLS ensures ownership
  const { data: file, error: fileErr } = await supabase
    .from("files")
    .select("id,bucket,object_path,mime_type,original_name,deleted_at")
    .eq("id", fileId)
    .is("deleted_at", null)
    .single();

  if (fileErr || !file) {
    return jsonError("NOT_FOUND", "File tidak ditemukan.", 404);
  }

  // IMPORTANT:
  // - download: false → Content-Disposition inline (preview-friendly)
  // - TTL pendek (60s)
  const { data: signed, error: signErr } = await supabase.storage
    .from(file.bucket)
    .createSignedUrl(file.object_path, 60, { download: false });

  if (signErr || !signed?.signedUrl) {
    return jsonError("INTERNAL_ERROR", "Gagal membuat preview URL.", 500);
  }

  return Response.json({
    ok: true,
    signed_url: signed.signedUrl,
    mime_type: file.mime_type,
    original_name: file.original_name,
    ttl_seconds: 60,
  });
}