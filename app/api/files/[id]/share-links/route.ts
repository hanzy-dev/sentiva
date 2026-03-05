import { jsonError } from "@/lib/http/errors";
import { CORRELATION_ID_HEADER } from "@/lib/http/request-id";
import { logger } from "@/lib/logging/logger";
import { createRateLimiter } from "@/lib/security/rate-limit";
import { generateShareToken, sha256 } from "@/lib/security/tokens";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { z } from "zod";

const createShareSchema = z.object({
  expires_in_minutes: z.number().int().positive().max(60 * 24 * 30).default(60 * 24),
  max_views: z.number().int().min(1).max(100).default(1),
});

const limiter = createRateLimiter({
  prefix: "share-create",
  requests: 10,
  window: "60 s",
});

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const correlationId = request.headers.get(CORRELATION_ID_HEADER) ?? null;

  const supabase = createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return jsonError("UNAUTHORIZED", "Silakan login.", 401);
  }

  if (limiter) {
    const { success } = await limiter.limit(userData.user.id);
    if (!success) {
      logger.warn(
        { correlation_id: correlationId, user_id: userData.user.id },
        "share create rate limited"
      );
      return jsonError("RATE_LIMITED", "Terlalu banyak permintaan.", 429);
    }
  }

  const body = await request.json().catch(() => ({}));
  const parsed = createShareSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("BAD_REQUEST", "Payload tidak valid.", 400, {
      issues: parsed.error.issues,
    });
  }

  const fileId = params.id;

  const { data: file, error: fileErr } = await supabase
    .from("files")
    .select("id")
    .eq("id", fileId)
    .is("deleted_at", null)
    .single();

  if (fileErr || !file) {
    return jsonError("NOT_FOUND", "File tidak ditemukan.", 404);
  }

  const token = generateShareToken();
  const token_hash = sha256(token);

  const expires_at = new Date(
    Date.now() + parsed.data.expires_in_minutes * 60_000
  ).toISOString();

  const { data: linkRow, error: insErr } = await supabase
    .from("share_links")
    .insert({
      file_id: fileId,
      token_hash,
      expires_at,
      max_views: parsed.data.max_views,
      views_used: 0,
    })
    .select("id, expires_at, max_views")
    .single();

  if (insErr || !linkRow) {
    logger.error({ correlation_id: correlationId, err: insErr }, "share create failed");
    return jsonError("INTERNAL_ERROR", "Gagal membuat tautan berbagi.", 500);
  }

  await supabase.from("audit_logs").insert({
    actor_id: userData.user.id,
    action: "SHARE_CREATE",
    target_type: "FILE",
    target_id: fileId,
    request_id: correlationId,
    metadata_json: { share_link_id: linkRow.id, max_views: linkRow.max_views, expires_at },
  });

  const origin = new URL(request.url).origin;
  const share_url = `${origin}/s/${token}`;

  return Response.json({
    ok: true,
    share_url,
    expires_at: linkRow.expires_at,
    max_views: linkRow.max_views,
    share_link_id: linkRow.id,
  });
}