import { spawnSync } from "node:child_process";

// Resolve the public origin before NextAuth and origin checks are imported.
process.env.NEXTAUTH_URL ||= process.env.RENDER_EXTERNAL_URL;
for (const key of [
  "DATABASE_URL",
  "NEXTAUTH_URL",
  "NEXTAUTH_SECRET",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
]) {
  if (!process.env[key]) {
    console.error(`Missing required hosting setting: ${key}`);
    process.exit(1);
  }
}
const origin = new URL(process.env.NEXTAUTH_URL);
if (
  origin.protocol !== "https:" &&
  !["localhost", "127.0.0.1"].includes(origin.hostname)
) {
  throw new Error("NEXTAUTH_URL must use HTTPS for public hosting.");
}
process.env.NEXTAUTH_URL = origin.origin;

for (const script of ["scripts/migrate.ts", "prisma/seed.ts"]) {
  const result = spawnSync(process.execPath, ["--import", "tsx", script], {
    stdio: "inherit",
    env: process.env,
  });
  if (result.error || result.status !== 0) process.exit(1);
}
process.argv = [process.execPath, "scripts/serve.mjs", "start"];
await import("./serve.mjs");
