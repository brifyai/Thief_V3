-- Migration: create site_change_logs (auditing per-site changes)
-- Purpose:
-- - Store a chronological list of changes per domain (action + payload + timestamp)
-- - Will be queried by the Sites UI expand button under each site card

BEGIN;

CREATE TABLE IF NOT EXISTS public.site_change_logs (
  id BIGSERIAL PRIMARY KEY,
  domain TEXT NOT NULL,
  action TEXT NOT NULL,            -- e.g. 'upsert' | 'update' | 'delete' | 'toggle'
  payload JSONB,                   -- snapshot of the data/updates applied
  changedBy TEXT,                  -- optional (user id/email if available)
  "changedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS site_change_logs_domain_idx
  ON public.site_change_logs(domain);

CREATE INDEX IF NOT EXISTS site_change_logs_changedAt_idx
  ON public.site_change_logs("changedAt");

COMMIT;