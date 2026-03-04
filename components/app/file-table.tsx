"use client";

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

export function FileTable({ refreshKey }: { refreshKey: number }) {
  const [files, setFiles] = React.useState<FileRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      const res = await fetch("/api/files");
      const j = await res.json().catch(() => null);
      if (!mounted) return;

      if (!res.ok) {
        toast.error(j?.error?.message ?? "Gagal memuat file");
        setFiles([]);
      } else {
        setFiles(j.files ?? []);
      }
      setLoading(false);
    }
    load();
    return () => {
      mounted = false;
    };
  }, [refreshKey]);

  if (loading) {
    return <div className="text-sm text-muted-foreground">Memuat...</div>;
  }

  return (
    <div className="rounded-lg border">
      <div className="grid grid-cols-12 gap-3 px-4 py-3 text-xs text-muted-foreground">
        <div className="col-span-6">Nama</div>
        <div className="col-span-3 hidden sm:block">Tipe</div>
        <div className="col-span-3 text-right">Ukuran</div>
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
            <div key={f.id} className="grid grid-cols-12 gap-3 px-4 py-3 text-sm">
              <div className="col-span-6 truncate">{f.original_name}</div>
              <div className="col-span-3 hidden sm:block text-muted-foreground truncate">
                {f.mime_type}
              </div>
              <div className="col-span-3 text-right text-muted-foreground">
                {formatBytes(f.size_bytes)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}