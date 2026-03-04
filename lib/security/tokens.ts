import crypto from "crypto";

export function normalizeFilename(name: string) {
  const cleaned = name
    .replace(/[^\w.\-() ]+/g, "_")
    .replace(/\s+/g, " ")
    .trim();

  // prevent empty
  return cleaned.length ? cleaned : "file";
}

export function generateObjectPath(ownerId: string, originalName: string) {
  const safe = normalizeFilename(originalName);
  const id = crypto.randomUUID();
  return `${ownerId}/${id}-${safe}`;
}

export function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export function generateShareToken() {
  // high entropy token for share links later
  return crypto.randomBytes(32).toString("base64url");
}