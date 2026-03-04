import { jsonError } from "@/lib/http/errors";
import { logger } from "@/lib/logging/logger"; // Import logger ditambahkan
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
    // Menambahkan logging untuk mempermudah debugging jika query gagal
    logger.error({ err: error }, "list files failed"); 
    return jsonError("INTERNAL_ERROR", error.message, 500);
  }

  return Response.json({ files: data ?? [] });
}