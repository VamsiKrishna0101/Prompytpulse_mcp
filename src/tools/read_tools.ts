import prisma from "../shared/prisma"
import { assertProjectAccess } from "../security/project_access"
import type { McpAuthContext } from "../auth/authenticate_mcp_token"
import { optionalLimit, optionalString, readObject, requireString } from "./input"

export async function getProjects(auth: McpAuthContext) {
  const projects = await prisma.project.findMany({
    where: { user_id: auth.user_id },
    orderBy: { updated_at: "desc" },
    select: {
      id: true,
      brand_name: true,
      brand_url: true,
      brand_location: true,
      created_at: true,
      updated_at: true,
      _count: {
        select: {
          prompts: true,
          competitors: true,
          runs: true,
        },
      },
    },
  })

  return { projects }
}

export async function getProjectOverview(auth: McpAuthContext, rawArgs: unknown) {
  const args = readObject(rawArgs)
  const project_id = requireString(args, "project_id")
  const project = await assertProjectAccess(project_id, auth.user_id)

  const [chatStats, activePrompts, competitors, sources, latestRun] = await Promise.all([
    prisma.chat.findMany({
      where: { run: { project_id } },
      select: {
        brand_mentioned: true,
        brand_position: true,
        sentiment_score: true,
        ai_model: true,
      },
      take: 1000,
    }),
    prisma.prompt.count({ where: { project_id, is_active: true, status: "ACTIVE" } }),
    prisma.competitor.count({ where: { project_id } }),
    prisma.source.findMany({
      where: { chat: { run: { project_id } } },
      select: { domain: true },
      take: 2000,
    }),
    prisma.run.findFirst({
      where: { project_id },
      orderBy: { ran_at: "desc" },
      select: {
        id: true,
        status: true,
        ran_at: true,
        completed_at: true,
      },
    }),
  ])

  const brandHits = chatStats.filter(chat => chat.brand_mentioned)
  const positions = brandHits.map(chat => chat.brand_position).filter(isNumber)
  const sentiments = brandHits.map(chat => chat.sentiment_score).filter(isNumber)
  const models = Array.from(new Set(chatStats.map(chat => chat.ai_model)))
  const domains = Array.from(new Set(sources.map(source => source.domain)))

  return {
    project,
    metrics: {
      total_ai_responses: chatStats.length,
      visibility_percent: chatStats.length ? round((brandHits.length / chatStats.length) * 100) : 0,
      average_position: average(positions),
      average_sentiment: average(sentiments),
      active_prompts: activePrompts,
      tracked_competitors: competitors,
      unique_source_domains: domains.length,
      models,
    },
    latest_run: latestRun,
  }
}

export async function getTopSources(auth: McpAuthContext, rawArgs: unknown) {
  const args = readObject(rawArgs)
  const project_id = requireString(args, "project_id")
  const limit = optionalLimit(args, "limit", 10, 50)
  await assertProjectAccess(project_id, auth.user_id)

  const chats = await prisma.chat.findMany({
    where: { run: { project_id } },
    include: { sources: true },
    take: 1000,
  })
  const totalChats = chats.length
  const domains = new Map<string, { domain: string; source_type: string; retrievals: Set<string>; citations: number; urls: Set<string> }>()

  for (const chat of chats) {
    for (const source of chat.sources) {
      const row = domains.get(source.domain) ?? {
        domain: source.domain,
        source_type: source.source_type,
        retrievals: new Set<string>(),
        citations: 0,
        urls: new Set<string>(),
      }
      row.retrievals.add(chat.id)
      row.urls.add(source.url)
      if (source.is_cited) row.citations += 1
      domains.set(source.domain, row)
    }
  }

  const sources = Array.from(domains.values())
    .map(row => ({
      domain: row.domain,
      source_type: row.source_type,
      retrieval_count: row.retrievals.size,
      retrieval_rate: totalChats ? round((row.retrievals.size / totalChats) * 100) : 0,
      citation_count: row.citations,
      unique_urls: row.urls.size,
    }))
    .sort((a, b) => b.retrieval_count - a.retrieval_count || b.citation_count - a.citation_count)
    .slice(0, limit)

  return { total_ai_responses: totalChats, sources }
}

export async function getSourceUrls(auth: McpAuthContext, rawArgs: unknown) {
  const args = readObject(rawArgs)
  const project_id = requireString(args, "project_id")
  const domain = optionalString(args, "domain")
  const limit = optionalLimit(args, "limit", 20, 50)
  await assertProjectAccess(project_id, auth.user_id)

  const sources = await prisma.source.findMany({
    where: {
      ...(domain ? { domain } : {}),
      chat: { run: { project_id } },
    },
    include: {
      source_url_content: {
        select: {
          title: true,
          snippet: true,
          source_type: true,
          url_type: true,
          fetch_status: true,
          content_updated_at: true,
          mentioned_brands: true,
        },
      },
      chat: {
        select: {
          id: true,
          ai_model: true,
          brand_mentioned: true,
          prompt: { select: { text: true, topic: true } },
        },
      },
    },
    orderBy: { created_at: "desc" },
    take: 1000,
  })

  const urls = new Map<string, {
    url: string
    domain: string
    title: string | null
    source_type: string
    url_type: string
    retrievals: number
    citations: number
    prompts: Set<string>
    models: Set<string>
    snippet: string | null
    fetch_status: string | null
    mentioned_brands: Set<string>
  }>()

  for (const source of sources) {
    const row = urls.get(source.url) ?? {
      url: source.url,
      domain: source.domain,
      title: source.title ?? source.source_url_content?.title ?? null,
      source_type: source.source_type,
      url_type: source.url_type,
      retrievals: 0,
      citations: 0,
      prompts: new Set<string>(),
      models: new Set<string>(),
      snippet: source.snippet ?? source.source_url_content?.snippet ?? null,
      fetch_status: source.source_url_content?.fetch_status ?? null,
      mentioned_brands: new Set<string>(),
    }
    row.retrievals += 1
    if (source.is_cited) row.citations += 1
    row.prompts.add(source.chat.prompt.text)
    row.models.add(source.chat.ai_model)
    for (const brand of readStringArray(source.mentioned_brands)) row.mentioned_brands.add(brand)
    for (const brand of readStringArray(source.source_url_content?.mentioned_brands)) row.mentioned_brands.add(brand)
    urls.set(source.url, row)
  }

  return {
    urls: Array.from(urls.values())
      .map(row => ({
        ...row,
        prompts: Array.from(row.prompts).slice(0, 8),
        models: Array.from(row.models),
        mentioned_brands: Array.from(row.mentioned_brands),
      }))
      .sort((a, b) => b.retrievals - a.retrievals || b.citations - a.citations)
      .slice(0, limit),
  }
}

