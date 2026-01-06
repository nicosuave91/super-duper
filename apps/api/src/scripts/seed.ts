import "dotenv/config";
import bcrypt from "bcryptjs";
import { pool } from "../db";

const TENANT_ID = "11111111-1111-1111-1111-111111111111";
const SITE_ID = "22222222-2222-2222-2222-222222222222";
const USER_ID = "33333333-3333-3333-3333-333333333333";

const LEAD_IDS = [
  "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
  "cccccccc-cccc-cccc-cccc-cccccccccccc",
  "dddddddd-dddd-dddd-dddd-dddddddddddd",
  "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
];

async function exec(sql: string, params?: any[]) {
  await pool.query(sql, params);
}

async function main() {
  // Extensions
  await exec(`create extension if not exists pgcrypto;`);

  // Tables (minimal schema required by current API/UI)
  await exec(`
    create table if not exists tenants (
      id uuid primary key,
      name text not null,
      created_at timestamptz not null default now()
    );
  `);

  await exec(`
    create table if not exists users (
      id uuid primary key,
      auth0_sub text unique not null,
      email text unique not null,
      password_hash text,
      created_at timestamptz not null default now()
    );
  `);

  await exec(`
    create table if not exists tenant_users (
      tenant_id uuid not null references tenants(id) on delete cascade,
      sub text not null,
      tenant_role text,
      created_at timestamptz not null default now(),
      primary key (tenant_id, sub)
    );
  `);

  await exec(`
    create table if not exists sites (
      id uuid primary key,
      tenant_id uuid not null references tenants(id) on delete cascade,
      name text not null,
      slug text not null,
      created_at timestamptz not null default now()
    );
  `);

  await exec(`
    create table if not exists site_memberships (
      site_id uuid not null references sites(id) on delete cascade,
      user_id uuid not null references users(id) on delete cascade,
      role text not null default 'owner',
      created_at timestamptz not null default now(),
      primary key (site_id, user_id)
    );
  `);

  await exec(`
    create table if not exists leads (
      id uuid primary key,
      site_id uuid not null references sites(id) on delete cascade,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),

      type text not null default 'life',
      status text not null default 'new',
      sub_status text,
      reason_code text,

      full_name text,
      phone text,
      email text,
      state text,

      priority_score int,
      priority_reason text,

      estimated_monthly_premium numeric,
      estimated_commission numeric,
      source_page text,

      last_activity_at timestamptz,
      last_activity_type text,
      next_action_at timestamptz,
      next_action_type text,

      consent_status text,
      version int not null default 1,

      archived_at timestamptz,
      payload jsonb not null default '{}'::jsonb
    );
  `);

  await exec(`
    create table if not exists lead_history (
      id uuid primary key default gen_random_uuid(),
      lead_id uuid not null references leads(id) on delete cascade,
      site_id uuid not null references sites(id) on delete cascade,
      from_status text,
      to_status text,
      actor_sub text,
      note text,
      created_at timestamptz not null default now()
    );
  `);

  await exec(`
    create table if not exists lead_notes (
      id uuid primary key default gen_random_uuid(),
      lead_id uuid not null references leads(id) on delete cascade,
      agent_id uuid not null references users(id) on delete cascade,
      note_text text not null,
      pinned boolean not null default false,
      created_at timestamptz not null default now()
    );
  `);

  await exec(`
    create table if not exists lead_events (
      id uuid primary key default gen_random_uuid(),
      lead_id uuid not null references leads(id) on delete cascade,
      agent_id uuid not null references users(id) on delete cascade,
      event_type text not null,
      channel text,
      occurred_at timestamptz not null default now(),
      metadata jsonb not null default '{}'::jsonb
    );
  `);

  await exec(`
    create table if not exists tenant_settings (
      tenant_id uuid primary key references tenants(id) on delete cascade,
      profile jsonb not null default '{}'::jsonb,
      brand jsonb not null default '{}'::jsonb,
      updated_at timestamptz not null default now()
    );
  `);

  await exec(`
    create table if not exists jobs (
      id uuid primary key,
      tenant_id uuid not null references tenants(id) on delete cascade,
      type text not null,
      state text not null,
      payload jsonb not null default '{}'::jsonb,
      result jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `);

  await exec(`
    create table if not exists provisioning_events (
      id uuid primary key default gen_random_uuid(),
      tenant_id uuid not null references tenants(id) on delete cascade,
      created_at timestamptz not null default now(),
      title text,
      message text,
      stage text,
      correlation_id text
    );
  `);

  await exec(`
    create table if not exists tenant_provisioning_status (
      tenant_id uuid primary key references tenants(id) on delete cascade,
      site_stage text not null default 'queued',
      domain_stage text not null default 'queued',
      dns_stage text not null default 'queued',
      updated_at timestamptz not null default now()
    );
  `);

  await exec(`
    create table if not exists provisioning_commands (
      id uuid primary key,
      tenant_id uuid not null references tenants(id) on delete cascade,
      command text not null,
      created_at timestamptz not null default now()
    );
  `);

  // Seed tenant
  await exec(
    `insert into tenants (id, name) values ($1, $2)
     on conflict (id) do update set name = excluded.name`,
    [TENANT_ID, "Demo Tenant"]
  );

  // Seed user
  const passwordHash = await bcrypt.hash("Password123!", 10);

  await exec(
    `insert into users (id, auth0_sub, email, password_hash)
     values ($1, $2, $3, $4)
     on conflict (id) do update set email = excluded.email, password_hash = excluded.password_hash`,
    [USER_ID, "local|user1", "user1@example.com", passwordHash]
  );

  // Tenant membership for user1
  await exec(
    `insert into tenant_users (tenant_id, sub, tenant_role)
     values ($1, $2, $3)
     on conflict (tenant_id, sub) do update set tenant_role = excluded.tenant_role`,
    [TENANT_ID, "local|user1", "owner"]
  );

  // Site
  await exec(
    `insert into sites (id, tenant_id, name, slug)
     values ($1, $2, $3, $4)
     on conflict (id) do update set name = excluded.name, slug = excluded.slug`,
    [SITE_ID, TENANT_ID, "Demo Site", "demo-site"]
  );

  // Site membership
  await exec(
    `insert into site_memberships (site_id, user_id, role)
     values ($1, $2, $3)
     on conflict (site_id, user_id) do update set role = excluded.role`,
    [SITE_ID, USER_ID, "owner"]
  );

  // Tenant settings (token-friendly defaults)
  await exec(
    `insert into tenant_settings (tenant_id, profile, brand)
     values ($1, $2::jsonb, $3::jsonb)
     on conflict (tenant_id) do update set profile = excluded.profile, brand = excluded.brand, updated_at = now()`,
    [
      TENANT_ID,
      JSON.stringify({
        display_name: "Demo Agent",
        phone: "555-111-2222",
        email: "user1@example.com",
        agency_name: "Demo Agency",
        agent_bio: "This is seeded dev data.",
        logo_url: null,
      }),
      JSON.stringify({
        primary_color: null,
        accent_color: null,
        cta_label: "Book a call",
        disclosure_text: "Dev-only seeded disclosure text.",
        calendar_url: null,
      }),
    ]
  );

  // Leads
  const now = new Date();
  const mkPayload = (i: number) => ({ source: "seed", idx: i });

  const leadRows = [
    { id: LEAD_IDS[0], status: "new", full_name: "Alex Rivera", email: "alex@example.com", phone: "555-000-0001", state: "VA", priority: 92, premium: 120 },
    { id: LEAD_IDS[1], status: "contacted", full_name: "Jordan Lee", email: "jordan@example.com", phone: "555-000-0002", state: "NC", priority: 70, premium: 80 },
    { id: LEAD_IDS[2], status: "quoted", full_name: "Sam Patel", email: "sam@example.com", phone: "555-000-0003", state: "SC", priority: 55, premium: 150 },
    { id: LEAD_IDS[3], status: "lost", full_name: "Taylor Kim", email: "taylor@example.com", phone: "555-000-0004", state: "GA", priority: 40, premium: 60 },
    { id: LEAD_IDS[4], status: "archived", full_name: "Morgan Chen", email: "morgan@example.com", phone: "555-000-0005", state: "FL", priority: 30, premium: 45 },
  ];

  for (let i = 0; i < leadRows.length; i++) {
    const l = leadRows[i];
    await exec(
      `insert into leads (
         id, site_id, created_at, updated_at,
         type, status, full_name, email, phone, state,
         priority_score, priority_reason,
         estimated_monthly_premium, estimated_commission,
         source_page, last_activity_at, last_activity_type,
         next_action_at, next_action_type, consent_status, version, archived_at, payload
       )
       values (
         $1::uuid, $2::uuid, $3::timestamptz, $4::timestamptz,
         $5::text, $6::text, $7::text, $8::text, $9::text, $10::text,
         $11::int, $12::text,
         $13::numeric, $14::numeric,
         $15::text, $16::timestamptz, $17::text,
         $18::timestamptz, $19::text, $20::text, $21::int, $22::timestamptz, $23::jsonb
       )
       on conflict (id) do update set
         status = excluded.status,
         updated_at = excluded.updated_at,
         archived_at = excluded.archived_at`,
      [
        l.id,
        SITE_ID,
        new Date(now.getTime() - i * 3600_000).toISOString(),
        new Date(now.getTime() - i * 1800_000).toISOString(),
        "life",
        l.status,
        l.full_name,
        l.email,
        l.phone,
        l.state,
        l.priority,
        "seeded",
        l.premium,
        Number(l.premium) * 0.12,
        "/landing/life",
        new Date(now.getTime() - i * 1200_000).toISOString(),
        "seed",
        new Date(now.getTime() + i * 3600_000).toISOString(),
        "call",
        "unknown",
        1,
        l.status === "archived" ? new Date().toISOString() : null,
        JSON.stringify(mkPayload(i)),
      ]
    );
  }

  // v2 note + event for first lead
  await exec(
    `insert into lead_notes (lead_id, agent_id, note_text, pinned)
     values ($1::uuid, $2::uuid, $3::text, true)
     on conflict do nothing`,
    [LEAD_IDS[0], USER_ID, "Pinned seeded note for Alex Rivera."]
  );

  await exec(
    `insert into lead_events (lead_id, agent_id, event_type, channel, metadata)
     values ($1::uuid, $2::uuid, 'seed', 'system', $3::jsonb)
     on conflict do nothing`,
    [LEAD_IDS[0], USER_ID, JSON.stringify({ hello: "world" })]
  );

  // provisioning seeded status/events
  await exec(
    `insert into tenant_provisioning_status (tenant_id, site_stage, domain_stage, dns_stage)
     values ($1::uuid, 'complete', 'in_progress', 'queued')
     on conflict (tenant_id) do update set site_stage = excluded.site_stage, domain_stage = excluded.domain_stage, dns_stage = excluded.dns_stage, updated_at = now()`,
    [TENANT_ID]
  );

  await exec(
    `insert into provisioning_events (tenant_id, title, message, stage, correlation_id)
     values ($1::uuid, 'Seeded Provisioning', 'This is a seeded provisioning event.', 'site', 'seed-1')`,
    [TENANT_ID]
  );

  console.log("✅ Seed complete.");
  console.log("Tenant:", TENANT_ID);
  console.log("Site:", SITE_ID);
  console.log("User:", "user1@example.com / Password123!");
  console.log("Sub:", "local|user1");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
