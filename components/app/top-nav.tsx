"use client";

import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "@/lib/auth/actions";
import Link from "next/link";

export function TopNav({ userEmail }: { userEmail?: string | null }) {
  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/vault" className="font-semibold tracking-tight">
          Sentiva
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              {userEmail ? userEmail : "Akun"}
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="min-w-[220px]">
            <DropdownMenuItem disabled>Profil (segera)</DropdownMenuItem>
            <DropdownMenuItem disabled>Pengaturan (segera)</DropdownMenuItem>
            <DropdownMenuSeparator />
            <form action={signOut}>
              <button className="w-full">
                <DropdownMenuItem>Keluar</DropdownMenuItem>
              </button>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}