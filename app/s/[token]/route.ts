import { createRateLimiter, getClientIp } from "@/lib/security/rate-limit";
import { sha256 } from "@/lib/security/tokens";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import crypto from "crypto";
import { NextResponse } from "next/server";

const limiter = createRateLimiter({
  prefix: "share-consume",
  requests: 30,
  window: "60 s",
});

function notFound() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

function getOrCreateRequestId(request: Request): string {
  const header =
    request.headers.get("x-correlation-id") ||
    request.headers.get("x-request-id") ||
    "";
  const v = header.trim();
  if (v) return v;
  return crypto.randomUUID();
}

export async function GET(request: Request, { params }: { params: { token: string } }) {
  const token = params.token;
  if (!token || token.length < 20) return notFound();

  // Upstash rate limit (fallback no-op if env not set)
  if (limiter) {
    const ip = getClientIp(request);
    const { success } = await limiter.limit(ip);
    if (!success) {
      return NextResponse.json(
        { error: { code: "RATE_LIMITED", message: "Terlalu banyak permintaan." } },
        { status: 429 }
      );
    }
  }

  const requestId = getOrCreateRequestId(request);
  const token_hash = sha256(token);
  const admin = createSupabaseAdminClient();

  const { data, error } = await admin.rpc("consume_share_link", {
    p_token_hash: token_hash,
    p_request_id: requestId,
  });

  if (error) return notFound();

  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.bucket || !row?.object_path) return notFound();

  const { data: signed, error: signErr } = await admin.storage
    .from(row.bucket)
    .createSignedUrl(row.object_path, 60);

  if (signErr || !signed?.signedUrl) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  const res = NextResponse.redirect(signed.signedUrl, { status: 302 });
  res.headers.set("Cache-Control", "no-store");
  res.headers.set("x-request-id", requestId);
  return res;
}