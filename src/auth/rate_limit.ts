import type { McpAuthContext } from "./authenticate_mcp_token"

type Bucket = {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

const TOKEN_LIMIT_PER_MINUTE = Number(process.env.MCP_TOKEN_RATE_LIMIT_PER_MINUTE ?? 60)
const USER_LIMIT_PER_HOUR = Number(process.env.MCP_USER_RATE_LIMIT_PER_HOUR ?? 500)
const TOOL_LIMIT_PER_MINUTE = Number(process.env.MCP_TOOL_RATE_LIMIT_PER_MINUTE ?? 40)

export class McpRateLimitError extends Error {
  retry_after_seconds: number

  constructor(retryAfterSeconds: number) {
    super("MCP rate limit exceeded")
    this.retry_after_seconds = retryAfterSeconds
  }
}

export function enforceRateLimit(auth: McpAuthContext, toolName: string | null) {
  consume(`token:${auth.token_id}:minute`, TOKEN_LIMIT_PER_MINUTE, 60_000)
  consume(`user:${auth.user_id}:hour`, USER_LIMIT_PER_HOUR, 3_600_000)
  if (toolName) consume(`token:${auth.token_id}:tool:${toolName}:minute`, TOOL_LIMIT_PER_MINUTE, 60_000)
}

function consume(key: string, limit: number, windowMs: number) {
  const now = Date.now()
  const current = buckets.get(key)

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return
  }

  current.count += 1
  if (current.count > limit) {
    throw new McpRateLimitError(Math.ceil((current.resetAt - now) / 1000))
  }
}
