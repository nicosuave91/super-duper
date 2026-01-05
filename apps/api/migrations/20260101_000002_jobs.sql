create table if not exists jobs (
  id text primary key,
  tenant_id text not null,
  type text not null,
  state text not null,
  payload jsonb not null default '{}'::jsonb,
  result jsonb not null default '{}'::jsonb,
  attempts int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_jobs_tenant_state on jobs (tenant_id, state);
create index if not exists idx_jobs_type_state on jobs (type, state);
