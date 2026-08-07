import prisma from "../../shared/prisma"
import { assertProjectAccess } from "../../security/project_access"
import type { McpAuthContext } from "../../auth/authenticate_mcp_token"
import { optionalLimit, optionalString, readObject, requireString } from "../input"

/**
 * Returns saved Reddit intelligence runs for a project.
 * Each run includes the AI-generated summary, themes, action recommendations,
 * and the top 10 most important discovered posts.
 */
export async function getRedditIntelligence(auth: McpAuthContext, rawArgs: unknown) {
  const args = readObject(rawArgs)
  const project_id = requireString(args, "project_id")
  const limit = optionalLimit(args, "limit", 5, 10)

  await assertProjectAccess(project_id, auth.user_id)

  const runs = await prisma.redditIntelligenceRun.findMany({
    where: { project_id, user_id: auth.user_id },
    orderBy: { created_at: "desc" },
    take: limit,
    select: {
      id: true,
      mode: true,
      status: true,
      keyword_count: true,
      keywords: true,
      summary: true,
      themes: true,
      actions: true,
      completed_at: true,
      created_at: true,
      posts: {
        orderBy: { importance_score: "desc" },
        take: 10,
        select: {
          id: true,
          title: true,
          url: true,
          subreddit: true,
          author: true,
          keyword: true,
          num_comments: true,
          num_upvotes: true,
          sentiment: true,
          intent: true,
          importance_score: true,
          mentioned_brands: true,
          mentioned_competitors: true,
          date_posted: true,
        },
      },
    },
  })

  return { runs, count: runs.length }
}
