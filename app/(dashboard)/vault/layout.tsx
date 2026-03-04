import { Container } from "@/components/app/container";
import { TopNav } from "@/components/app/top-nav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <TopNav />
      <Container>{children}</Container>
    </>
  );
}