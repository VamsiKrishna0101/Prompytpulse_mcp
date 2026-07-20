import crypto from "node:crypto"
import prisma from "../shared/prisma"
import { DEFAULT_MCP_SCOPES } from "../auth/scopes"
import { hashToken } from "../auth/authenticate_mcp_token"

export type OAuthClient = {
  id: string
  client_secret_hash: string | null
  client_name: string | null
  redirect_uris: string[] | string
  scope: string | null
}

export type OAuthCode = {
  id: string
  client_id: string
  user_id: string
  scopes: string[] | string
  redirect_uri: string
  code_challenge: string | null
  code_challenge_method: string | null
  expires_at: Date
  consumed_at: Date | null
}

export type OAuthRefreshToken = {
  id: string
  client_id: string
  user_id: string
  scopes: string[] | string
  expires_at: Date
  revoked_at: Date | null
}

export function normalizeStringArray(value: string[] | string | null | undefined) {
  if (!value) return []
  if (Array.isArray(value)) return value
  return value
    .replace(/[{}"]/g, "")
    .split(",")
    .map(item => item.trim())
    .filter(Boolean)
}

export function normalizeScopes(scope: unknown, fallback = DEFAULT_MCP_SCOPES) {
  const raw = typeof scope === "string" ? scope.split(/\s+/g) : Array.isArray(scope) ? scope.map(String) : fallback
  const allowed = new Set<string>(DEFAULT_MCP_SCOPES)
  const normalized = raw.map(item => item.trim()).filter(item => allowed.has(item))
  return normalized.length ? normalized : fallback
}

export async function createClient(input: {
  client_name?: string | null
  redirect_uris: string[]
  grant_types: string[]
  response_types: string[]
  scope?: string | null
}) {
  const clientId = `pp_mcp_client_${crypto.randomBytes(18).toString("base64url")}`
  await prisma.$executeRawUnsafe(
    `
      INSERT INTO "McpOAuthClient" (
        id, client_name, redirect_uris, grant_types, response_types, scope
      )
      VALUES ($1, $2, $3::text[], $4::text[], $5::text[], $6)
    `,
    clientId,
    input.client_name ?? null,
    input.redirect_uris,
    input.grant_types,
    input.response_types,
    input.scope ?? null,
  )
  return clientId
}

export async function getClient(clientId: string) {
  const rows = await prisma.$queryRawUnsafe<OAuthClient[]>(
    `SELECT id, client_secret_hash, client_name, redirect_uris, scope FROM "McpOAuthClient" WHERE id = $1 LIMIT 1`,
    clientId,
  )
  return rows[0] ?? null
}

export async function createAuthorizationCode(input: {
  client_id: string
  user_id: string
  scopes: string[]
  redirect_uri: string
  code_challenge?: string | null
  code_challenge_method?: string | null
  resource?: string | null
}) {
  const code = `pp_code_${crypto.randomBytes(32).toString("base64url")}`
  await prisma.$executeRawUnsafe(
    `
      INSERT INTO "McpOAuthAuthorizationCode" (
        id, code_hash, client_id, user_id, scopes, redirect_uri, code_challenge,
        code_challenge_method, resource, expires_at
      )
      VALUES ($1, $2, $3, $4, $5::text[], $6, $7, $8, $9, now() + interval '5 minutes')
    `,
    crypto.randomUUID(),
    hashToken(code),
    input.client_id,
    input.user_id,
    input.scopes,
    input.redirect_uri,
    input.code_challenge ?? null,
    input.code_challenge_method ?? null,
    input.resource ?? null,
  )
  return code
}

export async function consumeAuthorizationCode(code: string) {
  const rows = await prisma.$queryRawUnsafe<OAuthCode[]>(
    `
      SELECT id, client_id, user_id, scopes, redirect_uri, code_challenge, code_challenge_method, expires_at, consumed_at
      FROM "McpOAuthAuthorizationCode"
      WHERE code_hash = $1
      LIMIT 1
    `,
    hashToken(code),
  )
  const row = rows[0] ?? null
  if (!row) return null

  await prisma.$executeRawUnsafe(
    `UPDATE "McpOAuthAuthorizationCode" SET consumed_at = now() WHERE id = $1 AND consumed_at IS NULL`,
    row.id,
  )
  return row
}

export async function issueTokenPair(input: {
  client_id: string
  user_id: string
  scopes: string[]
  refresh_token_id?: string | null
}) {
  const accessToken = `pp_oat_${crypto.randomBytes(32).toString("base64url")}`
  const refreshToken = input.refresh_token_id ? null : `pp_ort_${crypto.randomBytes(32).toString("base64url")}`
  const refreshTokenId = input.refresh_token_id ?? crypto.randomUUID()

  if (refreshToken) {
    await prisma.$executeRawUnsafe(
      `
        INSERT INTO "McpOAuthRefreshToken" (
          id, token_hash, client_id, user_id, scopes, expires_at
        )
        VALUES ($1, $2, $3, $4, $5::text[], now() + interval '90 days')
      `,
      refreshTokenId,
      hashToken(refreshToken),
      input.client_id,
      input.user_id,
      input.scopes,
    )
  }

  await prisma.$executeRawUnsafe(
    `
      INSERT INTO "McpOAuthAccessToken" (
        id, token_hash, refresh_token_id, client_id, user_id, scopes, expires_at
      )
      VALUES ($1, $2, $3, $4, $5, $6::text[], now() + interval '1 hour')
    `,
    crypto.randomUUID(),
    hashToken(accessToken),
    refreshTokenId,
    input.client_id,
    input.user_id,
    input.scopes,
  )

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: 3600,
  }
}

export async function getRefreshToken(refreshToken: string) {
  const rows = await prisma.$queryRawUnsafe<OAuthRefreshToken[]>(
    `
      SELECT id, client_id, user_id, scopes, expires_at, revoked_at
      FROM "McpOAuthRefreshToken"
      WHERE token_hash = $1
      LIMIT 1
    `,
    hashToken(refreshToken),
  )
  const row = rows[0] ?? null
  if (row) {
    await prisma.$executeRawUnsafe(`UPDATE "McpOAuthRefreshToken" SET last_used_at = now() WHERE id = $1`, row.id)
  }
  return row
}
