create table if not exists leads (
  id text primary key,
  tenant_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  type text not null,
  status text not null,

  full_name text null,
  phone text null,
  email text null,

  source_page text null,

  utm_source text null,
  utm_medium text null,
  utm_campaign text null,
  utm_term text null,
  utm_content text null,
  referrer text null,

  payload jsonb not null default '{}'::jsonb,
  last_activity_at timestamptz null
);

create index if not exists idx_leads_tenant_created_at on leads (tenant_id, created_at desc);
create index if not exists idx_leads_tenant_status on leads (tenant_id, status);
create index if not exists idx_leads_tenant_type on leads (tenant_id, type);

create table if not exists lead_status_history (
  id text primary key,
  lead_id text not null references leads(id) on delete cascade,
  tenant_id text not null,
  from_status text not null,
  to_status text not null,
  actor_user_id text null,
  note text null,
  created_at timestamptz not null default now()
);

create index if not exists idx_lead_hist_lead_id on lead_status_history (lead_id, created_at desc);
