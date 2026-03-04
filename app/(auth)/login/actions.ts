"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export async function signInWithGoogle() {
  const supabase = createSupabaseServerClient();
  const origin = headers().get("origin") ?? "http://localhost:3000";

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    // nanti kita rapihin ke toast, untuk sekarang redirect dengan query
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  if (data.url) redirect(data.url);
}