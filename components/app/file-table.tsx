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

export function FileTable({
  refreshKey,
  onChanged,
}: {
  refreshKey: number;
  onChanged?: () => void;
}) {
  const [files, setFiles] = React.useState<FileRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  async function load() {
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
  }

  React.useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  async function handleDownload(id: string) {
    try {
      setBusyId(id);
      const res = await fetch(`/api/files/${id}/signed-download`, {
        method: "POST",
      });
      const j = await res.json().catch(() => null);
      if (!res.ok) throw new Error(j?.error?.message ?? "Gagal download");

      // redirect to signed url
      window.location.href = j.url;
    } catch (err: any) {
      toast.error(err?.message ?? "Gagal download");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id: string) {
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
    } catch (err: any) {
      toast.error(err?.message ?? "Gagal hapus file");
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">Memuat...</div>;
  }

  return (
    <div className="rounded-lg border">
      <div className="grid grid-cols-12 gap-3 px-4 py-3 text-xs text-muted-foreground">
        <div className="col-span-6">Nama</div>
        <div className="col-span-3 hidden sm:block">Tipe</div>
        <div className="col-span-2 text-right">Ukuran</div>
        <div className="col-span-1 text-right">Aksi</div>
      </div>

      <Separator />

      {files.length === 0 ? (
        <div className="px-6 py-10 text-center">
          <div className="text-sm font-medium">Belum ada file</div>
          <p className="mt-1 text-sm text-muted-foreground">
            Unggah file pertama kamu untuk mulai.
          </p>
        </div>
      ) : (
        <div className="divide-y">
          {files.map((f) => (
            <div
              key={f.id}
              className="grid grid-cols-12 items-center gap-3 px-4 py-3 text-sm"
            >
              <div className="col-span-6 truncate">{f.original_name}</div>

              <div className="col-span-3 hidden sm:block truncate text-muted-foreground">
                {f.mime_type}
              </div>

              <div className="col-span-2 text-right text-muted-foreground">
                {formatBytes(f.size_bytes)}
              </div>

              <div className="col-span-1 flex justify-end gap-2">
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