import { sha256 } from "@/lib/security/tokens";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: { token: string } }
) {
  const token = params.token;
  if (!token || token.length < 20) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  const token_hash = sha256(token);
  const admin = createSupabaseAdminClient();

  // atomic consume
  const { data, error } = await admin.rpc("consume_share_link", {
    p_token_hash: token_hash,
  });

  if (error) {
    return NextResponse.json({ error: "Link tidak valid" }, { status: 410 });
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.bucket || !row?.object_path) {
    return NextResponse.json({ error: "Link sudah kedaluwarsa / habis dipakai" }, { status: 410 });
  }

  const { data: signed, error: signErr } = await admin.storage
    .from(row.bucket)
    .createSignedUrl(row.object_path, 60);

  if (signErr || !signed?.signedUrl) {
    return NextResponse.json({ error: "Gagal membuat URL unduhan" }, { status: 500 });
  }

  // redirect langsung ke signed url
  return NextResponse.redirect(signed.signedUrl, { status: 302 });
}