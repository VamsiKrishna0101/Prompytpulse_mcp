import prisma from "../../shared/prisma"
import { assertProjectAccess } from "../../security/project_access"
import type { McpAuthContext } from "../../auth/authenticate_mcp_token"
import { optionalLimit, optionalString, readObject, requireString } from "../input"

/**
 * Returns saved AI-generated content briefs for a project.
 * Returns the brief structure but NOT the heavy article JSON to keep payloads lean.
 * Optional: filter by status (e.g. "COMPLETED", "DRAFT").
 */
export async function getContentBriefs(auth: McpAuthContext, rawArgs: unknown) {
  const args = readObject(rawArgs)
  const project_id = requireString(args, "project_id")
  const status = optionalString(args, "status")
  const limit = optionalLimit(args, "limit", 20, 50)

  await assertProjectAccess(project_id, auth.user_id)

  const where: Record<string, unknown> = { project_id, user_id: auth.user_id }
  if (status) where.status = status

  const briefs = await prisma.contentBrief.findMany({
    where,
    orderBy: { updated_at: "desc" },
    take: limit,
    select: {
      id: true,
      title: true,
      slug: true,
      topic: true,
      status: true,
      content_type: true,
      action: true,
      target_prompt_text: true,
      opportunity_offset: true,
      brief: true,
      // rticle is intentionally omitted (large JSON payload)
      // prompt_used is omitted (internal LLM metadata)
      created_at: true,
      updated_at: true,
    },
  })

  return { briefs, count: briefs.length }
}
