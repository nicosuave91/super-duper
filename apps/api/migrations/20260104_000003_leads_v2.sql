BEGIN;

-- Needed for citext + gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Additive columns onto existing leads table (safe if already present)
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS sub_status text,
  ADD COLUMN IF NOT EXISTS status_updated_at timestamptz NOT NULL DEFAULT now(),

  ADD COLUMN IF NOT EXISTS full_name_normalized text,
  ADD COLUMN IF NOT EXISTS email_normalized citext,
  ADD COLUMN IF NOT EXISTS phone_e164 text,

  ADD COLUMN IF NOT EXISTS dob date,
  ADD COLUMN IF NOT EXISTS state char(2),

  ADD COLUMN IF NOT EXISTS priority_score smallint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS priority_reason jsonb NOT NULL DEFAULT '{}'::jsonb,

  ADD COLUMN IF NOT EXISTS estimated_monthly_premium numeric(12,2),
  ADD COLUMN IF NOT EXISTS estimated_commission numeric(12,2),

  ADD COLUMN IF NOT EXISTS next_action_type text,
  ADD COLUMN IF NOT EXISTS next_action_at timestamptz,

  ADD COLUMN IF NOT EXISTS last_activity_type text,

  ADD COLUMN IF NOT EXISTS consent_status text NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS consent_updated_at timestamptz,

  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;

-- Create append-only tables with lead_id type matching leads.id (uuid vs text)
DO $$
DECLARE
  lead_id_type text;
BEGIN
  SELECT a.atttypid::regtype::text
    INTO lead_id_type
  FROM pg_attribute a
  JOIN pg_class c ON c.oid = a.attrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.relname = 'leads'
    AND n.nspname = 'public'
    AND a.attname = 'id'
    AND a.attnum > 0
    AND NOT a.attisdropped;

  IF lead_id_type IS NULL THEN
    RAISE EXCEPTION 'Could not detect leads.id type';
  END IF;

  EXECUTE format($f$
    CREATE TABLE IF NOT EXISTS lead_events (
      id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      lead_id     %s NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
      agent_id    text NULL,
      event_type  text NOT NULL,
      channel     text NOT NULL DEFAULT 'system',
      occurred_at timestamptz NOT NULL DEFAULT now(),
      metadata    jsonb NOT NULL DEFAULT '{}'::jsonb
    );
  $f$, lead_id_type);

  EXECUTE format($f$
    CREATE TABLE IF NOT EXISTS lead_notes (
      id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      lead_id    %s NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
      agent_id   text NOT NULL,
      note_text  text NOT NULL,
      pinned     boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  $f$, lead_id_type);

  EXECUTE format($f$
    CREATE TABLE IF NOT EXISTS lead_status_history_v2 (
      id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      lead_id    %s NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
      agent_id   text NOT NULL,
      from_status text NOT NULL,
      to_status   text NOT NULL,
      from_sub_status text NULL,
      to_sub_status   text NULL,
      reason_code text NULL,
      changed_at timestamptz NOT NULL DEFAULT now(),
      metadata jsonb NOT NULL DEFAULT '{}'::jsonb
    );
  $f$, lead_id_type);

END $$;

-- Indexes to keep the leads table fast (site-scoped)
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

CREATE INDEX IF NOT EXISTS idx_leads_full_name_trgm
  ON leads USING gin (full_name_normalized gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_lead_events_lead_time
  ON lead_events (lead_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_lead_notes_lead_time
  ON lead_notes (lead_id, created_at DESC);

COMMIT;
