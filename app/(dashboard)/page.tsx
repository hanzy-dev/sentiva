import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center px-4">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl">Sentiva</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="max-w-2xl text-sm text-muted-foreground">
            Vault file privat dengan unggah langsung ke storage (hemat server),
            unduhan via signed URL, serta tautan berbagi yang bisa kedaluwarsa
            dan sekali pakai.
          </p>

          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/(dashboard)">Buka Vault</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/(auth)/login">Masuk</Link>
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Catatan: Ini masih tahap awal. Fitur akan diaktifkan bertahap.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}