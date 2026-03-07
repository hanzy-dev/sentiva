import { expect, test } from "@playwright/test";
import { generateShareToken, getAdminClient, sha256Hex } from "./_supabase";

test("share link is one-time: first hit 302, second hit 404", async ({ request }) => {
  const admin = getAdminClient();

  const token = generateShareToken();
  const tokenHash = sha256Hex(token);

  const bucket = process.env.E2E_EXISTING_BUCKET;
  const object_path = process.env.E2E_EXISTING_OBJECT_PATH;
  const owner_id = process.env.E2E_OWNER_ID;

  if (!bucket || !object_path || !owner_id) {
    throw new Error(
      "Missing E2E env. Set E2E_EXISTING_BUCKET, E2E_EXISTING_OBJECT_PATH, E2E_OWNER_ID for stable share-link test."
    );
  }

  // 1) Ensure file row exists (idempotent).
  // Unique constraint: (owner_id, bucket, object_path)
  const { data: fileRow, error: fileErr } = await admin
    .from("files")
    .upsert(
      {
        bucket,
        object_path,
        owner_id,
        original_name: "e2e.txt",
        mime_type: "text/plain",
        size_bytes: 1,
      },
      { onConflict: "owner_id,bucket,object_path" }
    )
    .select("id")
    .single();

  if (fileErr) throw fileErr;

  // 2) Create a new one-time share link for that file.
  // Best-effort cleanup of prior links for this file so the table doesn't grow forever.
  await admin.from("share_links").delete().eq("file_id", fileRow.id);

  const expires_at = new Date(Date.now() + 10 * 60_000).toISOString();

  const { error: linkErr } = await admin.from("share_links").insert({
    file_id: fileRow.id,
    token_hash: tokenHash,
    expires_at,
    max_views: 1,
    views_used: 0,
  });

  if (linkErr) throw linkErr;

  // 3) First hit should 302
  const r1 = await request.get(`/s/${token}`, { maxRedirects: 0 });
  expect(r1.status()).toBe(302);

  // 4) Second hit should 404 (used)
  const r2 = await request.get(`/s/${token}`, { maxRedirects: 0 });
  expect(r2.status()).toBe(404);

  // cleanup best-effort: remove the created share link
  await admin.from("share_links").delete().eq("token_hash", tokenHash);
});