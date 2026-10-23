import { requireAdmin } from "@/lib/auth";
import { AdminStudio } from "@/components/admin-studio";
export const dynamic = "force-dynamic";
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();
  return <AdminStudio name="Aditya Vishwakarma">{children}</AdminStudio>;
}
