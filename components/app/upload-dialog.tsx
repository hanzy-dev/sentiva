"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import * as React from "react";
import { toast } from "sonner";

type InitResponse = {
  bucket: string;
  object_path: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
};

export function UploadDialog({ onUploaded }: { onUploaded?: () => void }) {
  const [open, setOpen] = React.useState(false);
  const [file, setFile] = React.useState<File | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [progress, setProgress] = React.useState<number>(0);
  const abortRef = React.useRef<AbortController | null>(null);

  async function handleUpload() {
    if (!file) return;

    setIsUploading(true);
    setProgress(0);

    try {
      // 1) init
      const initRes = await fetch("/api/uploads/init", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          original_name: file.name,
          mime_type: file.type || "application/octet-stream",
          size_bytes: file.size,
        }),
      });

      if (!initRes.ok) {
        const j = await initRes.json().catch(() => null);
        throw new Error(j?.error?.message ?? "Gagal init upload");
      }

      const init: InitResponse = await initRes.json();

      // 2) direct upload to storage
      const supabase = createSupabaseBrowserClient();

      abortRef.current = new AbortController();

      // Supabase upload doesn't expose native progress.
      // For MVP: show "indeterminate" progress then set 100% on completion.
      setProgress(20);

      const { error: upErr } = await supabase.storage
        .from(init.bucket)
        .upload(init.object_path, file, {
          contentType: init.mime_type,
          upsert: false,
        });

      if (upErr) throw upErr;
      setProgress(80);

      // 3) commit
      const commitRes = await fetch("/api/uploads/commit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(init),
      });

      if (!commitRes.ok) {
        const j = await commitRes.json().catch(() => null);
        throw new Error(j?.error?.message ?? "Gagal commit metadata");
      }

      setProgress(100);
      toast.success("Upload berhasil");
      setFile(null);
      setOpen(false);
      onUploaded?.();
    } catch (err: any) {
      toast.error(err?.message ?? "Upload gagal");
    } finally {
      setIsUploading(false);
      abortRef.current = null;
    }
  }

  function handleCancel() {
    toast.message("Upload dibatalkan");
    setIsUploading(false);
    setProgress(0);
    setFile(null);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !isUploading && setOpen(v)}>
      <DialogTrigger asChild>
        <Button>Unggah File</Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Unggah File</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <input
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            disabled={isUploading}
          />

          {isUploading ? (
            <div className="space-y-2">
              <div className="h-2 w-full rounded bg-muted">
                <div
                  className="h-2 rounded bg-foreground transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{progress}%</span>
                <button className="underline" onClick={handleCancel} type="button">
                  Batalkan
                </button>
              </div>
            </div>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isUploading}>
              Tutup
            </Button>
            <Button onClick={handleUpload} disabled={!file || isUploading}>
              Upload
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}