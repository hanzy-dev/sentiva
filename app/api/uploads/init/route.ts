import { jsonError } from "@/lib/http/errors";
import { CORRELATION_ID_HEADER } from "@/lib/http/request-id";
import { logger } from "@/lib/logging/logger";
import { generateObjectPath } from "@/lib/security/tokens";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { uploadInitSchema } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  const correlationId = request.headers.get(CORRELATION_ID_HEADER) ?? null;

  const supabase = createSupabaseServerClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();

  if (userErr || !userData.user) {
    return jsonError("UNAUTHORIZED", "Silakan login terlebih dahulu.", 401);
  }

  const body = await request.json().catch(() => null);
  const parsed = uploadInitSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError("BAD_REQUEST", "Payload tidak valid.", 400, {
      issues: parsed.error.issues,
    });
  }

  const { original_name, mime_type, size_bytes } = parsed.data;

  // allowlist mime - Diperluas untuk Dokumen, Gambar, Video, dan Audio
  const allowed = new Set([
    // Dokumen & Teks
    "application/pdf",
    "text/plain",
    "application/msword", // .doc
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
    "application/vnd.ms-excel", // .xls
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
    "application/vnd.ms-powerpoint", // .ppt
    "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx

    // Gambar
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/gif",
    "image/webp",
    "image/svg+xml",

    // Video
    "video/mp4",
    "video/mpeg",
    "video/quicktime", // .mov
    "video/x-msvideo", // .avi
    "video/webm",

    // Audio
    "audio/mpeg", // .mp3
    "audio/wav",
    "audio/ogg",
    "audio/webm",
  ]);

  if (!allowed.has(mime_type)) {
    return jsonError("BAD_REQUEST", `Tipe file (${mime_type}) tidak diizinkan.`, 400);
  }

  // generate object path scoped by owner
  const object_path = generateObjectPath(userData.user.id, original_name);

  logger.info(
    {
      correlation_id: correlationId,
      user_id: userData.user.id,
      object_path,
      mime_type,
      size_bytes,
    },
    "upload init"
  );

  return Response.json({
    bucket: "vault",
    object_path,
    original_name,
    mime_type,
    size_bytes,
  });
}