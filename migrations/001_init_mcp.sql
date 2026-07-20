CREATE TABLE IF NOT EXISTS "McpToken" (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  token_prefix TEXT NOT NULL,
  scopes TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "McpToken_user_status_idx" ON "McpToken"(user_id, status);
CREATE INDEX IF NOT EXISTS "McpToken_hash_idx" ON "McpToken"(token_hash);

CREATE TABLE IF NOT EXISTS "McpAuditLog" (
  id TEXT PRIMARY KEY,
  token_id TEXT REFERENCES "McpToken"(id) ON DELETE SET NULL,
  user_id TEXT REFERENCES "User"(id) ON DELETE SET NULL,
  tool_name TEXT,
  project_id TEXT,
  status TEXT NOT NULL,
  error_code TEXT,
  ip_address TEXT,
  user_agent TEXT,
  request_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "McpAuditLog_user_created_idx" ON "McpAuditLog"(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS "McpAuditLog_token_created_idx" ON "McpAuditLog"(token_id, created_at DESC);
CREATE INDEX IF NOT EXISTS "McpAuditLog_tool_created_idx" ON "McpAuditLog"(tool_name, created_at DESC);
