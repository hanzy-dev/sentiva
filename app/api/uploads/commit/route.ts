import { jsonError } from "@/lib/http/errors";
import { CORRELATION_ID_HEADER } from "@/lib/http/request-id";
import { logger } from "@/lib/logging/logger";
import { createRateLimiter } from "@/lib/security/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { uploadCommitSchema } from "@/lib/validation/schemas";

const limiter = createRateLimiter({
  prefix: "upload-commit",
  requests: 20,
  window: "60 s",
});

export async function POST(request: Request) {
  const correlationId = request.headers.get(CORRELATION_ID_HEADER) ?? null;

  const supabase = createSupabaseServerClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();

  if (userErr || !userData.user) {
    return jsonError("UNAUTHORIZED", "Silakan login terlebih dahulu.", 401);
  }

  if (limiter) {
    const { success } = await limiter.limit(userData.user.id);
    if (!success) {
      return jsonError("RATE_LIMITED", "Terlalu banyak permintaan.", 429);
    }
  }

  const body = await request.json().catch(() => null);
  const parsed = uploadCommitSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("BAD_REQUEST", "Payload tidak valid.", 400, {
      issues: parsed.error.issues,
    });
  }

  const { bucket, object_path, original_name, mime_type, size_bytes } = parsed.data;

  if (!object_path.startsWith(`${userData.user.id}/`)) {
    return jsonError("FORBIDDEN", "Akses ditolak.", 403);
  }

  const { data: listed, error: listErr } = await supabase.storage
    .from(bucket)
    .list(object_path.split("/").slice(0, -1).join("/"), {
      limit: 100,
      search: object_path.split("/").pop() ?? undefined,
    });

  if (listErr) {
    logger.error(
      { correlation_id: correlationId, err: listErr, bucket, object_path },
      "commit storage verify failed"
    );
    return jsonError("INTERNAL_ERROR", "Gagal memverifikasi file di storage.", 500);
  }

  const fileName = object_path.split("/").pop();
  const exists = (listed ?? []).some((x) => x.name === fileName);

  if (!exists) {
    return jsonError(
      "BAD_REQUEST",
      "File belum ditemukan di storage. Pastikan upload selesai sebelum commit.",
      400
    );
  }

  let fileId: string | null = null;

  const { data: inserted, error: insertErr } = await supabase
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
    logger.warn(
      { correlation_id: correlationId, err: insertErr, bucket, object_path },
      "commit insert failed; trying to fetch existing"
    );

    const { data: existing, error: fetchErr } = await supabase
      .from("files")
      .select("id")
      .eq("owner_id", userData.user.id)
      .eq("bucket", bucket)
      .eq("object_path", object_path)
      .maybeSingle();

    if (fetchErr || !existing?.id) {
      logger.error(
        { correlation_id: correlationId, err: fetchErr ?? insertErr },
        "commit insert+fetch failed"
      );
      return jsonError("INTERNAL_ERROR", "Gagal menyimpan metadata file.", 500);
    }

    fileId = existing.id;
  } else {
    fileId = inserted.id;
  }

  await supabase.from("audit_logs").insert({
    actor_id: userData.user.id,
    action: "UPLOAD",
    target_type: "FILE",
    target_id: fileId,
    request_id: correlationId,
    metadata_json: { object_path, bucket, mime_type, size_bytes },
  });

  logger.info(
    {
      correlation_id: correlationId,
      user_id: userData.user.id,
      file_id: fileId,
    },
    "upload commit"
  );

  return Response.json({ ok: true, file_id: fileId });
}