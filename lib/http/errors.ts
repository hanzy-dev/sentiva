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