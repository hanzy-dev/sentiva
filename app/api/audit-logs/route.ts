import { jsonError } from "@/lib/http/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function clampInt(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

export async function GET(request: Request) {
  const supabase = createSupabaseServerClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();

  if (userErr || !userData.user) {
    return jsonError("UNAUTHORIZED", "Silakan login terlebih dahulu.", 401);
  }

  const url = new URL(request.url);

  const limit = clampInt(Number(url.searchParams.get("limit") ?? "50"), 1, 100);
  const cursor = url.searchParams.get("cursor"); // ISO timestamp string
  const action = url.searchParams.get("action"); // optional

  let q = supabase
    .from("audit_logs")
    .select("id,action,target_type,target_id,request_id,metadata_json,created_at")
    .order("created_at", { ascending: false })
    .limit(limit + 1); // fetch one extra to detect next page

  if (action) q = q.eq("action", action);

  // cursor pagination by created_at (strictly older)
  if (cursor) q = q.lt("created_at", cursor);

  const { data, error } = await q;

  if (error) {
    return jsonError("INTERNAL_ERROR", "Gagal memuat audit logs.", 500);
  }

  const rows = data ?? [];
  const hasNext = rows.length > limit;
  const items = hasNext ? rows.slice(0, limit) : rows;
  const nextCursor = hasNext ? items[items.length - 1]?.created_at ?? null : null;

  return Response.json({
    ok: true,
    items,
    next_cursor: nextCursor,
  });
}