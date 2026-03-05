import { describe, expect, it, vi } from "vitest";

const getUserMock = vi.fn();
const listMock = vi.fn();

// Insert chain
const insertMock = vi.fn();
const insertSelectMock = vi.fn();
const insertSingleMock = vi.fn();

// Fetch chain
const selectMock = vi.fn();
const eqMock = vi.fn();
const maybeSingleMock = vi.fn();

vi.mock("@/lib/supabase/server", () => {
  return {
    createSupabaseServerClient: () => ({
      auth: { getUser: getUserMock },
      storage: {
        from: () => ({
          list: listMock,
        }),
      },
      from: (table: string) => {
        if (table === "files") {
          // We return an object that supports both flows:
          // 1) insert().select().single()
          // 2) select().eq().eq().eq().maybeSingle()
          return {
            insert: insertMock,
            select: selectMock,
            eq: eqMock,
            maybeSingle: maybeSingleMock,
          };
        }

        if (table === "audit_logs") {
          return {
            insert: vi.fn().mockResolvedValue({ data: null, error: null }),
          };
        }

        return {};
      },
    }),
  };
});

describe("POST /api/uploads/commit (idempotency)", () => {
  it("should return existing file_id when insert fails (duplicate) and fetch succeeds", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });

    // Make storage verify pass: object_path filename must exist in list result
    const objectPath = "user-1/123-abc.png";
    listMock.mockResolvedValue({
      data: [{ name: "123-abc.png" }],
      error: null,
    });

    // ---- Insert chain setup: insert().select().single()
    insertMock.mockReturnValue({ select: insertSelectMock });
    insertSelectMock.mockReturnValue({ single: insertSingleMock });

    // simulate insert failure (duplicate)
    insertSingleMock.mockResolvedValue({
      data: null,
      error: { message: "duplicate key value violates unique constraint" },
    });

    // ---- Fetch chain setup: select().eq().eq().eq().maybeSingle()
    // In Supabase JS, from("files").select(...) returns a builder that has eq()
    selectMock.mockReturnValue({ eq: eqMock });

    // eq is chainable; return itself with eq + maybeSingle
    eqMock.mockReturnValue({ eq: eqMock, maybeSingle: maybeSingleMock });

    maybeSingleMock.mockResolvedValue({
      data: { id: "file-existing" },
      error: null,
    });

    const { POST } = await import("@/app/api/uploads/commit/route");

    const payload = {
      bucket: "vault",
      object_path: objectPath,
      original_name: "abc.png",
      mime_type: "image/png",
      size_bytes: 123,
    };

    const req = new Request("https://sentiva.vercel.app/api/uploads/commit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.file_id).toBe("file-existing");
  });
});