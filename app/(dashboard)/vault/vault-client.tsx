"use client";

import { FileTable } from "@/components/app/file-table";
import { PageHeader } from "@/components/app/page-header";
import { UploadDialog } from "@/components/app/upload-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Search } from "lucide-react";
import * as React from "react";

export function VaultClient() {
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [uploadOpen, setUploadOpen] = React.useState(false);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vault Saya"
        description="Kelola file privat kamu. Unggah cepat, unduh aman, dan bagikan tautan sekali pakai."
        action={
          <>
            <Button onClick={() => setUploadOpen(true)}>Unggah File</Button>
            <UploadDialog
              open={uploadOpen}
              onOpenChange={setUploadOpen}
              onUploaded={() => setRefreshKey((k) => k + 1)}
            />
          </>
        }
      />

      <Card className="shadow-sm">
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="text-sm font-semibold">Daftar File</div>
              <div className="text-xs text-muted-foreground">
                Cari file, lihat detail, atau buat tautan berbagi.
              </div>
            </div>

            {/* Search & filter (visual only for now) */}
            <div className="flex w-full items-center gap-2 sm:w-auto">
              <div className="relative w-full sm:w-[280px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Cari nama file…"
                  className="h-9 w-full pl-9"
                  disabled
                />
              </div>
              <Button variant="outline" className="h-9" disabled>
                Filter
              </Button>
            </div>
          </div>

          <Separator />
        </CardHeader>

        <CardContent className="space-y-4">
          <FileTable
            refreshKey={refreshKey}
            onChanged={() => setRefreshKey((k) => k + 1)}
            onRequestUpload={() => setUploadOpen(true)}
          />
        </CardContent>
      </Card>
    </div>
  );
}