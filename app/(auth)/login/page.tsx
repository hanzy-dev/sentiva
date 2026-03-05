import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { signInWithGoogle } from "./actions";

function GoogleIcon() {
  return (
    <svg
      aria-hidden="true"
      width="18"
      height="18"
      viewBox="0 0 48 48"
      className="shrink-0"
    >
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303C33.794 32.657 29.268 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 16.108 18.99 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.164 0 9.86-1.977 13.409-5.197l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.247 0-9.758-3.316-11.286-7.946l-6.52 5.024C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303c-.73 2.213-2.231 4.078-4.094 5.238l.003-.002 6.19 5.238C36.97 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}

export default function LoginPage({
  searchParams,
}: {
  searchParams?: { error?: string };
}) {
  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden px-4 py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(0,0,0,0.06),transparent_60%)]" />

      <Card className="relative w-full max-w-md rounded-xl shadow-lg">
        <CardHeader className="space-y-2">
          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border bg-background shadow-sm">
              <span className="text-sm font-semibold">S</span>
            </span>
            <span className="font-medium">Sentiva</span>
          </div>

          <CardTitle className="text-2xl">Masuk ke Sentiva</CardTitle>
          <p className="text-sm text-muted-foreground">
            Vault privat untuk unggah cepat, unduh aman, dan berbagi tautan sekali
            pakai.
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          {searchParams?.error ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {searchParams.error}
            </p>
          ) : null}

          <form action={signInWithGoogle}>
            <Button className="w-full gap-2" variant="outline" asChild>
              <Link href="/auth/start">
                <GoogleIcon />
                <span>Lanjut dengan Google</span>
              </Link>
            </Button>
          </form>

          <p className="text-xs text-muted-foreground">
            OAuth dilakukan melalui Google & Supabase. Kami tidak menyimpan kata
            sandi kamu.
          </p>

          <Link
            className="block text-xs text-muted-foreground underline underline-offset-4"
            href="/vault"
          >
            Lewati (mode dev)
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}