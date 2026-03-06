"use client";

import { FileTable, type FileTypeFilter } from "@/components/app/file-table";
import { PageHeader } from "@/components/app/page-header";
import { UploadDialog } from "@/components/app/upload-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Filter, Search, Trash2 } from "lucide-react";
import * as React from "react";

type Tab = "vault" | "trash";

function filterLabel(v: FileTypeFilter) {
  switch (v) {
    case "images":
      return "Gambar";
    case "documents":
      return "Dokumen";
    case "media":
      return "Media";
    case "other":
      return "Lainnya";
    default:
      return "Semua";
  }
}

export function VaultClient() {
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [uploadOpen, setUploadOpen] = React.useState(false);

  const [tab, setTab] = React.useState<Tab>("vault");
  const [q, setQ] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<FileTypeFilter>("all");

  return (
    <div className="space-y-6">
      <PageHeader
        title={tab === "vault" ? "Vault Saya" : "Trash"}
        description={
          tab === "vault"
            ? "Kelola file privat kamu. Unggah cepat, unduh aman, dan bagikan tautan sekali pakai."
            : "File yang dihapus akan muncul di sini sampai dibersihkan oleh cleanup job."
        }
        action={
          tab === "vault" ? (
            <>
              <Button onClick={() => setUploadOpen(true)}>Unggah File</Button>
              <UploadDialog
                open={uploadOpen}
                onOpenChange={setUploadOpen}
                onUploaded={() => setRefreshKey((k) => k + 1)}
              />
            </>
          ) : (
            <Button variant="outline" onClick={() => setTab("vault")}>
              Kembali ke Vault
            </Button>
          )
        }
      />

      <Card className="shadow-sm">
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant={tab === "vault" ? "default" : "outline"}
                onClick={() => setTab("vault")}
                className="h-9"
              >
                Vault
              </Button>
              <Button
                variant={tab === "trash" ? "default" : "outline"}
                onClick={() => setTab("trash")}
                className="h-9 gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Trash
              </Button>
            </div>

            <div className="flex w-full items-center gap-2 sm:w-auto">
              <div className="relative w-full sm:w-[280px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Cari nama file…"
                  className="h-9 w-full pl-9"
                />
              </div>

              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="h-9 gap-2">
                    <Filter className="h-4 w-4" />
                    <span className="hidden sm:inline">{filterLabel(typeFilter)}</span>
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="min-w-[220px]">
                  <DropdownMenuItem onSelect={() => setTypeFilter("all")}>Semua</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setTypeFilter("documents")}>Dokumen</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setTypeFilter("images")}>Gambar</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setTypeFilter("media")}>Media</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setTypeFilter("other")}>Lainnya</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <Separator />
        </CardHeader>

        <CardContent className="space-y-4">
          <FileTable
            refreshKey={refreshKey}
            onChanged={() => setRefreshKey((k) => k + 1)}
            onRequestUpload={() => setUploadOpen(true)}
            searchQuery={q}
            typeFilter={typeFilter}
            mode={tab}
          />
        </CardContent>
      </Card>
    </div>
  );
}