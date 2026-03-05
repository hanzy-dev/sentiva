"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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

function getErrorMessage(err: unknown) {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "Terjadi kesalahan";
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

function guessMimeType(file: File): string {
  const name = (file.name || "").toLowerCase();

  if (name.endsWith(".pdf")) return "application/pdf";
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  if (name.endsWith(".webp")) return "image/webp";
  if (name.endsWith(".gif")) return "image/gif";
  if (name.endsWith(".svg")) return "image/svg+xml";

  if (name.endsWith(".txt")) return "text/plain";

  if (name.endsWith(".mp4")) return "video/mp4";
  if (name.endsWith(".webm")) return "video/webm";
  if (name.endsWith(".mov")) return "video/quicktime";
  if (name.endsWith(".avi")) return "video/x-msvideo";

  if (name.endsWith(".mp3")) return "audio/mpeg";
  if (name.endsWith(".wav")) return "audio/wav";
  if (name.endsWith(".ogg")) return "audio/ogg";

  if (name.endsWith(".doc")) return "application/msword";
  if (name.endsWith(".docx"))
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (name.endsWith(".xls")) return "application/vnd.ms-excel";
  if (name.endsWith(".xlsx"))
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  if (name.endsWith(".ppt")) return "application/vnd.ms-powerpoint";
  if (name.endsWith(".pptx"))
    return "application/vnd.openxmlformats-officedocument.presentationml.presentation";

  return "application/octet-stream";
}

export function UploadDialog({
  onUploaded,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: {
  onUploaded?: () => void;
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = controlledOnOpenChange ?? setUncontrolledOpen;

  const [file, setFile] = React.useState<File | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [progress, setProgress] = React.useState<number>(0);

  const inputRef = React.useRef<HTMLInputElement | null>(null);

  function reset() {
    setProgress(0);
    setFile(null);
  }

  function onPickFile() {
    inputRef.current?.click();
  }

  function onFileSelected(f: File | null) {
    if (!f) return;
    setFile(f);
  }

  function onDrop(e: React.DragEvent<HTMLButtonElement>) {
    e.preventDefault();
    if (isUploading) return;
    const f = e.dataTransfer.files?.[0] ?? null;
    onFileSelected(f);
  }

  async function handleUpload() {
    if (!file) return;

    setIsUploading(true);
    setProgress(0);

    try {
      const mime_type = file.type || guessMimeType(file);

      const initRes = await fetch("/api/uploads/init", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          original_name: file.name,
          mime_type,
          size_bytes: file.size,
        }),
      });

      if (!initRes.ok) {
        const j = await initRes.json().catch(() => null);
        throw new Error(j?.error?.message ?? "Gagal init upload");
      }

      const init: InitResponse = await initRes.json();

      const supabase = createSupabaseBrowserClient();

      setProgress(20);

      const { error: upErr } = await supabase.storage
        .from(init.bucket)
        .upload(init.object_path, file, {
          contentType: init.mime_type || mime_type,
          upsert: false,
          cacheControl: "3600",
        });

      if (upErr) throw upErr;
      setProgress(80);

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

      reset();
      setOpen(false);
      onUploaded?.();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) ?? "Upload gagal");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (isUploading) return;
        setOpen(v);
        if (!v) reset();
      }}
    >
      {controlledOpen === undefined ? (
        <DialogTrigger asChild>
          <Button>Unggah File</Button>
        </DialogTrigger>
      ) : null}

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Unggah File</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            onChange={(e) => onFileSelected(e.target.files?.[0] ?? null)}
            disabled={isUploading}
          />

          <button
            type="button"
            onClick={onPickFile}
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
            disabled={isUploading}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-background px-4 py-8 text-left transition hover:bg-muted/40 disabled:opacity-60"
          >
            <div className="text-2xl">📁</div>
            <div className="text-sm font-semibold">
              Klik untuk memilih file{" "}
              <span className="font-normal text-muted-foreground">
                atau seret file ke sini
              </span>
            </div>

            {file ? (
              <div className="mt-1 text-xs text-muted-foreground">
                Dipilih: <span className="font-medium">{file.name}</span> •{" "}
                {formatBytes(file.size)}
              </div>
            ) : (
              <div className="mt-1 text-xs text-muted-foreground">
                Maksimal sesuai limit storage project kamu.
              </div>
            )}
          </button>

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
                <span>Sedang mengunggah…</span>
              </div>
            </div>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isUploading}
              type="button"
            >
              Tutup
            </Button>

            <Button onClick={handleUpload} disabled={!file || isUploading} type="button">
              Upload
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}