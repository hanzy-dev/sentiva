export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "BAD_REQUEST"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";

export function jsonError(
  code: ApiErrorCode,
  message: string,
  status: number,
  extra?: Record<string, unknown>
) {
  return Response.json(
    {
      error: {
        code,
        message,
        ...(extra ? { extra } : {}),
      },
    },
    { status }
  );
}

// Batch 5: helpers to avoid string literal drift
export function rateLimitError(message = "Terlalu banyak permintaan.") {
  return jsonError("RATE_LIMITED", message, 429);
}

export function unauthorizedError(message = "Silakan login.") {
  return jsonError("UNAUTHORIZED", message, 401);
}