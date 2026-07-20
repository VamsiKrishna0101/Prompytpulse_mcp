import crypto from "node:crypto"
import prisma from "../shared/prisma"
import type { McpAuthContext } from "../auth/authenticate_mcp_token"

export async function writeAuditLog(input: {
  auth?: McpAuthContext | null
  tool_name?: string | null
  project_id?: string | null
  status: "SUCCESS" | "ERROR" | "DENIED"
  error_code?: string | null
  ip_address?: string | null
  user_agent?: string | null
  request_id?: string | null
}) {
  try {
    await prisma.$executeRawUnsafe(
      `
        INSERT INTO "McpAuditLog" (
          id, token_id, user_id, tool_name, project_id, status, error_code, ip_address, user_agent, request_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `,
      crypto.randomUUID(),
      input.auth?.token_id?.startsWith("oauth_access:") ? null : input.auth?.token_id ?? null,
      input.auth?.user_id ?? null,
      input.tool_name ?? null,
      input.project_id ?? null,
      input.status,
      input.error_code ?? null,
      input.ip_address ?? null,
      input.user_agent ?? null,
      input.request_id ?? null,
    )
  } catch (error) {
    console.warn("[mcp-audit] failed", error)
  }
}
