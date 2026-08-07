import prisma from "../../shared/prisma"
import { assertProjectAccess } from "../../security/project_access"
import type { McpAuthContext } from "../../auth/authenticate_mcp_token"
import { optionalLimit, readObject, requireString } from "../input"

/**
 * Returns saved brand mention records across AI engine responses for a project.
 * Includes position, sentiment score, source engine, and the prompt that triggered the response.
 */
export async function getBrandMentions(auth: McpAuthContext, rawArgs: unknown) {
  const args = readObject(rawArgs)
  const project_id = requireString(args, "project_id")
  const limit = optionalLimit(args, "limit", 25, 50)

  await assertProjectAccess(project_id, auth.user_id)

  const mentions = await prisma.brandMention.findMany({
    where: {
      chat: { run: { project_id } },
    },
    orderBy: { created_at: "desc" },
    take: limit,
    select: {
      id: true,
      brand_name: true,
      domain: true,
      position: true,
      sentiment_score: true,
      created_at: true,
      chat: {
        select: {
          ai_model: true,
          brand_mentioned: true,
          brand_position: true,
          sentiment_score: true,
          geo_country_code: true,
          geo_country_name: true,
          geo_city: true,
          prompt: {
            select: { id: true, text: true, topic: true },
          },
        },
      },
    },
  })

  return { mentions, count: mentions.length }
}
