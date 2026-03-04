import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { signInWithGoogle } from "./actions";

export default function LoginPage({
  searchParams,
}: {
  searchParams?: { error?: string };
}) {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Masuk ke Sentiva</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {searchParams?.error ? (
            <p className="text-sm text-destructive">{searchParams.error}</p>
          ) : null}

          <form action={signInWithGoogle}>
            <Button className="w-full" asChild>
              <Link href="/auth/start">Lanjut dengan Google</Link>
            </Button>
          </form>

          <p className="text-xs text-muted-foreground">
            Dengan melanjutkan, kamu menyetujui ketentuan penggunaan.
          </p>

          <Link
            className="block text-xs text-muted-foreground underline"
            href="/vault"
          >
            Lewati (mode dev)
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}