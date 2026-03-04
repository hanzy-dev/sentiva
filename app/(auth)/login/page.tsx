import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Masuk ke Sentiva</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button className="w-full" disabled>
            Lanjut dengan Google (segera)
          </Button>

          <p className="text-xs text-muted-foreground">
            Dengan melanjutkan, kamu menyetujui ketentuan penggunaan.
          </p>

          <Link
            className="block text-xs text-muted-foreground underline"
            href="/(dashboard)"
          >
            Lewati (mode dev)
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}