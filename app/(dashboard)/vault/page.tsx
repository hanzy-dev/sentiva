import { PageHeader } from "@/components/app/page-header";
import { UploadDialog } from "@/components/app/upload-dialog"; // [1] Import sudah benar
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Vault Saya"
        description="Kelola file privat kamu. Unggah cepat, unduh aman, dan bagikan tautan sekali pakai."
        // [2] GANTI <Button disabled>...</Button> MENJADI <UploadDialog />
        action={<UploadDialog />} 
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
              <Input
                placeholder="Cari nama file…"
                className="h-9 w-full sm:w-[260px]"
                disabled
              />
              <Button variant="outline" className="h-9" disabled>
                Filter
              </Button>
            </div>
          </div>

          <Separator />
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="rounded-lg border">
            <div className="grid grid-cols-12 gap-3 px-4 py-3 text-xs text-muted-foreground">
              <div className="col-span-5">Nama</div>
              <div className="col-span-2 hidden sm:block">Tipe</div>
              <div className="col-span-2 hidden sm:block">Ukuran</div>
              <div className="col-span-3 text-right">Aksi</div>
            </div>

            <Separator />

            {/* Empty state */}
            <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
              <div className="text-sm font-medium">Belum ada file</div>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Mulai dengan mengunggah file pertama kamu. Nantinya kamu bisa
                mengunduh via signed URL dan membuat tautan berbagi yang bisa
                kedaluwarsa atau sekali pakai.
              </p>

              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {/* [3] GANTI JUGA tombol di tengah ini agar konsisten */}
                <UploadDialog /> 
                <Button variant="outline" disabled>
                  Pelajari Cara Kerja
                </Button>
              </div>

              <p className="mt-3 text-xs text-muted-foreground">
                (Sistem upload menggunakan Direct-to-Storage untuk efisiensi biaya)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}