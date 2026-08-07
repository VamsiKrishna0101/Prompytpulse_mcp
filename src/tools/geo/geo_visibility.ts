import prisma from "../../shared/prisma"
import { assertProjectAccess } from "../../security/project_access"
import type { McpAuthContext } from "../../auth/authenticate_mcp_token"
import { optionalLimit, optionalString, readObject, requireString } from "../input"

/**
 * Brand visibility results aggregated by country and city.
 * Shows mention rate, average position, and which AI engines returned the brand per geo.
 */
export async function getGeoVisibility(auth: McpAuthContext, rawArgs: unknown) {
  const args = readObject(rawArgs)
  const project_id = requireString(args, "project_id")
  const country_code = optionalString(args, "country_code")
  const limit = optionalLimit(args, "limit", 100, 200)

  await assertProjectAccess(project_id, auth.user_id)

  const where: Record<string, unknown> = {
    run: { project_id },
    geo_country_code: { not: null },
  }
  if (country_code) {
    where.geo_country_code = country_code
  }

  const chats = await prisma.chat.findMany({
    where,
    orderBy: { created_at: "desc" },
    take: limit,
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
  })

  // Aggregate by country+city key
  type GeoEntry = {
    country_code: string
    country_name: string | null
    city: string | null
    total: number
    mentioned: number
    positions: number[]
    sentiments: number[]
    engines: Set<string>
  }
  const geoMap: Record<string, GeoEntry> = {}

  for (const c of chats) {
    const key = `${c.geo_country_code}::${c.geo_city ?? ""}`
    if (!geoMap[key]) {
      geoMap[key] = {
        country_code: c.geo_country_code!,
        country_name: c.geo_country_name,
        city: c.geo_city,
        total: 0,
        mentioned: 0,
        positions: [],
        sentiments: [],
        engines: new Set(),
      }
    }
    const g = geoMap[key]
    g.total++
    if (c.brand_mentioned) g.mentioned++
    if (c.brand_position != null) g.positions.push(c.brand_position)
    if (c.sentiment_score != null) g.sentiments.push(c.sentiment_score)
    g.engines.add(c.ai_model)
  }

  const geo_summary = Object.values(geoMap).map((g) => ({
    country_code: g.country_code,
    country_name: g.country_name,
    city: g.city,
    total_responses: g.total,
    brand_mentioned_count: g.mentioned,
    brand_mention_rate: g.total > 0 ? Math.round((g.mentioned / g.total) * 100) : 0,
    avg_position:
      g.positions.length > 0
        ? +(g.positions.reduce((a, b) => a + b, 0) / g.positions.length).toFixed(1)
        : null,
    avg_sentiment:
      g.sentiments.length > 0
        ? +(g.sentiments.reduce((a, b) => a + b, 0) / g.sentiments.length).toFixed(2)
        : null,
    engines_tracked: [...g.engines],
  }))

  return { geo_summary, count: geo_summary.length }
}
