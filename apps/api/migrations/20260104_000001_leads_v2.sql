BEGIN;

-- Extensions for search + UUIDs
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 1) Ensure leads table exists (it does in your project) and add v2 columns safely
DO $$
BEGIN
  -- Primary/secondary status
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='leads' AND column_name='sub_status') THEN
    ALTER TABLE leads ADD COLUMN sub_status text NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='leads' AND column_name='status_updated_at') THEN
    ALTER TABLE leads ADD COLUMN status_updated_at timestamptz NOT NULL DEFAULT now();
  END IF;

  -- Ownership / assignment (v2)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='leads' AND column_name='agent_id') THEN
    ALTER TABLE leads ADD COLUMN agent_id text NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='leads' AND column_name='assigned_to_user_id') THEN
    ALTER TABLE leads ADD COLUMN assigned_to_user_id text NULL;
  END IF;

  -- Normalized name/email for search
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='leads' AND column_name='full_name_normalized') THEN
    ALTER TABLE leads ADD COLUMN full_name_normalized text NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='leads' AND column_name='email_normalized') THEN
    ALTER TABLE leads ADD COLUMN email_normalized citext NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='leads' AND column_name='phone_e164') THEN
    ALTER TABLE leads ADD COLUMN phone_e164 text NULL;
  END IF;

  -- DOB and state
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='leads' AND column_name='dob') THEN
    ALTER TABLE leads ADD COLUMN dob date NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='leads' AND column_name='state') THEN
    ALTER TABLE leads ADD COLUMN state char(2) NULL;
  END IF;

  -- Priority
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='leads' AND column_name='priority_score') THEN
    ALTER TABLE leads ADD COLUMN priority_score smallint NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='leads' AND column_name='priority_reason') THEN
    ALTER TABLE leads ADD COLUMN priority_reason jsonb NOT NULL DEFAULT '{}'::jsonb;
  END IF;

  -- Estimated value
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='leads' AND column_name='estimated_monthly_premium') THEN
    ALTER TABLE leads ADD COLUMN estimated_monthly_premium numeric(12,2) NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='leads' AND column_name='estimated_commission') THEN
    ALTER TABLE leads ADD COLUMN estimated_commission numeric(12,2) NULL;
  END IF;

  -- Rollups
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='leads' AND column_name='last_activity_type') THEN
    ALTER TABLE leads ADD COLUMN last_activity_type text NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='leads' AND column_name='next_action_type') THEN
    ALTER TABLE leads ADD COLUMN next_action_type text NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='leads' AND column_name='next_action_at') THEN
    ALTER TABLE leads ADD COLUMN next_action_at timestamptz NULL;
  END IF;

  -- Underwriting flags (denormalized)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='leads' AND column_name='underwriting_flags') THEN
    ALTER TABLE leads ADD COLUMN underwriting_flags jsonb NOT NULL DEFAULT '{}'::jsonb;
  END IF;

  -- Consent rollup
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='leads' AND column_name='consent_status') THEN
    ALTER TABLE leads ADD COLUMN consent_status text NOT NULL DEFAULT 'unknown';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='leads' AND column_name='consent_updated_at') THEN
    ALTER TABLE leads ADD COLUMN consent_updated_at timestamptz NULL;
  END IF;

  -- Archived
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='leads' AND column_name='archived_at') THEN
    ALTER TABLE leads ADD COLUMN archived_at timestamptz NULL;
  END IF;

  -- Optimistic concurrency
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='leads' AND column_name='version') THEN
    ALTER TABLE leads ADD COLUMN version integer NOT NULL DEFAULT 1;
  END IF;
END $$;

-- 2) New tables for v2 details

CREATE TABLE IF NOT EXISTS lead_events (
  id          text PRIMARY KEY,
  tenant_id   text NOT NULL,
  lead_id     text NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  agent_id    text NULL,
  event_type  text NOT NULL,                 -- call_outbound, sms_sent, status_changed, note_added, etc.
  channel     text NOT NULL DEFAULT 'system', -- call|sms|email|note|status_change|system
  occurred_at timestamptz NOT NULL DEFAULT now(),
  metadata    jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS lead_notes (
  id         text PRIMARY KEY,
  tenant_id  text NOT NULL,
  lead_id    text NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  agent_id   text NOT NULL,
  note_text  text NOT NULL,
  pinned     boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tags (
  id         text PRIMARY KEY,
  tenant_id  text NOT NULL,
  name       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, name)
);

CREATE TABLE IF NOT EXISTS lead_tags (
  lead_id text NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  tag_id  text NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (lead_id, tag_id)
);

CREATE TABLE IF NOT EXISTS lead_consent_records (
  id           text PRIMARY KEY,
  tenant_id    text NOT NULL,
  lead_id      text NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  consent_type text NOT NULL,                -- tcpa_sms, marketing_email, etc.
  status       text NOT NULL,                -- consented|opted_out|unknown
  source       text NOT NULL,                -- form_checkbox, sms_stop, agent_action
  ip           inet NULL,
  user_agent   text NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lead_saved_views (
  id         text PRIMARY KEY,
  tenant_id  text NOT NULL,
  agent_id   text NOT NULL,
  name       text NOT NULL,
  is_preset  boolean NOT NULL DEFAULT false,
  is_default boolean NOT NULL DEFAULT false,
  filters    jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort       jsonb NOT NULL DEFAULT '{}'::jsonb,
  columns    jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3) Indexes (v2 table speed)
CREATE INDEX IF NOT EXISTS idx_leads_tenant_created_id
  ON leads (tenant_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_leads_tenant_status_created_id
  ON leads (tenant_id, status, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_leads_tenant_priority_created_id
  ON leads (tenant_id, priority_score DESC, created_at DESC, id DESC)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_leads_tenant_next_action
  ON leads (tenant_id, next_action_at ASC, id ASC)
  WHERE archived_at IS NULL AND next_action_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_tenant_last_activity
  ON leads (tenant_id, last_activity_at DESC, id DESC)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_leads_tenant_type_created
  ON leads (tenant_id, type, created_at DESC, id DESC)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_leads_tenant_state_created
  ON leads (tenant_id, state, created_at DESC, id DESC)
  WHERE archived_at IS NULL;

-- search
CREATE INDEX IF NOT EXISTS idx_leads_tenant_phone_e164
  ON leads (tenant_id, phone_e164);

CREATE INDEX IF NOT EXISTS idx_leads_tenant_email_normalized
  ON leads (tenant_id, email_normalized);

CREATE INDEX IF NOT EXISTS idx_leads_full_name_trgm
  ON leads USING gin (full_name_normalized gin_trgm_ops);

-- events / notes
CREATE INDEX IF NOT EXISTS idx_lead_events_lead_time
  ON lead_events (lead_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_lead_notes_lead_time
  ON lead_notes (lead_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_lead_tags_tag
  ON lead_tags (tag_id, lead_id);

COMMIT;
