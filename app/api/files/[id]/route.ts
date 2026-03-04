import { jsonError } from "@/lib/http/errors";
import { CORRELATION_ID_HEADER } from "@/lib/http/request-id";
import { logger } from "@/lib/logging/logger";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const correlationId = request.headers.get(CORRELATION_ID_HEADER) ?? null;

  const supabase = createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return jsonError("UNAUTHORIZED", "Silakan login.", 401);
  }

  const fileId = params.id;

  const { error } = await supabase.rpc("soft_delete_file", {
    p_file_id: fileId,
  });

  if (error) {
    logger.warn(
      { correlation_id: correlationId, err: error },
      "soft_delete_file rpc failed"
    );
    return jsonError("NOT_FOUND", "File tidak ditemukan atau sudah dihapus.", 404);
  }

  // Audit sudah ditangani di RPC (transactional)
  return Response.json({ ok: true });
}