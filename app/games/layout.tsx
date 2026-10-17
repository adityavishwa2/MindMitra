import { currentUser } from "@/lib/auth";
import { AppShell } from "@/components/shell";
export const dynamic = "force-dynamic";
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const u = await currentUser();
  return (
    <AppShell name={u?.name ?? "Guest"} initialLanguage={u?.language}>
      {children}
    </AppShell>
  );
}
