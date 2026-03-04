export const CORRELATION_ID_HEADER = "x-correlation-id";

export function getOrCreateCorrelationId(value: string | null): string {
  if (value && value.trim().length >= 8) return value.trim();
  return crypto.randomUUID();
}

export function withCorrelationIdHeaders(headers: Headers, id: string) {
  headers.set(CORRELATION_ID_HEADER, id);
}