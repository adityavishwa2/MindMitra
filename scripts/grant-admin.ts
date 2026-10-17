import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
const email = process.argv[2];
if (!email)
  throw new Error("Usage: npm run admin:grant -- existing-user@example.com");
async function main() {
  const u = await db.user.update({ where: { email }, data: { role: "ADMIN" } });
  await db.auditLog.create({
    data: {
      actorId: "operator-cli",
      action: "GRANT_ADMIN",
      targetId: u.id,
      detail: { method: "server-cli" },
    },
  });
  console.log("Administrator role granted to existing account.");
}
main().finally(() => db.$disconnect());
