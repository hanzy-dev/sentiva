import { beforeEach, describe, expect, it, vi } from "vitest";

const rpcMock = vi.fn();
const signedMock = vi.fn();

vi.mock("@/lib/supabase/admin", () => {
  return {
    createSupabaseAdminClient: () => ({
      rpc: rpcMock,
      storage: {
        from: () => ({
          createSignedUrl: signedMock,
        }),
      },
    }),
  };
});

type GlobalWithRateStore = typeof globalThis & {
  __sentivaRate?: Map<string, { count: number; resetAt: number }>;
};

type ConsumeShareLinkParams = {
  p_token_hash: string;
  p_request_id: string;
};

type RpcConsumeRow = {
  bucket: string;
  object_path: string;
};

describe("GET /s/:token (share consume)", () => {
  beforeEach(() => {
    rpcMock.mockReset();
    signedMock.mockReset();
    delete (globalThis as GlobalWithRateStore).__sentivaRate;
  });

  it("should pass p_request_id to RPC, redirect on first consume, and return 404 on second consume", async () => {
    // 1st call: RPC returns bucket + object_path
    rpcMock.mockResolvedValueOnce({
      data: [{ bucket: "vault", object_path: "user/file.png" } satisfies RpcConsumeRow],
      error: null,
    });

    signedMock.mockResolvedValueOnce({
      data: { signedUrl: "https://example.com/signed" },
      error: null,
    });

    const { GET } = await import("@/app/s/[token]/route");

    const token = "token12345678901234567890";
    const req1 = new Request(`https://sentiva.vercel.app/s/${token}`, {
      headers: { "x-forwarded-for": "1.2.3.4" },
    });

    const res1 = await GET(req1, { params: { token } });

    expect(res1.status).toBe(302);
    expect(res1.headers.get("location")).toBe("https://example.com/signed");

    // Assert RPC called with p_request_id
    expect(rpcMock).toHaveBeenCalledTimes(1);

    const [fnName, payload] = rpcMock.mock.calls[0] as [
      string,
      ConsumeShareLinkParams,
      ...unknown[],
    ];

    expect(fnName).toBe("consume_share_link");
    expect(payload).toEqual(
      expect.objectContaining({
        p_token_hash: expect.any(String),
        p_request_id: expect.any(String),
      })
    );

    // basic sanity: token hash should look like sha256 hex
    expect(payload.p_token_hash).toMatch(/^[a-f0-9]{64}$/i);
    // request id should be non-empty
    expect(payload.p_request_id.length).toBeGreaterThan(0);

    // Response should surface request id too
    expect(res1.headers.get("x-request-id")).toBe(payload.p_request_id);

    // 2nd call: RPC returns no row (token already used/expired)
    rpcMock.mockResolvedValueOnce({
      data: [] as RpcConsumeRow[],
      error: null,
    });

    const req2 = new Request(`https://sentiva.vercel.app/s/${token}`, {
      headers: { "x-forwarded-for": "1.2.3.4" },
    });

    const res2 = await GET(req2, { params: { token } });
    expect(res2.status).toBe(404);
  });

  it("should rate limit repeated requests when limiter is enabled", async () => {
    const { GET } = await import("@/app/s/[token]/route");

    rpcMock.mockResolvedValue({ data: [] as RpcConsumeRow[], error: null });

    const ip = "9.9.9.9";
    const token = "token12345678901234567890";

    // Try many requests; if limiter is enabled we should eventually see 429.
    let saw429 = false;

    for (let i = 0; i < 60; i++) {
      const req = new Request(`https://sentiva.vercel.app/s/${token}`, {
        headers: { "x-forwarded-for": ip },
      });

      const res = await GET(req, { params: { token } });

      if (res.status === 429) {
        saw429 = true;
        break;
      }
    }

    // If Upstash env is not configured, limiter is disabled and we won't see 429.
    // In that case, don't fail the test (portfolio-friendly + CI-stable).
    const upstashConfigured =
      !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!upstashConfigured) {
      expect(saw429).toBe(false);
      return;
    }

    expect(saw429).toBe(true);
  });
});