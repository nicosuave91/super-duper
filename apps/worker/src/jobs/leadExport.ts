import type { Db } from "../services/db";

export async function runLeadExportJob(db: Db, jobId: string) {
  const jobRes = await db.query(`select * from jobs where id = $1`, [jobId]);
  const job = jobRes.rows[0];
  if (!job) return;

  await db.query(`update jobs set state = 'running', updated_at = now(), attempts = attempts + 1 where id = $1`, [jobId]);

  const tenantId = job.tenant_id;
  const query = job.payload?.query ?? {};

  const rowsRes = await db.query(
    `select id, created_at, type, status, full_name, phone, email, source_page
     from leads
     where tenant_id = $1
     order by created_at desc
     limit 5000`,
    [tenantId]
  );

  const header = ["id","created_at","type","status","full_name","phone","email","source_page"];
  const lines = [header.join(",")];

  for (const r of rowsRes.rows) {
    const vals = header.map((k) => {
      const v = r[k];
      const s = v === null || v === undefined ? "" : String(v);
      const escaped = s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replaceAll('"', '""')}"` : s;
      return escaped;
    });
    lines.push(vals.join(","));
  }

  const csv = lines.join("\n");

  // Replace this with your storage provider (S3/Azure/CF R2). For now, store inline in result (not ideal).
  await db.query(
    `update jobs set state = 'ready', updated_at = now(), result = $2::jsonb where id = $1`,
    [jobId, JSON.stringify({ csv_inline: csv, url: null })]
  );
}
