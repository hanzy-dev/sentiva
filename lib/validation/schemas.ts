import { z } from "zod";

const DEFAULT_MAX_UPLOAD_SIZE_BYTES = 200 * 1024 * 1024; // 200MB baseline (keep in sync with /api/uploads/init)

export const uploadInitSchema = z.object({
  original_name: z.string().min(1).max(255),
  mime_type: z.string().min(1).max(200),
  size_bytes: z.number().int().nonnegative().max(DEFAULT_MAX_UPLOAD_SIZE_BYTES),
});

export const renameFileSchema = z.object({
  original_name: z.string().min(1).max(255),
});

export const uploadCommitSchema = z.object({
  bucket: z.string().min(1),
  object_path: z.string().min(1),
  original_name: z.string().min(1).max(255),
  mime_type: z.string().min(1).max(200),
  size_bytes: z.number().int().nonnegative(),
});