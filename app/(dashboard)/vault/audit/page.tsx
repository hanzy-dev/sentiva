"use client";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import * as React from "react";
import { toast } from "sonner";

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
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function shortJson(v: unknown) {
  try {
    const s = JSON.stringify(v ?? {}, null, 0);
    // biar nggak “banjir”, potong kalau kepanjangan
    return s.length > 160 ? `${s.slice(0, 160)}…` : s;
  } catch {
    return "{}";
  }
}

const ACTION_OPTIONS = [
  { value: "", label: "Semua" },
  { value: "UPLOAD", label: "UPLOAD" },
  { value: "SHARE_CREATE", label: "SHARE_CREATE" },
  { value: "SHARE_REVOKE", label: "SHARE_REVOKE" },
  { value: "DELETE", label: "DELETE" },
  { value: "DOWNLOAD", label: "DOWNLOAD" },
  { value: "PREVIEW", label: "PREVIEW" },
];

export default function AuditPage({
  searchParams,
}: {
  searchParams: { cursor?: string; action?: string };
}) {
  const [items, setItems] = React.useState<AuditRow[]>([]);
  const [nextCursor, setNextCursor] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  const action = searchParams?.action ?? "";
  const cursor = searchParams?.cursor ?? "";

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      qs.set("limit", "50");
      if (cursor) qs.set("cursor", cursor);
      if (action) qs.set("action", action);

      const res = await fetch(`/api/audit-logs?${qs.toString()}`, { cache: "no-store" });
      const payload = await res.json().catch(() => null);

      if (!res.ok) {
        toast.error(payload?.error?.message ?? "Gagal memuat audit log");
        setItems([]);
        setNextCursor(null);
        return;
      }

      setItems(payload?.items ?? []);
      setNextCursor(payload?.next_cursor ?? null);
    } finally {
      setLoading(false);
    }
  }, [action, cursor]);

  React.useEffect(() => {
    load();
  }, [load]);

  async function copyRequestId(v: string | null) {
    if (!v) return;
    try {
      await navigator.clipboard.writeText(v);
      toast.success("Request ID disalin");
    } catch {
      toast.error("Gagal menyalin");
    }
  }

  function buildHref(next: string | null) {
    const qs = new URLSearchParams();
    if (next) qs.set("cursor", next);
    if (action) qs.set("action", action);
    return `/vault/audit${qs.toString() ? `?${qs.toString()}` : ""}`;
  }

  function onFilterChange(v: string) {
    const qs = new URLSearchParams();
    if (v) qs.set("action", v);
    // reset cursor ketika filter berubah
    window.location.href = `/vault/audit${qs.toString() ? `?${qs.toString()}` : ""}`;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-xl font-semibold">Audit Log</div>
          <div className="text-sm text-muted-foreground">
            Riwayat aktivitas (upload, share, delete, dll).
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Filter:</span>
            <select
              className="h-9 rounded-md border bg-background px-3 text-sm"
              value={action}
              onChange={(e) => onFilterChange(e.target.value)}
            >
              {ACTION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <Link href="/vault" className="text-sm underline">
            Kembali
          </Link>
        </div>
      </div>

      <div className="rounded-xl border bg-background">
        <div className="grid grid-cols-12 gap-3 px-4 py-3 text-xs text-muted-foreground">
          <div className="col-span-3">Waktu</div>
          <div className="col-span-2">Action</div>
          <div className="col-span-3">Target</div>
          <div className="col-span-3">Metadata</div>
          <div className="col-span-1 text-right">ID</div>
        </div>

        <Separator />

        {loading ? (
          <div className="px-6 py-10 text-sm text-muted-foreground">Memuat audit log…</div>
        ) : items.length === 0 ? (
          <div className="px-6 py-10 text-sm text-muted-foreground">
            Belum ada aktivitas untuk filter ini.
          </div>
        ) : (
          <div className="divide-y">
            {items.map((row) => (
              <div key={row.id} className="grid grid-cols-12 gap-3 px-4 py-3 text-sm">
                <div className="col-span-3 text-muted-foreground">{fmtTime(row.created_at)}</div>

                <div className="col-span-2 font-medium">{row.action}</div>

                <div className="col-span-3 text-muted-foreground">
                  {row.target_type}
                  {row.target_id ? <div className="text-xs truncate">{row.target_id}</div> : null}
                </div>

                <div className="col-span-3 text-xs text-muted-foreground whitespace-pre-wrap break-words">
                  {shortJson(row.metadata_json)}
                </div>

                <div className="col-span-1 flex justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 px-2"
                    onClick={() => copyRequestId(row.request_id)}
                    disabled={!row.request_id}
                    title={row.request_id ?? ""}
                  >
                    Copy
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {nextCursor ? (
        <div className="flex justify-end">
          <Link className="text-sm underline" href={buildHref(nextCursor)}>
            Next →
          </Link>
        </div>
      ) : null}
    </div>
  );
}