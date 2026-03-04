import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
      <div className="space-y-10">
        {/* Hero */}
        <section className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-foreground/60" />
            Private File Vault • Aman • Minimalis
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Sentiva — Vault File Privat untuk Berbagi dengan Aman
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
              Unggah langsung ke storage (hemat server), unduh via signed URL,
              dan bagikan tautan yang bisa kedaluwarsa atau sekali pakai —
              dirancang dengan standar industri.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/vault">Buka Vault</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/login">Masuk</Link>
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Fokus: keamanan (RLS, signed URL), reliabilitas (atomic link),
            dan kontrol biaya (cleanup job).
          </p>
        </section>

        <Separator />

        {/* Value props */}
        <section className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="space-y-2 p-5">
              <div className="text-sm font-medium">Upload Efisien (LFA)</div>
              <p className="text-sm text-muted-foreground">
                File besar diunggah langsung ke storage. Server hanya mengelola
                metadata dan kontrol akses.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-2 p-5">
              <div className="text-sm font-medium">Berbagi yang Aman</div>
              <p className="text-sm text-muted-foreground">
                Tautan berbagi kedaluwarsa/sekali pakai dengan konsumsi atomik
                untuk mencegah race condition.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-2 p-5">
              <div className="text-sm font-medium">Siap Produksi</div>
              <p className="text-sm text-muted-foreground">
                Audit log, health check, security headers, dan cleanup job untuk
                mencegah file yatim & biaya membengkak.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Footer */}
        <footer className="pt-2 text-xs text-muted-foreground">
          © {new Date().getFullYear()} Sentiva. Dibangun dengan Next.js +
          Supabase.
        </footer>
      </div>
    </main>
  );
}