import "dotenv/config";
import { Pool } from "pg";
import { processNextPdf } from "../lib/pdf-queue";
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
let stopping = false;
let wake: (() => void) | undefined;
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.on(signal, () => {
    stopping = true;
    wake?.();
  });
async function main() {
  console.log("PDF conversion worker started");
  while (!stopping) {
    try {
      const worked = await processNextPdf(pool);
      if (process.argv.includes("--once")) break;
      if (worked) continue;
    } catch {
      console.error(
        "PDF worker cannot access its queue. Check database connectivity and apply migrations.",
      );
      if (process.argv.includes("--once")) {
        process.exitCode = 1;
        break;
      }
    }
    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        wake = undefined;
        resolve();
      }, 3000);
      wake = () => {
        clearTimeout(timer);
        resolve();
      };
    });
  }
  await pool.end();
}
main().catch(() => {
  console.error("PDF worker stopped unexpectedly");
  process.exitCode = 1;
});
