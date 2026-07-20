import "../config/env"
import crypto from "node:crypto"
import prisma from "../shared/prisma"
import { DEFAULT_MCP_SCOPES } from "../auth/scopes"
import { hashToken } from "../auth/authenticate_mcp_token"

type Args = {
  userId: string
  name: string
  scopes: string[]
  expiresDays: number | null
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const user = await prisma.user.findUnique({
    where: { id: args.userId },
    select: { id: true, email: true },
  })

  if (!user) {
    throw new Error(`User not found: ${args.userId}`)
  }

  const tokenSecret = crypto.randomBytes(32).toString("base64url")
  const token = `pp_mcp_${tokenSecret}`
  const tokenPrefix = token.slice(0, 18)
  const expiresAt = args.expiresDays
    ? new Date(Date.now() + args.expiresDays * 24 * 60 * 60 * 1000)
    : null

  await prisma.$executeRawUnsafe(
    `
      INSERT INTO "McpToken" (
        id, user_id, name, token_hash, token_prefix, scopes, status, expires_at
      )
      VALUES ($1, $2, $3, $4, $5, $6::text[], 'ACTIVE', $7)
    `,
    crypto.randomUUID(),
    user.id,
    args.name,
    hashToken(token),
    tokenPrefix,
    args.scopes,
    expiresAt,
  )

  console.log(JSON.stringify({
    ok: true,
    user_id: user.id,
    email: user.email,
    name: args.name,
    scopes: args.scopes,
    expires_at: expiresAt,
    token,
    warning: "Copy this token now. Only the SHA-256 hash is stored in the database.",
  }, null, 2))
}

function parseArgs(argv: string[]): Args {
  const values = new Map<string, string>()
  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i]
    if (!item.startsWith("--")) continue
    values.set(item.slice(2), argv[i + 1] ?? "")
    i += 1
  }

  const userId = values.get("user-id")?.trim()
  if (!userId) throw new Error("--user-id is required")

  const scopes = values.get("scopes")
    ? values.get("scopes")!.split(",").map(scope => scope.trim()).filter(Boolean)
    : DEFAULT_MCP_SCOPES

  const expiresDaysRaw = values.get("expires-days")
  const expiresDays = expiresDaysRaw
    ? Math.max(1, Math.floor(Number(expiresDaysRaw)))
    : null

  return {
    userId,
    name: values.get("name")?.trim() || "PromptPulse MCP token",
    scopes,
    expiresDays: expiresDays && Number.isFinite(expiresDays) ? expiresDays : null,
  }
}

main()
  .catch(error => {
    console.error("[mcp:create-token] failed", error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
