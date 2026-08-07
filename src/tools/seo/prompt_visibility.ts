import prisma from "../../shared/prisma"
import { assertProjectAccess } from "../../security/project_access"
import type { McpAuthContext } from "../../auth/authenticate_mcp_token"
import { optionalLimit, readObject, requireString } from "../input"

/**
 * Per-prompt breakdown: brand mention rate, average position, and
 * sentiment per AI engine, for all active prompts in a project.
 */
export async function getPromptVisibilityBreakdown(auth: McpAuthContext, rawArgs: unknown) {
  const args = readObject(rawArgs)
  const project_id = requireString(args, "project_id")
  const limit = optionalLimit(args, "limit", 20, 50)

  await assertProjectAccess(project_id, auth.user_id)

  const prompts = await prisma.prompt.findMany({
    where: { project_id, is_active: true },
    take: limit,
    orderBy: { last_run_at: "desc" },
    select: {
      id: true,
      text: true,
      topic: true,
      type: true,
      tags: true,
      last_run_at: true,
      chats: {
        orderBy: { created_at: "desc" },
        take: 50,
        select: {
          ai_model: true,
          brand_mentioned: true,
          brand_position: true,
          sentiment_score: true,
          geo_country_code: true,
          geo_country_name: true,
        },
      },
    },
  })

  const breakdown = prompts.map((p) => {
    const total = p.chats.length
    const mentioned = p.chats.filter((c) => c.brand_mentioned).length
    const positions = p.chats
      .filter((c) => c.brand_position != null)
      .map((c) => c.brand_position as number)
    const sentiments = p.chats
      .filter((c) => c.sentiment_score != null)
      .map((c) => c.sentiment_score as number)

    const by_engine: Record<string, { total: number; mentioned: number }> = {}
    for (const chat of p.chats) {
      const e = chat.ai_model
      if (!by_engine[e]) by_engine[e] = { total: 0, mentioned: 0 }
      by_engine[e].total++
      if (chat.brand_mentioned) by_engine[e].mentioned++
    }

    return {
      prompt_id: p.id,
      prompt_text: p.text,
      topic: p.topic,
      type: p.type,
      tags: p.tags,
      last_run_at: p.last_run_at,
      total_responses: total,
      brand_mentioned_count: mentioned,
      brand_mention_rate: total > 0 ? Math.round((mentioned / total) * 100) : 0,
      avg_position:
        positions.length > 0
          ? +(positions.reduce((a, b) => a + b, 0) / positions.length).toFixed(1)
          : null,
      avg_sentiment:
        sentiments.length > 0
          ? +(sentiments.reduce((a, b) => a + b, 0) / sentiments.length).toFixed(2)
          : null,
      by_engine,
    }
  })

  return { prompts: breakdown, count: breakdown.length }
}
