BEGIN;

CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Add v2 columns to existing v1 leads table
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),

  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'New',
  ADD COLUMN IF NOT EXISTS sub_status text,
  ADD COLUMN IF NOT EXISTS status_updated_at timestamptz NOT NULL DEFAULT now(),

  ADD COLUMN IF NOT EXISTS type text, -- Term / FE / MP / etc

  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS full_name_normalized text,

  ADD COLUMN IF NOT EXISTS email_normalized citext,
  ADD COLUMN IF NOT EXISTS phone_e164 text,

  ADD COLUMN IF NOT EXISTS dob date,

  ADD COLUMN IF NOT EXISTS priority_score smallint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS priority_reason jsonb NOT NULL DEFAULT '{}'::jsonb,

  ADD COLUMN IF NOT EXISTS estimated_monthly_premium numeric(12,2),
  ADD COLUMN IF NOT EXISTS estimated_commission numeric(12,2),

  ADD COLUMN IF NOT EXISTS next_action_type text,
  ADD COLUMN IF NOT EXISTS next_action_at timestamptz,

  ADD COLUMN IF NOT EXISTS last_activity_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS last_activity_type text NOT NULL DEFAULT 'created',

  ADD COLUMN IF NOT EXISTS source_page text, -- campaign/page/utm label (optional)
  ADD COLUMN IF NOT EXISTS consent_status text NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS consent_updated_at timestamptz,

  ADD COLUMN IF NOT EXISTS archived_at timestamptz,

  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;

-- 2) Backfill derived fields for existing rows
-- full_name and normalized helpers
UPDATE leads
SET
  full_name = COALESCE(NULLIF(trim(concat_ws(' ', first_name, last_name)), ''), full_name),
  full_name_normalized = COALESCE(
    NULLIF(lower(trim(concat_ws(' ', first_name, last_name))), ''),
    full_name_normalized
  ),
  email_normalized = COALESCE(NULLIF(lower(email), ''), email_normalized),
  last_activity_at = COALESCE(last_activity_at, created_at),
  last_activity_type = COALESCE(last_activity_type, 'created'),
  status_updated_at = COALESCE(status_updated_at, created_at),
  updated_at = now()
WHERE
  full_name IS NULL
  OR full_name_normalized IS NULL
  OR email_normalized IS NULL
  OR last_activity_at IS NULL
  OR status_updated_at IS NULL;

-- 3) Append-only tables (lead_id is uuid in your schema)
CREATE TABLE IF NOT EXISTS lead_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id     uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  agent_id    uuid NULL,
  event_type  text NOT NULL,
  channel     text NOT NULL DEFAULT 'system',
  occurred_at timestamptz NOT NULL DEFAULT now(),
  metadata    jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS lead_notes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id    uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  agent_id   uuid NOT NULL,
  note_text  text NOT NULL,
  pinned     boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lead_status_history_v2 (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id        uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  agent_id       uuid NOT NULL,
  from_status    text NOT NULL,
  to_status      text NOT NULL,
  from_sub_status text NULL,
  to_sub_status   text NULL,
  reason_code    text NULL,
  changed_at     timestamptz NOT NULL DEFAULT now(),
  metadata       jsonb NOT NULL DEFAULT '{}'::jsonb
);

-- 4) Indexes (site-scoped, fast list filters)
CREATE INDEX IF NOT EXISTS idx_leads_site_created
  ON leads (site_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_leads_site_status_created
  ON leads (site_id, status, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_leads_site_priority_active
  ON leads (site_id, priority_score DESC, created_at DESC, id DESC)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_leads_site_next_action_active
  ON leads (site_id, next_action_at ASC, id ASC)
  WHERE archived_at IS NULL AND next_action_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_site_last_activity_active
  ON leads (site_id, last_activity_at DESC, id DESC)
  WHERE archived_at IS NULL;

-- Search helpers
CREATE INDEX IF NOT EXISTS idx_leads_email_normalized
  ON leads (site_id, email_normalized);

CREATE INDEX IF NOT EXISTS idx_leads_phone_e164
  ON leads (site_id, phone_e164);

CREATE INDEX IF NOT EXISTS idx_leads_full_name_trgm
  ON leads USING gin (full_name_normalized gin_trgm_ops);

-- Timeline
CREATE INDEX IF NOT EXISTS idx_lead_events_lead_time
  ON lead_events (lead_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_lead_notes_lead_time
  ON lead_notes (lead_id, created_at DESC);

COMMIT;
