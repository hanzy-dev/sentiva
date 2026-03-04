import { jsonError } from "@/lib/http/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return jsonError("UNAUTHORIZED", "Silakan login.", 401);
  }

  const { data, error } = await supabase
    .from("files")
    .select("id, original_name, mime_type, size_bytes, created_at")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return jsonError("INTERNAL_ERROR", "Gagal mengambil data file.", 500);
  }

  return Response.json({ files: data ?? [] });
}