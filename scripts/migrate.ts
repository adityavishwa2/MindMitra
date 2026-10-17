import "dotenv/config";
import { Pool } from "pg";
import { createHash, randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function main() {
  const c = await pool.connect();
  try {
    await c.query("SELECT pg_advisory_lock(191817)");
    await c.query(
      'CREATE TABLE IF NOT EXISTS "_prisma_migrations" (id varchar(36) PRIMARY KEY, checksum varchar(64) NOT NULL, finished_at timestamptz, migration_name varchar(255) NOT NULL, logs text, rolled_back_at timestamptz, started_at timestamptz NOT NULL DEFAULT now(), applied_steps_count integer NOT NULL DEFAULT 0)',
    );
    for (const dir of (
      await readdir("prisma/migrations", { withFileTypes: true })
    )
      .filter((d) => d.isDirectory())
      .sort((a, b) => a.name.localeCompare(b.name))) {
      const sql = await readFile(
        `prisma/migrations/${dir.name}/migration.sql`,
        "utf8",
      );
      const checksum = createHash("sha256").update(sql).digest("hex");
      const r = await c.query(
        'SELECT checksum,finished_at FROM "_prisma_migrations" WHERE migration_name=$1 AND rolled_back_at IS NULL',
        [dir.name],
      );
      if (r.rowCount) {
        if (r.rows[0].checksum !== checksum || !r.rows[0].finished_at)
          throw new Error(
            `Migration drift or incomplete migration: ${dir.name}`,
          );
        continue;
      }
      await c.query("BEGIN");
      try {
        await c.query(sql);
        await c.query(
          'INSERT INTO "_prisma_migrations" (id,checksum,migration_name,finished_at,applied_steps_count) VALUES ($1,$2,$3,now(),1)',
          [randomUUID(), checksum, dir.name],
        );
        await c.query("COMMIT");
        console.log(`Applied ${dir.name}`);
      } catch (e) {
        await c.query("ROLLBACK");
        throw e;
      }
    }
  } finally {
    await c.query("SELECT pg_advisory_unlock(191817)");
    c.release();
    await pool.end();
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
