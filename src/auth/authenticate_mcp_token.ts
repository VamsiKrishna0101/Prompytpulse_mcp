import crypto from "node:crypto"
import prisma from "../shared/prisma"

export type McpAuthContext = {
  token_id: string
  user_id: string
  email: string
  plan: string
  scopes: string[]
}

type TokenRow = {
  id: string
  user_id: string
  name: string
  scopes: string[] | string
  status: string
  expires_at: Date | null
  revoked_at: Date | null
  email: string
  plan: string
}

export class McpAuthError extends Error {
  status: number
  code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

export async function authenticateMcpToken(authorizationHeader: string | undefined): Promise<McpAuthContext> {
  if (!authorizationHeader?.startsWith("Bearer ")) {
    throw new McpAuthError(401, "missing_token", "Missing bearer token")
  }

  const token = authorizationHeader.slice("Bearer ".length).trim()
  if (!token.startsWith("pp_mcp_") || token.length < 30) {
    throw new McpAuthError(401, "invalid_token", "Invalid MCP token")
  }

  const tokenHash = hashToken(token)
  const rows = await prisma.$queryRawUnsafe<TokenRow[]>(
    `
      SELECT t.id, t.user_id, t.name, t.scopes, t.status, t.expires_at, t.revoked_at, u.email, u.plan
      FROM "McpToken" t
      JOIN "User" u ON u.id = t.user_id
      WHERE t.token_hash = $1
      LIMIT 1
    `,
    tokenHash,
  )
  const row = rows[0]

  if (!row) throw new McpAuthError(401, "invalid_token", "Invalid MCP token")
  if (row.status !== "ACTIVE") throw new McpAuthError(401, "inactive_token", "MCP token is not active")
  if (row.revoked_at) throw new McpAuthError(401, "revoked_token", "MCP token is revoked")
  if (row.expires_at && row.expires_at.getTime() <= Date.now()) {
    throw new McpAuthError(401, "expired_token", "MCP token is expired")
  }

  await prisma.$executeRawUnsafe(`UPDATE "McpToken" SET last_used_at = now(), updated_at = now() WHERE id = $1`, row.id)

  return {
    token_id: row.id,
    user_id: row.user_id,
    email: row.email,
    plan: row.plan,
    scopes: normalizeScopes(row.scopes),
  }
}

export function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex")
}

function normalizeScopes(value: string[] | string) {
  if (Array.isArray(value)) return value
  return value
    .replace(/[{}"]/g, "")
    .split(",")
    .map(item => item.trim())
    .filter(Boolean)
}
