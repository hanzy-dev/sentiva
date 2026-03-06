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
import { toast } from "sonner";

export function ShareDialog({
  open,
  onOpenChange,
  shareUrl,
  expiresLabel = "berlaku 24 jam",
  usageLabel = "sekali pakai",
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  shareUrl: string | null;
  expiresLabel?: string;
  usageLabel?: string;
}) {
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tautan Berbagi</DialogTitle>
          <DialogDescription>
            Tautan ini {expiresLabel} • {usageLabel}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Input value={shareUrl ?? ""} readOnly />
          <p className="text-xs text-muted-foreground">
            Kirim tautan ini ke penerima. Setelah dipakai (atau kedaluwarsa), tautan tidak bisa
            digunakan lagi.
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} type="button">
            Tutup
          </Button>

          <Button variant="outline" onClick={openLink} disabled={!shareUrl} type="button">
            Buka Tautan
          </Button>

          <Button onClick={copy} disabled={!shareUrl} type="button">
            Salin Tautan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}