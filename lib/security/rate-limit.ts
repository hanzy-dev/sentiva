import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = url && token ? new Redis({ url, token }) : null;

export function getClientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() || "unknown";
  const xrip = request.headers.get("x-real-ip");
  if (xrip) return xrip.trim();
  return "unknown";
}

export function createRateLimiter(opts: {
  prefix: string;
  requests: number;
  window: "10 s" | "30 s" | "60 s" | "5 m" | "15 m";
}) {
  if (!redis) return null;

  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(opts.requests, opts.window),
    prefix: `sentiva:${opts.prefix}`,
  });
}