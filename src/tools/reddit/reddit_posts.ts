import prisma from "../../shared/prisma"
import { assertProjectAccess } from "../../security/project_access"
import type { McpAuthContext } from "../../auth/authenticate_mcp_token"
import { optionalLimit, optionalString, readObject, requireString } from "../input"

/**
 * Returns individual saved Reddit posts for a project, sorted by importance score.
 * Useful for brand monitoring, competitor tracking, and identifying discussion opportunities.
 * Optional: filter by subreddit name.
 */
export async function getRedditPosts(auth: McpAuthContext, rawArgs: unknown) {
  const args = readObject(rawArgs)
  const project_id = requireString(args, "project_id")
  const subreddit = optionalString(args, "subreddit")
  const limit = optionalLimit(args, "limit", 25, 50)

  await assertProjectAccess(project_id, auth.user_id)

  const where: Record<string, unknown> = { project_id, user_id: auth.user_id }
  if (subreddit) where.subreddit = subreddit

  const posts = await prisma.redditPost.findMany({
    where,
    orderBy: [{ importance_score: "desc" }, { created_at: "desc" }],
    take: limit,
    select: {
      id: true,
      title: true,
      description: true,
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
      created_at: true,
    },
  })

  return { posts, count: posts.length }
}
