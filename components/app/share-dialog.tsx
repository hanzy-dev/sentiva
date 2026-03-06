"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import * as React from "react";
import { toast } from "sonner";

function formatDateTime(iso: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function ShareDialog({
  open,
  onOpenChange,
  shareUrl,
  shareLinkId,
  expiresAt,
  maxViews,
  onRevoked,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  shareUrl: string | null;

  shareLinkId: string | null;
  expiresAt: string | null;
  maxViews: number | null;
  onRevoked?: () => void;
}) {
  const [revoking, setRevoking] = React.useState(false);

  async function copy() {
    if (!shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Tautan disalin ke clipboard");
    } catch {
      toast.error("Gagal menyalin tautan");
    }
  }

  function openLink() {
    if (!shareUrl) return;
    window.open(shareUrl, "_blank", "noopener,noreferrer");
    toast.message("Membuka tautan…");
  }

  async function revoke() {
    if (!shareLinkId) return;
    setRevoking(true);

    const t = toast.loading("Mencabut tautan…");
    try {
      const res = await fetch(`/api/share-links/${shareLinkId}/revoke`, { method: "PATCH" });
      const j = await res.json().catch(() => null);
      if (!res.ok) throw new Error(j?.error?.message ?? "Gagal mencabut tautan");

      toast.success("Tautan berhasil dicabut");
      onOpenChange(false);
      onRevoked?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal mencabut tautan";
      toast.error(msg);
    } finally {
      toast.dismiss(t);
      setRevoking(false);
    }
  }

  const oneTime = (maxViews ?? 1) === 1;

  return (
    <Dialog open={open} onOpenChange={(v) => !revoking && onOpenChange(v)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tautan Berbagi</DialogTitle>
          <DialogDescription>
            {oneTime ? "Sekali pakai" : `${maxViews ?? "-"}x pakai`} • Kedaluwarsa:{" "}
            <span className="font-medium">{formatDateTime(expiresAt)}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Input value={shareUrl ?? ""} readOnly />

          <div className="rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground">
            <div className="flex items-center justify-between">
              <span>Max views</span>
              <span className="font-medium text-foreground">{maxViews ?? "-"}</span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span>Views used</span>
              <span className="font-medium text-foreground">0</span>
            </div>
            <div className="mt-2">
              Kirim tautan ini ke penerima. Setelah dipakai (atau kedaluwarsa), tautan tidak bisa
              digunakan lagi.
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={revoking}
            type="button"
          >
            Tutup
          </Button>

          <Button
            variant="outline"
            onClick={openLink}
            disabled={!shareUrl || revoking}
            type="button"
          >
            Buka
          </Button>

          <Button onClick={copy} disabled={!shareUrl || revoking} type="button">
            Salin
          </Button>

          <Button
            variant="destructive"
            onClick={revoke}
            disabled={!shareLinkId}
            loading={revoking}
            loadingText="Revoking…"
            type="button"
          >
            Revoke
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}