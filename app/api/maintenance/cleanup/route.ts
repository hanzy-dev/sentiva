import { logger } from "@/lib/logging/logger";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

function unauthorized() {
  return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
}

function clampInt(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

export async function POST(request: Request) {
  const secret = request.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return unauthorized();
  }

  const admin = createSupabaseAdminClient();

  const url = new URL(request.url);
  const days = clampInt(Number(url.searchParams.get("days") ?? "7"), 1, 90);
  const linksDays = clampInt(Number(url.searchParams.get("links_days") ?? "30"), 1, 365);

  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const linksCutoff = new Date(Date.now() - linksDays * 24 * 60 * 60 * 1000).toISOString();

  logger.info({ days, linksDays, cutoff, linksCutoff }, "cleanup start");

  // 1) Ambil file yang sudah deleted lama (untuk dihapus dari Storage)
  const { data: deletedFiles, error: qErr } = await admin
    .from("files")
    .select("id,bucket,object_path,deleted_at")
    .not("deleted_at", "is", null)
    .lt("deleted_at", cutoff)
    .limit(1000);

  if (qErr) {
    logger.error({ err: qErr }, "cleanup query files failed");
    return NextResponse.json({ ok: false, step: "query_files" }, { status: 500 });
  }

  let storageDeleted = 0;
  let dbDeleted = 0;

  // 2) Hapus object di storage per bucket (batch)
  const byBucket = new Map<string, string[]>();
  for (const f of deletedFiles ?? []) {
    const arr = byBucket.get(f.bucket) ?? [];
    arr.push(f.object_path);
    byBucket.set(f.bucket, arr);
  }

  for (const [bucket, paths] of byBucket.entries()) {
    const { error: rmErr } = await admin.storage.from(bucket).remove(paths);
    if (rmErr) {
      logger.error({ err: rmErr, bucket }, "cleanup storage remove failed");
      // best-effort: lanjut supaya gak stuck
    } else {
      storageDeleted += paths.length;
    }
  }

  // 3) Hard delete rows files yang sudah lewat cutoff (setelah object removed)
  if ((deletedFiles?.length ?? 0) > 0) {
    const ids = deletedFiles!.map((f) => f.id);
    const { error: delErr } = await admin.from("files").delete().in("id", ids);

    if (delErr) {
      logger.error({ err: delErr }, "cleanup db delete files failed");
      return NextResponse.json({ ok: false, step: "delete_files" }, { status: 500 });
    }

    dbDeleted = ids.length;
  }

  // 4) Cleanup share_links yang sudah revoked/expired lama
  const { error: slErr } = await admin
    .from("share_links")
    .delete()
    .or(`revoked_at.lt.${linksCutoff},expires_at.lt.${linksCutoff}`);

  if (slErr) {
    logger.error({ err: slErr }, "cleanup share_links failed");
    return NextResponse.json({ ok: false, step: "delete_share_links" }, { status: 500 });
  }

  logger.info(
    {
      storage_objects: storageDeleted,
      files_rows: dbDeleted,
      files_candidates: deletedFiles?.length ?? 0,
    },
    "cleanup done"
  );

  return NextResponse.json({
    ok: true,
    requested: { days, links_days: linksDays },
    cutoffs: { files_deleted_before: cutoff, links_before: linksCutoff },
    deleted: { storage_objects: storageDeleted, files_rows: dbDeleted },
  });
}