import { jsonError } from "@/lib/http/errors";
import { CORRELATION_ID_HEADER } from "@/lib/http/request-id";
import { logger } from "@/lib/logging/logger";
import { createRateLimiter } from "@/lib/security/rate-limit";
import { generateObjectPath } from "@/lib/security/tokens";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { uploadInitSchema } from "@/lib/validation/schemas";

const DEFAULT_MAX_SIZE_BYTES = 200 * 1024 * 1024; // 200MB baseline portfolio-grade

const ALLOWED_MIME_TYPES = new Set<string>([
  // Documents
  "application/pdf",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",

  // Images
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/svg+xml",

  // Video
  "video/mp4",
  "video/mpeg",
  "video/quicktime",
  "video/x-msvideo",
  "video/webm",

  // Audio
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
  "audio/webm",
]);

const limiter = createRateLimiter({
  prefix: "upload-init",
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

  // Rate limit per user (enabled only when Upstash env is configured)
  if (limiter) {
    const { success } = await limiter.limit(userData.user.id);
    if (!success) {
      return jsonError("RATE_LIMITED", "Terlalu banyak permintaan.", 429);
    }
  }

  const body = await request.json().catch(() => null);
  const parsed = uploadInitSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError("BAD_REQUEST", "Payload tidak valid.", 400, {
      issues: parsed.error.issues,
    });
  }

  const { original_name, mime_type, size_bytes } = parsed.data;

  // Basic size guard (anti abuse)
  const maxSize = Number(process.env.MAX_UPLOAD_SIZE_BYTES ?? DEFAULT_MAX_SIZE_BYTES);
  if (!Number.isFinite(size_bytes) || size_bytes <= 0 || size_bytes > maxSize) {
    return jsonError(
      "BAD_REQUEST",
      `Ukuran file tidak valid atau melebihi batas (${maxSize} bytes).`,
      400
    );
  }

  // allowlist mime - baseline (portfolio)
  if (!ALLOWED_MIME_TYPES.has(mime_type)) {
    return jsonError("BAD_REQUEST", `Tipe file (${mime_type}) tidak diizinkan.`, 400);
  }

  // generate object path scoped by owner (must match storage RLS policy: <uid>/...)
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