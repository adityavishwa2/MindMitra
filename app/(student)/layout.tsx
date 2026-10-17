import { requireUser } from "@/lib/auth";
import { AppShell } from "@/components/shell";
export const dynamic = "force-dynamic";
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  return (
    <AppShell
      name={user.name ?? "Student"}
      admin={user.role === "ADMIN"}
      initialLanguage={user.language}
    >
      {children}
    </AppShell>
  );
}
