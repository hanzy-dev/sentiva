"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

function resolveBaseUrl() {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (envUrl && envUrl !== "null" && /^https?:\/\//.test(envUrl)) {
    return envUrl.replace(/\/$/, "");
  }

  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";

  if (host && host !== "null") {
    return `${proto}://${host}`;
  }

  return null;
}

export async function signInWithGoogle() {
  const baseUrl = resolveBaseUrl();

  if (!baseUrl) {
    // error jelas di halaman login (bukan crash)
    redirect("/login?error=BASE_URL_tidak_terdeteksi_(cek_NEXT_PUBLIC_APP_URL)");
  }

  const supabase = createSupabaseServerClient();

  const redirectTo = `${baseUrl}/auth/callback`;

  // Defensive: validate URL
  try {
    new URL(redirectTo);
  } catch {
    redirect("/login?error=REDIRECT_URL_invalid_(cek_NEXT_PUBLIC_APP_URL)");
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  if (data?.url) redirect(data.url);

  redirect("/login?error=Gagal_membuat_url_oauth");
}