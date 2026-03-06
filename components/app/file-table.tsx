"use client";

import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { PreviewDialog, usePreviewDialog } from "@/components/app/preview-dialog";
import { ShareDialog } from "@/components/app/share-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Download,
  Eye,
  MoreHorizontal,
  Pencil,
  RotateCcw,
  Share2,
  Trash2,
} from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

type FileRow = {
  id: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  created_at: string; // ISO string
  deleted_at?: string | null; // present when listing trash
};

export type FileTypeFilter = "all" | "images" | "documents" | "media" | "other";
export type FileTableMode = "vault" | "trash";

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
  if (m.includes("webp")) return "WEBP";
  if (m.includes("gif")) return "GIF";
  if (m.includes("zip")) return "ZIP";
  if (m.includes("text/plain")) return "TXT";
  if (m.includes("video/")) return "VIDEO";
  if (m.includes("audio/")) return "AUDIO";
  if (m.includes("application/octet-stream")) return "FILE";
  return "FILE";
}

function displayName(name: string) {
  const uuidPrefix =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/i;
  return name.replace(uuidPrefix, "");
}

function formatDateTime(iso: string) {
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

function classify(mime: string): FileTypeFilter {
  const m = (mime || "").toLowerCase();
  if (m.startsWith("image/")) return "images";
  if (m.startsWith("video/") || m.startsWith("audio/")) return "media";

  if (
    m === "application/pdf" ||
    m.includes("wordprocessingml") ||
    m.includes("msword") ||
    m.includes("spreadsheetml") ||
    m.includes("ms-excel") ||
    m.includes("presentationml") ||
    m.includes("ms-powerpoint") ||
    m === "text/plain"
  ) {
    return "documents";
  }

  return "other";
}

function SkeletonRow() {
  return (
    <div className="grid min-w-[720px] grid-cols-12 items-center gap-3 px-4 py-3">
      <div className="col-span-4">
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

      <div className="col-span-2 flex justify-end gap-2">
        <div className="h-8 w-20 animate-pulse rounded bg-muted" />
        <div className="h-8 w-10 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

export function FileTable({
  refreshKey,
  onChanged,
  onRequestUpload,
  searchQuery,
  typeFilter = "all",
  mode = "vault",
}: {
  refreshKey: number;
  onChanged?: () => void;
  onRequestUpload?: () => void;
  searchQuery?: string;
  typeFilter?: FileTypeFilter;
  mode?: FileTableMode;
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

  const [renameOpen, setRenameOpen] = React.useState(false);
  const [renameBusy, setRenameBusy] = React.useState(false);
  const [renameTarget, setRenameTarget] = React.useState<{ id: string; current: string } | null>(
    null
  );
  const [renameValue, setRenameValue] = React.useState("");

  const preview = usePreviewDialog();

  const abortRef = React.useRef<AbortController | null>(null);

  const load = React.useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);

    const timeoutMs = 15000;
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

    try {
      const url = mode === "trash" ? "/api/files?trash=1" : "/api/files";

      const res = await fetch(url, {
        method: "GET",
        signal: controller.signal,
        credentials: "same-origin",
        cache: "no-store",
        headers: { accept: "application/json" },
      });

      const j = await res.json().catch(() => null);

      if (!res.ok) {
        toast.error(j?.error?.message ?? "Gagal memuat file");
        setFiles([]);
        return;
      }

      const rows: FileRow[] = Array.isArray(j?.files) ? j.files : [];
      setFiles(sortNewestFirst(rows));
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        toast.error("Gagal memuat file (timeout). Coba refresh.");
      } else {
        toast.error(getErrorMessage(err));
      }
      setFiles([]);
    } finally {
      window.clearTimeout(timeoutId);
      setLoading(false);
    }
  }, [mode]);

  React.useEffect(() => {
    load();
    return () => abortRef.current?.abort();
  }, [refreshKey, load]);

  async function handleShare(id: string) {
    const t = toast.loading("Membuat tautan…");
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
      toast.dismiss(t);
      setBusyId(null);
    }
  }

  async function handleDownload(id: string) {
    const t = toast.loading("Menyiapkan download…");
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
      toast.dismiss(t);
      setBusyId(null);
    }
  }

  async function handleRestore(id: string) {
    const t = toast.loading("Merestore file…");
    try {
      setBusyId(id);
      const res = await fetch(`/api/files/${id}/restore`, { method: "POST" });
      const j = await res.json().catch(() => null);
      if (!res.ok) throw new Error(j?.error?.message ?? "Gagal restore file");
      toast.success("File direstore");
      await load();
      onChanged?.();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      toast.dismiss(t);
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

    const t = toast.loading("Menghapus file…");

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
      toast.dismiss(t);
      setBusyId(null);
    }
  }

  function openRename(id: string, currentDisplayName: string) {
    setRenameTarget({ id, current: currentDisplayName });
    setRenameValue(currentDisplayName);
    setRenameOpen(true);
  }

  async function confirmRename() {
    if (!renameTarget) return;
    const nextName = (renameValue || "").trim();
    if (!nextName) return toast.error("Nama file tidak boleh kosong.");

    const t = toast.loading("Mengganti nama…");
    try {
      setRenameBusy(true);
      const res = await fetch(`/api/files/${renameTarget.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ original_name: nextName }),
      });

      const j = await res.json().catch(() => null);
      if (!res.ok) throw new Error(j?.error?.message ?? "Gagal rename file");

      toast.success("Nama file diperbarui");
      setFiles((prev) =>
        prev.map((f) => (f.id === renameTarget.id ? { ...f, original_name: nextName } : f))
      );
      setRenameOpen(false);
      setRenameTarget(null);
      onChanged?.();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      toast.dismiss(t);
      setRenameBusy(false);
    }
  }

  const query = (searchQuery ?? "").trim().toLowerCase();
  const visibleFiles = React.useMemo(() => {
    let rows = files;

    if (typeFilter !== "all") {
      rows = rows.filter((f) => classify(f.mime_type) === typeFilter);
    }
    if (query.length > 0) {
      rows = rows.filter((f) => displayName(f.original_name).toLowerCase().includes(query));
    }
    return rows;
  }, [files, query, typeFilter]);

  const emptyTitle =
    files.length === 0 ? (mode === "trash" ? "Trash kosong" : "Belum ada file") : "Tidak ada hasil";
  const emptyDesc =
    files.length === 0
      ? mode === "trash"
        ? "File yang kamu hapus akan muncul di sini."
        : "Unggah file pertama kamu untuk mulai. Kamu bisa unduh aman dan buat tautan sekali pakai."
      : "Coba ubah kata kunci pencarian atau filter.";

  return (
    <>
      <div className="rounded-xl border bg-background shadow-sm">
        <div className="overflow-x-auto">
          <div className="grid min-w-[720px] grid-cols-12 gap-3 px-4 py-3 text-xs text-muted-foreground">
            <div className="col-span-4">Nama</div>
            <div className="col-span-2 hidden lg:block">Tipe</div>
            <div className="col-span-3 hidden sm:block">{mode === "trash" ? "Dihapus" : "Diunggah"}</div>
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
          ) : visibleFiles.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full border bg-background shadow-sm">
                <span className="text-lg">{mode === "trash" ? "🗑️" : "⬆️"}</span>
              </div>

              <div className="text-sm font-semibold">{emptyTitle}</div>
              <p className="mt-1 text-sm text-muted-foreground">{emptyDesc}</p>

              {files.length === 0 && mode === "vault" ? (
                <>
                  <div className="mt-4 flex justify-center">
                    <Button onClick={onRequestUpload}>Unggah Sekarang</Button>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Upload menggunakan Direct-to-Storage untuk efisiensi biaya.
                  </p>
                </>
              ) : null}
            </div>
          ) : (
            <div className="divide-y">
              {visibleFiles.map((f) => {
                const name = displayName(f.original_name);
                const timeIso = mode === "trash" ? (f.deleted_at ?? f.created_at) : f.created_at;

                return (
                  <div
                    key={f.id}
                    className="grid min-w-[720px] grid-cols-12 items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-muted/30"
                  >
                    <div className="col-span-4 truncate font-medium">{name}</div>

                    <div className="col-span-2 hidden lg:block truncate text-muted-foreground">
                      {humanFileType(f.mime_type)}
                    </div>

                    <div className="col-span-3 hidden sm:block truncate text-muted-foreground">
                      {formatDateTime(timeIso)}
                    </div>

                    <div className="col-span-1 text-right text-muted-foreground">
                      {formatBytes(f.size_bytes)}
                    </div>

                    <div className="col-span-2 flex justify-end gap-2">
                      {mode === "trash" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRestore(f.id)}
                          disabled={busyId === f.id || renameBusy}
                          className="gap-2"
                        >
                          <RotateCcw className="h-4 w-4" />
                          <span className="hidden lg:inline">Restore</span>
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownload(f.id)}
                          disabled={busyId === f.id || renameBusy}
                          className="gap-2"
                        >
                          <Download className="h-4 w-4" />
                          <span className="hidden lg:inline">Unduh</span>
                        </Button>
                      )}

                      <DropdownMenu modal={false}>
                        <DropdownMenuTrigger asChild>
                          <Button type="button" size="sm" variant="outline" disabled={busyId === f.id || renameBusy}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent align="end" className="min-w-[220px]">
                          {mode === "vault" ? (
                            <>
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

                              <DropdownMenuItem
                                onSelect={(e) => {
                                  e.preventDefault();
                                  openRename(f.id, name);
                                }}
                                className="gap-2"
                              >
                                <Pencil className="h-4 w-4" />
                                Rename
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
                            </>
                          ) : (
                            <DropdownMenuItem
                              onSelect={(e) => {
                                e.preventDefault();
                                handleRestore(f.id);
                              }}
                              className="gap-2"
                            >
                              <RotateCcw className="h-4 w-4" />
                              Restore
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
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
          pendingDelete
            ? `File "${pendingDelete.name}" akan dipindahkan ke sampah (soft delete).`
            : undefined
        }
        confirmText="Hapus"
        cancelText="Batal"
        destructive
        loading={pendingDelete ? busyId === pendingDelete.id : false}
        onConfirm={confirmDelete}
      />

      <Dialog
        open={renameOpen}
        onOpenChange={(v) => {
          if (renameBusy) return;
          setRenameOpen(v);
          if (!v) {
            setRenameTarget(null);
            setRenameValue("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename file</DialogTitle>
            <DialogDescription>
              Ubah nama file (metadata). Tidak mengubah isi file di storage.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">Nama baru</div>
            <Input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              placeholder="contoh: laporan-q1.pdf"
              disabled={renameBusy}
              onKeyDown={(e) => {
                if (e.key === "Enter") confirmRename();
              }}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setRenameOpen(false)} disabled={renameBusy} type="button">
              Batal
            </Button>
            <Button onClick={confirmRename} loading={renameBusy} loadingText="Menyimpan…" type="button">
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PreviewDialog state={preview.state} onClose={preview.close} />
    </>
  );
}