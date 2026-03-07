import { jsonError } from "@/lib/http/errors";
import { CORRELATION_ID_HEADER } from "@/lib/http/request-id";
import { logger } from "@/lib/logging/logger";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createServerClient } from "@supabase/ssr";

function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  // Admin client: bypass RLS, used only server-side
  return createServerClient(url, serviceKey, {
    cookies: {
      getAll() {
        return [];
      },
      setAll() {
        // no-op
      },
    },
  });
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const correlationId = request.headers.get(CORRELATION_ID_HEADER) ?? null;

  // 1) normal client: verify user
  const supabase = createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return jsonError("UNAUTHORIZED", "Silakan login.", 401);
  }

  const fileId = params.id;

  // 2) get file row (RLS ensures it's theirs)
  const { data: file, error: fileErr } = await supabase
    .from("files")
    .select("id, bucket, object_path, original_name")
    .eq("id", fileId)
    .single();

  if (fileErr || !file) {
    return jsonError("NOT_FOUND", "File tidak ditemukan.", 404);
  }

  // 3) admin client: delete storage object + delete DB row
  try {
    const admin = createSupabaseAdminClient();

    // delete object from storage (best-effort, but should succeed with service role)
    const { error: rmErr } = await admin.storage.from(file.bucket).remove([file.object_path]);
    if (rmErr) {
      logger.error({ correlation_id: correlationId, err: rmErr }, "purge storage remove failed");
      return jsonError("INTERNAL_ERROR", "Gagal menghapus file dari storage.", 500);
    }

    // delete DB row
    const { error: delErr } = await admin.from("files").delete().eq("id", fileId);
    if (delErr) {
      logger.error({ correlation_id: correlationId, err: delErr }, "purge db delete failed");
      return jsonError("INTERNAL_ERROR", "Gagal menghapus metadata file.", 500);
    }

    // audit best-effort (pakai client normal supaya tetap sesuai pola kamu)
    await supabase.from("audit_logs").insert({
      actor_id: userData.user.id,
      action: "PURGE",
      target_type: "FILE",
      target_id: fileId,
      request_id: correlationId,
      metadata_json: { original_name: file.original_name },
    });

    return Response.json({ ok: true });
  } catch (err: unknown) {
    logger.error({ correlation_id: correlationId, err }, "purge crashed");
    return jsonError("INTERNAL_ERROR", "Terjadi kesalahan pada server.", 500);
  }
}