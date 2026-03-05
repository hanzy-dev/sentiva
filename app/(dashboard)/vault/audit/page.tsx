import Link from "next/link";

type AuditRow = {
  id: string;
  action: string;
  target_type: string;
  target_id: string | null;
  request_id: string | null;
  metadata_json: Record<string, unknown>;
  created_at: string;
};

function fmtTime(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return iso;
  }
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: { cursor?: string; action?: string };
}) {
  const qs = new URLSearchParams();
  qs.set("limit", "50");
  if (searchParams?.cursor) qs.set("cursor", searchParams.cursor);
  if (searchParams?.action) qs.set("action", searchParams.action);

  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? ""}/api/audit-logs?${qs.toString()}`, {
    // ensure always fresh
    cache: "no-store",
  });

  // If NEXT_PUBLIC_APP_URL not set locally, fallback to relative fetch in runtime
  // (When deployed on Vercel, NEXT_PUBLIC_APP_URL should exist as recommended)
  let payload: { ok: boolean; items: AuditRow[]; next_cursor: string | null } | null = null;
  if (res.ok) payload = await res.json();

  const items = payload?.items ?? [];
  const nextCursor = payload?.next_cursor ?? null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xl font-semibold">Audit Log</div>
          <div className="text-sm text-muted-foreground">
            Riwayat aktivitas (upload, share, delete, dll).
          </div>
        </div>
        <Link href="/vault" className="text-sm underline">
          Kembali ke Vault
        </Link>
      </div>

      <div className="rounded-xl border bg-background">
        <div className="grid grid-cols-12 gap-3 px-4 py-3 text-xs text-muted-foreground">
          <div className="col-span-3">Waktu</div>
          <div className="col-span-2">Action</div>
          <div className="col-span-3">Target</div>
          <div className="col-span-4">Metadata</div>
        </div>

        <div className="border-t" />

        {items.length === 0 ? (
          <div className="px-6 py-10 text-sm text-muted-foreground">
            Belum ada aktivitas.
          </div>
        ) : (
          <div className="divide-y">
            {items.map((row) => (
              <div key={row.id} className="grid grid-cols-12 gap-3 px-4 py-3 text-sm">
                <div className="col-span-3 text-muted-foreground">{fmtTime(row.created_at)}</div>
                <div className="col-span-2 font-medium">{row.action}</div>
                <div className="col-span-3 text-muted-foreground">
                  {row.target_type}
                  {row.target_id ? (
                    <div className="text-xs truncate">{row.target_id}</div>
                  ) : null}
                </div>
                <div className="col-span-4 text-xs text-muted-foreground whitespace-pre-wrap break-words">
                  {JSON.stringify(row.metadata_json ?? {}, null, 0)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {nextCursor ? (
        <div className="flex justify-end">
          <Link
            className="text-sm underline"
            href={`/vault/audit?cursor=${encodeURIComponent(nextCursor)}${searchParams?.action ? `&action=${encodeURIComponent(searchParams.action)}` : ""}`}
          >
            Next →
          </Link>
        </div>
      ) : null}
    </div>
  );
}