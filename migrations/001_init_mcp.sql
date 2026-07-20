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

CREATE TABLE IF NOT EXISTS "McpOAuthClient" (
  id TEXT PRIMARY KEY,
  client_secret_hash TEXT,
  client_name TEXT,
  redirect_uris TEXT[] NOT NULL DEFAULT '{}',
  grant_types TEXT[] NOT NULL DEFAULT '{"authorization_code","refresh_token"}',
  response_types TEXT[] NOT NULL DEFAULT '{"code"}',
  scope TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "McpOAuthAuthorizationCode" (
  id TEXT PRIMARY KEY,
  code_hash TEXT NOT NULL UNIQUE,
  client_id TEXT NOT NULL REFERENCES "McpOAuthClient"(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  scopes TEXT[] NOT NULL DEFAULT '{}',
  redirect_uri TEXT NOT NULL,
  code_challenge TEXT,
  code_challenge_method TEXT,
  resource TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "McpOAuthAuthorizationCode_hash_idx" ON "McpOAuthAuthorizationCode"(code_hash);
CREATE INDEX IF NOT EXISTS "McpOAuthAuthorizationCode_client_idx" ON "McpOAuthAuthorizationCode"(client_id, expires_at DESC);

CREATE TABLE IF NOT EXISTS "McpOAuthRefreshToken" (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  client_id TEXT NOT NULL REFERENCES "McpOAuthClient"(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  scopes TEXT[] NOT NULL DEFAULT '{}',
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "McpOAuthRefreshToken_hash_idx" ON "McpOAuthRefreshToken"(token_hash);
CREATE INDEX IF NOT EXISTS "McpOAuthRefreshToken_user_idx" ON "McpOAuthRefreshToken"(user_id, expires_at DESC);

CREATE TABLE IF NOT EXISTS "McpOAuthAccessToken" (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  refresh_token_id TEXT REFERENCES "McpOAuthRefreshToken"(id) ON DELETE SET NULL,
  client_id TEXT NOT NULL REFERENCES "McpOAuthClient"(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  scopes TEXT[] NOT NULL DEFAULT '{}',
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "McpOAuthAccessToken_hash_idx" ON "McpOAuthAccessToken"(token_hash);
CREATE INDEX IF NOT EXISTS "McpOAuthAccessToken_user_idx" ON "McpOAuthAccessToken"(user_id, expires_at DESC);
