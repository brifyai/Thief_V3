-- Migration: add fetchMode and fetchOptions to site_configurations
-- Purpose:
-- - Enable per-domain fetch strategy selection (axios | playwright | rss)
-- - Store flags/options (tlsRelax, headers, cookies, jsRequired, proxyGroup, timeouts, waitUntil, rssFeeds) in JSONB

BEGIN;

ALTER TABLE public.site_configurations
  ADD COLUMN IF NOT EXISTS "fetchMode" TEXT
  CHECK ("fetchMode" IN ('axios','playwright','rss'))
  DEFAULT 'axios';

ALTER TABLE public.site_configurations
  ADD COLUMN IF NOT EXISTS "fetchOptions" JSONB;

-- Index for filtering by fetchMode
CREATE INDEX IF NOT EXISTS site_configurations_fetchMode_idx
  ON public.site_configurations("fetchMode");

-- Notes on fetchOptions JSONB expected schema:
-- {
--   "tlsRelax": boolean,
--   "headers": { [headerName: string]: string },
--   "cookies": string[] | { name: string, value: string, domain?: string, path?: string }[],
--   "jsRequired": boolean,
--   "proxyGroup": string,
--   "timeouts": { "requestMs": number, "navigationMs": number },
--   "waitUntil": "domcontentloaded" | "networkidle" | "load",
--   "rssFeeds": string[]
-- }

COMMIT;