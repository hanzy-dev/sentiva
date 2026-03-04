import { z } from "zod";

export const uploadInitSchema = z.object({
  original_name: z.string().min(1).max(255),
  mime_type: z.string().min(1).max(200),
  size_bytes: z.number().int().nonnegative().max(25 * 1024 * 1024), // 25MB demo limit
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