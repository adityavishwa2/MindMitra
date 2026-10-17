import "dotenv/config";
import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { Pool } from "pg";
const run = promisify(execFile);
async function main() {
  if (!existsSync(".env")) {
    const password = randomBytes(24).toString("hex");
    await writeFile(
      ".env",
      `DATABASE_URL=postgresql://mindmitra:${password}@localhost:5432/mindmitra\nNEXTAUTH_URL=http://localhost:3000\nNEXTAUTH_SECRET=${randomBytes(48).toString("hex")}\n`,
      { flag: "wx", mode: 0o600 },
    );
    const dotenv = await import("dotenv");
    dotenv.config();
    console.log(
      "Created private local environment file. Add Google credentials separately.",
    );
  }
  if (!process.env.DATABASE_URL)
    throw new Error("Configure DATABASE_URL before setup.");
  const database = new URL(process.env.DATABASE_URL);
  if (["localhost", "127.0.0.1"].includes(database.hostname)) {
    let exists = false;
    try {
      await run("docker", ["inspect", "mindmitra-postgres"]);
      exists = true;
    } catch {}
    if (exists) await run("docker", ["start", "mindmitra-postgres"]);
    else
      await run(
        "docker",
        [
          "run",
          "--name",
          "mindmitra-postgres",
          "--restart",
          "unless-stopped",
          "-e",
          "POSTGRES_USER",
          "-e",
          "POSTGRES_PASSWORD",
          "-e",
          "POSTGRES_DB",
          "-p",
          `127.0.0.1:${database.port || 5432}:5432`,
          "-v",
          "mindmitra-pgdata:/var/lib/postgresql/data",
          "-d",
          "postgres:17-alpine",
        ],
        {
          env: {
            ...process.env,
            POSTGRES_USER: decodeURIComponent(database.username),
            POSTGRES_PASSWORD: decodeURIComponent(database.password),
            POSTGRES_DB: database.pathname.slice(1),
          },
        },
      );
  }
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 1000,
  });
  let ready = false;
  for (let i = 0; i < 30; i++) {
    try {
      await pool.query("SELECT 1");
      ready = true;
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  await pool.end();
  if (!ready)
    throw new Error(
      "Database did not become ready. Check database access and existing container credentials; no data was removed.",
    );
  for (const args of [
    ["prisma", "generate"],
    ["tsx", "scripts/migrate.ts"],
    ["tsx", "prisma/seed.ts"],
  ]) {
    const { stdout } = await run(
      process.platform === "win32" ? "npx.cmd" : "npx",
      args,
      { maxBuffer: 10_000_000 },
    );
    process.stdout.write(stdout);
  }
  console.log("Database and dependencies prepared. Start with npm run dev.");
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
