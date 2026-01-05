import "dotenv/config";
import { createDb } from "./services/db";
import { runLeadExportJob } from "./jobs/leadExport";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const db = createDb();

  let stopped = false;
  const stop = () => {
    stopped = true;
    console.log("Worker shutting down...");
  };

  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);

  try {
    while (!stopped) {
      // Atomically claim one queued job (safe for multiple workers)
      const claimed = await db.query(
        `
        WITH next AS (
          SELECT id
          FROM jobs
          WHERE state = 'queued' AND type = 'lead_export'
          ORDER BY created_at asc
          FOR UPDATE SKIP LOCKED
          LIMIT 1
        )
        UPDATE jobs
        SET state = 'running', updated_at = now()
        WHERE id IN (SELECT id FROM next)
        RETURNING id
        `
      );

      const jobId = claimed.rows[0]?.id;

      if (!jobId) {
        await sleep(1500);
        continue;
      }

      try {
        await runLeadExportJob(db, jobId);
      } catch (e: any) {
        await db.query(
          `
          UPDATE jobs
          SET state = 'failed',
              updated_at = now(),
              result = $2::jsonb
          WHERE id = $1
          `,
          [jobId, JSON.stringify({ error: e?.message ?? "job_failed" })]
        );
      }
    }
  } finally {
    await db.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
