"use client";

import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { PreviewDialog, usePreviewDialog } from "@/components/app/preview-dialog";
import { ShareDialog } from "@/components/app/share-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Download, Eye, MoreHorizontal, Share2, Trash2 } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

type FileRow = {
  id: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  created_at: string; // ISO string
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
  const uuidPrefix =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/i;
  return name.replace(uuidPrefix, "");
}

function formatUploadedAt(iso: string) {
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

function sortNewestFirst(rows: FileRow[]) {
  return [...rows].sort((a, b) => {
    const ta = Date.parse(a.created_at);
    const tb = Date.parse(b.created_at);
    const na = Number.isNaN(ta) ? 0 : ta;
    const nb = Number.isNaN(tb) ? 0 : tb;
    return nb - na;
  });
}

function SkeletonRow() {
  return (
    <div className="grid grid-cols-12 items-center gap-3 px-4 py-3">
      <div className="col-span-5">
        <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
      </div>

      <div className="col-span-2 hidden lg:block">
        <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
      </div>

      <div className="col-span-3 hidden sm:block">
        <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
      </div>

      <div className="col-span-1 text-right">
        <div className="ml-auto h-4 w-12 animate-pulse rounded bg-muted" />
      </div>

      <div className="col-span-1 flex justify-end">
        <div className="h-8 w-10 animate-pulse rounded bg-muted" />
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

  const [shareOpen, setShareOpen] = React.useState(false);
  const [shareUrl, setShareUrl] = React.useState<string | null>(null);
  const [shareLinkId, setShareLinkId] = React.useState<string | null>(null);
  const [shareExpiresAt, setShareExpiresAt] = React.useState<string | null>(null);
  const [shareMaxViews, setShareMaxViews] = React.useState<number | null>(null);

  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [pendingDelete, setPendingDelete] = React.useState<{ id: string; name: string } | null>(
    null
  );

  const preview = usePreviewDialog();

  function showLoading(message: string) {
    return toast.loading(message);
  }

  function closeToast(id: string | number) {
    toast.dismiss(id);
  }

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

    const rows: FileRow[] = Array.isArray(j?.files) ? j.files : [];
    setFiles(sortNewestFirst(rows));
    setLoading(false);
  }, []);

  React.useEffect(() => {
    load();
  }, [refreshKey, load]);

  async function handleShare(id: string) {
    const t = showLoading("Membuat tautan…");

    try {
      setBusyId(id);

      const res = await fetch(`/api/files/${id}/share-links`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ expires_in_minutes: 60 * 24, max_views: 1 }),
      });

      const j = await res.json().catch(() => null);
      if (!res.ok) throw new Error(j?.error?.message ?? "Gagal membuat tautan");

      setShareUrl(j.share_url ?? null);
      setShareLinkId(j.share_link_id ?? null);
      setShareExpiresAt(j.expires_at ?? null);
      setShareMaxViews(typeof j.max_views === "number" ? j.max_views : null);
      setShareOpen(true);

      try {
        if (j?.share_url) await navigator.clipboard.writeText(j.share_url);
        toast.success("Tautan dibuat & disalin");
      } catch {
        toast.success("Tautan berhasil dibuat");
      }
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      closeToast(t);
      setBusyId(null);
    }
  }

  async function handleDownload(id: string) {
    const t = showLoading("Menyiapkan download…");

    try {
      setBusyId(id);
      const res = await fetch(`/api/files/${id}/signed-download`, { method: "POST" });
      const j = await res.json().catch(() => null);
      if (!res.ok) throw new Error(j?.error?.message ?? "Gagal download");

      toast.success("Download siap");
      window.location.href = j.url;
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      closeToast(t);
      setBusyId(null);
    }
  }

  function handlePreview(id: string, name: string) {
    preview.open(id, name);
  }

  function askDelete(id: string, name: string) {
    setPendingDelete({ id, name });
    setConfirmOpen(true);
  }

  async function confirmDelete() {
    if (!pendingDelete) return;

    const t = showLoading("Menghapus file…");

    try {
      setBusyId(pendingDelete.id);
      const res = await fetch(`/api/files/${pendingDelete.id}`, { method: "DELETE" });
      const j = await res.json().catch(() => null);
      if (!res.ok) throw new Error(j?.error?.message ?? "Gagal hapus file");

      toast.success("File dipindahkan ke sampah");
      setConfirmOpen(false);
      setPendingDelete(null);

      await load();
      onChanged?.();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      closeToast(t);
      setBusyId(null);
    }
  }

  return (
    <>
      <div className="rounded-xl border bg-background shadow-sm">
        <div className="grid grid-cols-12 gap-3 px-4 py-3 text-xs text-muted-foreground">
          <div className="col-span-5">Nama</div>
          <div className="col-span-2 hidden lg:block">Tipe</div>
          <div className="col-span-3 hidden sm:block">Diunggah</div>
          <div className="col-span-1 text-right">Ukuran</div>
          <div className="col-span-1 text-right">Aksi</div>
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
              Unggah file pertama kamu untuk mulai. Kamu bisa unduh aman dan buat tautan sekali pakai.
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
            {files.map((f) => {
              const name = displayName(f.original_name);

              return (
                <div
                  key={f.id}
                  className="grid grid-cols-12 items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-muted/30"
                >
                  <div className="col-span-5 truncate font-medium">{name}</div>

                  <div className="col-span-2 hidden lg:block truncate text-muted-foreground">
                    {humanFileType(f.mime_type)}
                  </div>

                  <div className="col-span-3 hidden sm:block truncate text-muted-foreground">
                    {formatUploadedAt(f.created_at)}
                  </div>

                  <div className="col-span-1 text-right text-muted-foreground">
                    {formatBytes(f.size_bytes)}
                  </div>

                  <div className="col-span-1 flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownload(f.id)}
                      disabled={busyId === f.id}
                      className="gap-2"
                    >
                      <Download className="h-4 w-4" />
                      <span className="hidden md:inline">Unduh</span>
                    </Button>

                    <DropdownMenu modal={false}>
                      <DropdownMenuTrigger asChild>
                        <Button type="button" size="sm" variant="outline" disabled={busyId === f.id}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>

                      <DropdownMenuContent align="end" className="min-w-[220px]">
                        <DropdownMenuItem
                          onSelect={(e) => {
                            e.preventDefault();
                            handlePreview(f.id, name);
                          }}
                          className="gap-2"
                        >
                          <Eye className="h-4 w-4" />
                          Preview
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                          onSelect={(e) => {
                            e.preventDefault();
                            handleShare(f.id);
                          }}
                          className="gap-2"
                        >
                          <Share2 className="h-4 w-4" />
                          Bagikan (24 jam • sekali pakai)
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                          onSelect={(e) => {
                            e.preventDefault();
                            askDelete(f.id, name);
                          }}
                          className="gap-2 text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                          Hapus
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        shareUrl={shareUrl}
        shareLinkId={shareLinkId}
        expiresAt={shareExpiresAt}
        maxViews={shareMaxViews}
        onRevoked={() => {
          setShareUrl(null);
          setShareLinkId(null);
          setShareExpiresAt(null);
          setShareMaxViews(null);
        }}
      />

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={(v) => {
          setConfirmOpen(v);
          if (!v) setPendingDelete(null);
        }}
        title="Hapus file?"
        description={
          pendingDelete ? `File "${pendingDelete.name}" akan dipindahkan ke sampah (soft delete).` : undefined
        }
        confirmText="Hapus"
        cancelText="Batal"
        destructive
        loading={pendingDelete ? busyId === pendingDelete.id : false}
        onConfirm={confirmDelete}
      />

      <PreviewDialog state={preview.state} onClose={preview.close} />
    </>
  );
}