export async function getCompetitors(auth: McpAuthContext, rawArgs: unknown) {
  const args = readObject(rawArgs)
  const project_id = requireString(args, "project_id")
  await assertProjectAccess(project_id, auth.user_id)

  const [competitors, chats] = await Promise.all([
    prisma.competitor.findMany({
      where: { project_id },
      orderBy: { created_at: "asc" },
      select: { id: true, name: true, url: true, created_at: true },
    }),
    prisma.chat.findMany({
      where: { run: { project_id } },
      include: { brand_mentions: true },
      take: 1000,
    }),
  ])
  const totalChats = chats.length
  const stats = competitors.map(competitor => {
    const normalized = normalizeName(competitor.name)
    const mentions = chats.flatMap(chat => chat.brand_mentions).filter(mention => normalizeName(mention.brand_name) === normalized)
    return {
      ...competitor,
      mention_count: mentions.length,
      mention_rate: totalChats ? round((mentions.length / totalChats) * 100) : 0,
      average_position: average(mentions.map(mention => mention.position).filter(isNumber)),
      average_sentiment: average(mentions.map(mention => mention.sentiment_score).filter(isNumber)),
    }
  })

  return { total_ai_responses: totalChats, competitors: stats }
}

export async function getPromptPerformance(auth: McpAuthContext, rawArgs: unknown) {
  const args = readObject(rawArgs)
  const project_id = requireString(args, "project_id")
  const limit = optionalLimit(args, "limit", 20, 50)
  await assertProjectAccess(project_id, auth.user_id)

  const prompts = await prisma.prompt.findMany({
    where: { project_id, status: { not: "DELETED" } },
    include: {
      chats: {
        select: {
          brand_mentioned: true,
          brand_position: true,
          sentiment_score: true,
          ai_model: true,
          created_at: true,
        },
        orderBy: { created_at: "desc" },
        take: 100,
      },
    },
    orderBy: { updated_at: "desc" },
    take: 200,
  })

  return {
    prompts: prompts
      .map(prompt => {
        const hits = prompt.chats.filter(chat => chat.brand_mentioned)
        return {
          id: prompt.id,
          text: prompt.text,
          topic: prompt.topic,
          status: prompt.status,
          is_active: prompt.is_active,
          response_count: prompt.chats.length,
          visibility_percent: prompt.chats.length ? round((hits.length / prompt.chats.length) * 100) : 0,
          average_position: average(hits.map(chat => chat.brand_position).filter(isNumber)),
          average_sentiment: average(hits.map(chat => chat.sentiment_score).filter(isNumber)),
          models: Array.from(new Set(prompt.chats.map(chat => chat.ai_model))),
          last_run_at: prompt.last_run_at,
        }
      })
      .sort((a, b) => a.visibility_percent - b.visibility_percent || b.response_count - a.response_count)
      .slice(0, limit),
  }
}

export async function getActionQueue(auth: McpAuthContext, rawArgs: unknown) {
  const args = readObject(rawArgs)
  const project_id = requireString(args, "project_id")
  const status = optionalString(args, "status")
  const limit = optionalLimit(args, "limit", 20, 50)
  await assertProjectAccess(project_id, auth.user_id)

  const items = await prisma.actionQueueItem.findMany({
    where: {
      project_id,
      user_id: auth.user_id,
      ...(status ? { status } : {}),
    },
    orderBy: [{ impact_score: "desc" }, { updated_at: "desc" }],
    take: limit,
  })

  return { items }
}

export async function getReports(auth: McpAuthContext, rawArgs: unknown) {
  const args = readObject(rawArgs)
  const project_id = requireString(args, "project_id")
  const limit = optionalLimit(args, "limit", 10, 20)
  await assertProjectAccess(project_id, auth.user_id)

  const reports = await prisma.aIReport.findMany({
    where: { project_id, user_id: auth.user_id },
    orderBy: { created_at: "desc" },
    take: limit,
    select: {
      id: true,
      brand_name: true,
      period_type: true,
      period_start: true,
      period_end: true,
      status: true,
      summary: true,
      errors: true,
      created_at: true,
      updated_at: true,
    },
  })

  return { reports }
}

function round(value: number, digits = 1) {
  return Number(value.toFixed(digits))
}

function average(values: number[]) {
  if (values.length === 0) return null
  return round(values.reduce((sum, value) => sum + value, 0) / values.length)
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

function normalizeName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "")
}

function readStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []
}
