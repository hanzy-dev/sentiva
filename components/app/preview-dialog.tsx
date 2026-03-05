"use client";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import * as React from "react";

type PreviewState =
  | { open: false }
  | { open: true; fileId: string; title: string };

export function usePreviewDialog() {
  const [state, setState] = React.useState<PreviewState>({ open: false });

  return {
    state,
    open: (fileId: string, title: string) =>
      setState({ open: true, fileId, title }),
    close: () => setState({ open: false }),
  };
}

export function PreviewDialog({
  state,
  onClose,
}: {
  state: PreviewState;
  onClose: () => void;
}) {
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [signedUrl, setSignedUrl] = React.useState<string | null>(null);
  const [mimeType, setMimeType] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!state.open) return;

    let cancelled = false;
    setLoading(true);
    setErr(null);
    setSignedUrl(null);
    setMimeType(null);

    (async () => {
      try {
        const res = await fetch(`/api/files/${state.fileId}/preview-url`, {
          method: "POST",
          headers: { "content-type": "application/json" },
        });

        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(
            j?.error?.message ?? j?.error ?? "Gagal memuat preview."
          );
        }

        const j = await res.json();
        if (!cancelled) {
          setSignedUrl(j.signed_url);
          setMimeType(j.mime_type);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Gagal memuat preview.";
        if (!cancelled) setErr(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [state]);

  const isPdf = mimeType === "application/pdf";

  return (
    <Dialog open={state.open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Preview: {state.open ? state.title : ""}</DialogTitle>
          <DialogDescription className="sr-only">
            Pratinjau file menggunakan signed URL dengan TTL pendek.
          </DialogDescription>
        </DialogHeader>

        {loading && <div className="text-sm">Loading preview...</div>}

        {!loading && err && (
          <div className="space-y-3">
            <div className="text-sm text-red-500">{err}</div>
            <Button variant="secondary" onClick={onClose}>
              Tutup
            </Button>
          </div>
        )}

        {!loading && !err && signedUrl && mimeType && (
          <div className="space-y-3">
            {mimeType.startsWith("image/") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={signedUrl}
                alt="preview"
                referrerPolicy="no-referrer"
                className="max-h-[70vh] w-full rounded-md object-contain"
              />
            ) : isPdf ? (
              <>
                <p className="text-xs text-muted-foreground">
                  Catatan: beberapa browser (mis. Chrome) dapat memblok preview PDF
                  di iframe (kebijakan keamanan/CSP). Jika tidak tampil, gunakan{" "}
                  <b>Buka di tab baru</b>.
                </p>
                <iframe
                  src={signedUrl}
                  className="h-[70vh] w-full rounded-md border"
                  title="pdf-preview"
                  referrerPolicy="no-referrer"
                  sandbox="allow-same-origin allow-scripts allow-downloads allow-forms allow-popups"
                  allow="fullscreen"
                />
              </>
            ) : (
              <div className="text-sm">
                Preview untuk tipe <code>{mimeType}</code> belum didukung. Silakan
                download.
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={onClose}>
                Tutup
              </Button>
              <Button asChild>
                <a href={signedUrl} target="_blank" rel="noreferrer">
                  Buka di tab baru
                </a>
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}