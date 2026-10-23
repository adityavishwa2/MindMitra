import { Pool } from "pg";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1,
  connectionTimeoutMillis: 2000,
  query_timeout: 2000,
  idleTimeoutMillis: 10000,
});
pool.on("error", () => {});

export async function GET() {
  try {
    await pool.query('SELECT 1 FROM "Exam" LIMIT 1');
    return Response.json(
      { status: "ok" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { status: "unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
