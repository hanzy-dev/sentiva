"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "@/lib/auth/actions";
import Link from "next/link";

function initialsFromEmail(email?: string | null) {
  if (!email) return "A";
  const name = email.split("@")[0] ?? "akun";
  const parts = name.split(/[._-]+/).filter(Boolean);
  const first = (parts[0]?.[0] ?? name[0] ?? "A").toUpperCase();
  const second = (parts[1]?.[0] ?? "").toUpperCase();
  return `${first}${second}`.slice(0, 2);
}

export function TopNav({ userEmail }: { userEmail?: string | null }) {
  const initials = initialsFromEmail(userEmail);

  return (
    <header className="border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/vault" className="font-semibold tracking-tight">
          Sentiva
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border bg-background text-[11px] font-semibold">
                {initials}
              </span>
              <span className="hidden max-w-[220px] truncate sm:inline">
                {userEmail ?? "Akun"}
              </span>
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="min-w-[240px]">
            <DropdownMenuLabel className="space-y-0.5">
              <div className="text-xs text-muted-foreground">Masuk sebagai</div>
              <div className="truncate text-sm font-medium">
                {userEmail ?? "Akun"}
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuItem disabled>Profil (segera)</DropdownMenuItem>
            <DropdownMenuItem disabled>Pengaturan (segera)</DropdownMenuItem>

            <DropdownMenuSeparator />

            <form action={signOut}>
              <button className="w-full" type="submit">
                <DropdownMenuItem>Keluar</DropdownMenuItem>
              </button>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}