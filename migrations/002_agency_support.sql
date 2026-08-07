-- ============================================================
-- 002_agency_support.sql
-- Agency multi-client support migration
-- Safe to run idempotently (IF NOT EXISTS / IF EXISTS everywhere)
-- ============================================================

-- 1. Add AGENCY value to Plan enum (no-op if already added)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'AGENCY'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'Plan')
  ) THEN
    ALTER TYPE "Plan" ADD VALUE 'AGENCY';
  END IF;
END $$;

-- 2. AgencyClientLink — join table between agency user and client user
CREATE TABLE IF NOT EXISTS "AgencyClientLink" (
  id              TEXT PRIMARY KEY,
  agency_user_id  TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  client_user_id  TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  role            TEXT NOT NULL DEFAULT 'CLIENT',
  status          TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (agency_user_id, client_user_id)
);

CREATE INDEX IF NOT EXISTS "AgencyClientLink_agency_status_idx"
  ON "AgencyClientLink"(agency_user_id, status);

CREATE INDEX IF NOT EXISTS "AgencyClientLink_client_idx"
  ON "AgencyClientLink"(client_user_id);

-- 3. Fix Project.brand_name: drop global unique constraint, replace with
--    per-user unique so two clients can track the same brand name independently.
ALTER TABLE "Project" DROP CONSTRAINT IF EXISTS "Project_brand_name_key";
CREATE UNIQUE INDEX IF NOT EXISTS "Project_user_brand_unique"
  ON "Project"(user_id, brand_name);
