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

  // allowlist mime (MVP)
  const allowed = new Set([
    "application/pdf",
    "image/png",
    "image/jpeg",
    "text/plain",
  ]);
  if (!allowed.has(mime_type)) {
    return jsonError("BAD_REQUEST", "Tipe file tidak diizinkan.", 400);
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