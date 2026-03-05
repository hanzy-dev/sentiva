import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-[calc(100vh-4rem)]">
      <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:py-16">
        <div className="space-y-12">
          {/* Hero */}
          <section className="space-y-7">
            <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-foreground/60" />
              Private File Vault • Aman • Minimalis
            </div>

            <div className="space-y-4">
              <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
                Sentiva — Vault File Privat untuk Berbagi dengan Aman
              </h1>

              <p className="max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
                Unggah langsung ke storage (hemat server), unduh via signed URL,
                dan bagikan tautan yang bisa kedaluwarsa atau sekali pakai —
                dirancang dengan standar industri.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link href="/vault">Buka Vault</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/login">Masuk</Link>
              </Button>
            </div>

            <p className="max-w-2xl text-sm text-muted-foreground">
              Fokus: keamanan (RLS, signed URL), reliabilitas (atomic link), dan
              kontrol biaya (cleanup job).
            </p>
          </section>

          <Separator />

          {/* Value props */}
          <section className="grid gap-4 md:grid-cols-3">
            <Card className="shadow-sm">
              <CardContent className="space-y-2 p-6">
                <div className="text-sm font-semibold">Upload Efisien (LFA)</div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  File besar diunggah langsung ke storage. Server hanya mengelola
                  metadata dan kontrol akses.
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardContent className="space-y-2 p-6">
                <div className="text-sm font-semibold">Berbagi yang Aman</div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Tautan berbagi kedaluwarsa/sekali pakai dengan konsumsi atomik
                  untuk mencegah race condition.
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardContent className="space-y-2 p-6">
                <div className="text-sm font-semibold">Siap Produksi</div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Audit log, health check, security headers, dan cleanup job
                  untuk mencegah file yatim & biaya membengkak.
                </p>
              </CardContent>
            </Card>
          </section>

          {/* Footer */}
          <footer className="pt-4 text-xs text-muted-foreground">
            © {new Date().getFullYear()} Sentiva. Dibangun dengan Next.js +
            Supabase.
          </footer>
        </div>
      </div>
    </main>
  );
}