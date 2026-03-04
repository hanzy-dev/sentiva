import { Container } from "@/components/app/container";
import { TopNav } from "@/components/app/top-nav";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function VaultLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();

  return (
    <>
      <TopNav userEmail={data.user?.email} />
      <Container>{children}</Container>
    </>
  );
}