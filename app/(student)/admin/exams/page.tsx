import { requireAdmin } from "@/lib/auth";
import { Heading } from "@/components/ui";
import { AdminExamForm } from "@/components/admin";
export default async function Page() {
  await requireAdmin();
  return (
    <>
      <Heading
        eyebrow="BUILD AN EXTENSIBLE DIRECTORY"
        title="Make room for another goal."
        description="Add an examination and authority without changing application code."
      />
      <div className="card" style={{ maxWidth: 650 }}>
        <AdminExamForm />
      </div>
    </>
  );
}
