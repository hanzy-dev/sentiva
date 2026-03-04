"use client";

import { FileTable } from "@/components/app/file-table";
import { PageHeader } from "@/components/app/page-header";
import { UploadDialog } from "@/components/app/upload-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import * as React from "react";

export function VaultClient() {
  const [refreshKey, setRefreshKey] = React.useState(0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vault Saya"
        description="Kelola file privat kamu. Unggah cepat, unduh aman, dan bagikan tautan sekali pakai."
        action={<UploadDialog onUploaded={() => setRefreshKey((k) => k + 1)} />}
      />

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="text-sm font-medium">Daftar File</div>
              <div className="text-xs text-muted-foreground">
                Cari file, lihat detail, atau buat tautan berbagi.
              </div>
            </div>

            <div className="flex w-full gap-2 sm:w-auto">
              <Input placeholder="Cari nama file…" className="h-9 w-full sm:w-[260px]" disabled />
              <Button variant="outline" className="h-9" disabled>
                Filter
              </Button>
            </div>
          </div>

          <Separator />
        </CardHeader>

        <CardContent className="space-y-4">
          <FileTable refreshKey={refreshKey} />
        </CardContent>
      </Card>
    </div>
  );
}