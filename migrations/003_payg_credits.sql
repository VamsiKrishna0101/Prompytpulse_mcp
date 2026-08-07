-- Migration: 003_payg_credits.sql
-- Adds Pay-As-You-Go credit wallet system

-- 1. Add credits_balance to User table
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "credits_balance" INTEGER NOT NULL DEFAULT 0;

-- 2. Create CreditTransaction ledger table
CREATE TABLE IF NOT EXISTS "CreditTransaction" (
  "id"          TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "user_id"     TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "amount"      INTEGER NOT NULL, -- positive = credit added, negative = deducted
  "action"      TEXT NOT NULL,    -- e.g. 'TOPUP', 'REDDIT_SCAN', 'PROMPT_RUN', 'SIGNUP_BONUS'
  "description" TEXT,
  "metadata"    JSONB,
  "created_at"  TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "CreditTransaction_user_id_created_at_idx"
  ON "CreditTransaction"("user_id", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "CreditTransaction_user_id_action_idx"
  ON "CreditTransaction"("user_id", "action");

-- 3. Create RazorpayOrder table to track top-up payment sessions
CREATE TABLE IF NOT EXISTS "RazorpayOrder" (
  "id"                  TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "user_id"             TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "razorpay_order_id"   TEXT NOT NULL UNIQUE,
  "razorpay_payment_id" TEXT UNIQUE,
  "amount_inr_paise"    INTEGER NOT NULL, -- amount in paise (₹1 = 100 paise)
  "credits_to_award"    INTEGER NOT NULL,
  "status"              TEXT NOT NULL DEFAULT 'PENDING', -- PENDING | PAID | FAILED
  "idempotency_key"     TEXT UNIQUE,
  "created_at"          TIMESTAMP NOT NULL DEFAULT now(),
  "updated_at"          TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "RazorpayOrder_user_id_created_at_idx"
  ON "RazorpayOrder"("user_id", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "RazorpayOrder_status_created_at_idx"
  ON "RazorpayOrder"("status", "created_at" DESC);

-- 4. Award existing verified users 200 free signup credits so they aren't stranded
UPDATE "User"
SET "credits_balance" = 200
WHERE "is_verified" = true AND "credits_balance" = 0;
