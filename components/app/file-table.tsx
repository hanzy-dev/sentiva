"use client";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import * as React from "react";
import { toast } from "sonner";

type FileRow = {
  id: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

function getErrorMessage(err: unknown) {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "Terjadi kesalahan";
}

function humanFileType(mime: string) {
  const m = (mime || "").toLowerCase();
  if (m.includes("pdf")) return "PDF";
  if (m.includes("wordprocessingml")) return "DOCX";
  if (m.includes("msword")) return "DOC";
  if (m.includes("spreadsheetml")) return "XLSX";
  if (m.includes("presentationml")) return "PPTX";
  if (m.includes("png")) return "PNG";
  if (m.includes("jpeg") || m.includes("jpg")) return "JPG";
  if (m.includes("zip")) return "ZIP";
  if (m.includes("text/plain")) return "TXT";
  if (m.includes("application/octet-stream")) return "FILE";
  return "FILE";
}

function displayName(name: string) {
  // Heuristic: kalau nama diawali UUID + "-" (36 chars uuid)
  // contoh: 864f32d8-fa54-4df3-8f0f-496fe8f18a3f-Hello.docx
  const uuidPrefix = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/i;
  return name.replace(uuidPrefix, "");
}

function SkeletonRow() {
  return (
    <div className="grid grid-cols-12 items-center gap-3 px-4 py-3">
      <div className="col-span-6">
        <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
      </div>
      <div className="col-span-3 hidden sm:block">
        <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
      </div>
      <div className="col-span-1 text-right">
        <div className="ml-auto h-4 w-12 animate-pulse rounded bg-muted" />
      </div>
      <div className="col-span-2 flex justify-end gap-2">
        <div className="h-8 w-20 animate-pulse rounded bg-muted" />
        <div className="h-8 w-20 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

export function FileTable({
  refreshKey,
  onChanged,
  onRequestUpload,
}: {
  refreshKey: number;
  onChanged?: () => void;
  onRequestUpload?: () => void;
}) {
  const [files, setFiles] = React.useState<FileRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/files");
    const j = await res.json().catch(() => null);

    if (!res.ok) {
      toast.error(j?.error?.message ?? "Gagal memuat file");
      setFiles([]);
      setLoading(false);
      return;
    }

    setFiles(j.files ?? []);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    load();
  }, [refreshKey, load]);

  async function handleShare(id: string) {
    try {
      setBusyId(id);
      const res = await fetch(`/api/files/${id}/share-links`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ expires_in_minutes: 60 * 24, max_views: 1 }),
      });

      const j = await res.json().catch(() => null);
      if (!res.ok) throw new Error(j?.error?.message ?? "Gagal membuat tautan");

      await navigator.clipboard.writeText(j.share_url);
      toast.success("Tautan dibuat & disalin ke clipboard");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  async function handleDownload(id: string) {
    try {
      setBusyId(id);
      const res = await fetch(`/api/files/${id}/signed-download`, {
        method: "POST",
      });
      const j = await res.json().catch(() => null);
      if (!res.ok) throw new Error(j?.error?.message ?? "Gagal download");

      window.location.href = j.url;
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id: string) {
    // Batch 4 nanti ganti jadi shadcn dialog confirm.
    const ok = confirm("Hapus file ini? (soft delete)");
    if (!ok) return;

    try {
      setBusyId(id);
      const res = await fetch(`/api/files/${id}`, { method: "DELETE" });
      const j = await res.json().catch(() => null);
      if (!res.ok) throw new Error(j?.error?.message ?? "Gagal hapus file");

      toast.success("File dipindahkan ke sampah");
      await load();
      onChanged?.();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="rounded-xl border bg-background shadow-sm">
      <div className="grid grid-cols-12 gap-3 px-4 py-3 text-xs text-muted-foreground">
        <div className="col-span-6">Nama</div>
        <div className="col-span-3 hidden sm:block">Tipe</div>
        <div className="col-span-1 text-right">Ukuran</div>
        <div className="col-span-2 text-right">Aksi</div>
      </div>

      <Separator />

      {loading ? (
        <div className="divide-y">
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
      ) : files.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full border bg-background shadow-sm">
            <span className="text-lg">⬆️</span>
          </div>
          <div className="text-sm font-semibold">Belum ada file</div>
          <p className="mt-1 text-sm text-muted-foreground">
            Unggah file pertama kamu untuk mulai. Kamu bisa unduh aman dan buat
            tautan sekali pakai.
          </p>

          <div className="mt-4 flex justify-center">
            <Button onClick={onRequestUpload}>Unggah Sekarang</Button>
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            Upload menggunakan Direct-to-Storage untuk efisiensi biaya.
          </p>
        </div>
      ) : (
        <div className="divide-y">
          {files.map((f) => (
            <div
              key={f.id}
              className="grid grid-cols-12 items-center gap-3 px-4 py-3 text-sm"
            >
              <div className="col-span-6 truncate font-medium">
                {displayName(f.original_name)}
              </div>

              <div className="col-span-3 hidden sm:block truncate text-muted-foreground">
                {humanFileType(f.mime_type)}
              </div>

              <div className="col-span-1 text-right text-muted-foreground">
                {formatBytes(f.size_bytes)}
              </div>

              <div className="col-span-2 flex justify-end gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleShare(f.id)}
                  disabled={busyId === f.id}
                >
                  Bagikan
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDownload(f.id)}
                  disabled={busyId === f.id}
                >
                  Unduh
                </Button>

                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDelete(f.id)}
                  disabled={busyId === f.id}
                >
                  Hapus
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}