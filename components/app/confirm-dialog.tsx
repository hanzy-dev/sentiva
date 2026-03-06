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

export function ConfirmDialog({
  open,
  title,
  description,
  confirmText = "Konfirmasi",
  cancelText = "Batal",
  destructive,
  onOpenChange,
  onConfirm,
  loading,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  loading?: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => (!loading ? onOpenChange(v) : undefined)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            type="button"
          >
            {cancelText}
          </Button>

          <Button
            variant={destructive ? "destructive" : "default"}
            onClick={onConfirm}
            loading={!!loading}
            loadingText="Memproses…"
            type="button"
          >
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}