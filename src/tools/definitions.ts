import { MCP_SCOPES } from "../auth/scopes"

export type ToolDefinition = {
  name: string
  title: string
  description: string
  requiredScope: string
  inputSchema: Record<string, unknown>
}

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  // ─── Core ──────────────────────────────────────────────────────────────────
  {
    name: "get_projects",
    title: "List PromptPulse Projects",
    description: "List projects available to the authenticated PromptPulse user.",
    requiredScope: MCP_SCOPES.READ_PROJECTS,
    inputSchema: {
      type: "object",
      properties: {
        client_user_id: {
          type: "string",
          description: "Optional. For agency accounts only, fetch projects belonging to a specific client user_id.",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_project_overview",
    title: "Get Project Overview",
    description: "Return high-level visibility, position, sentiment, prompt, source, and competitor counts for one project.",
    requiredScope: MCP_SCOPES.READ_DASHBOARD,
    inputSchema: projectIdSchema(),
  },
  {
    name: "get_top_sources",
    title: "Get Top Sources",
    description: "Return top source domains influencing AI answers for a project.",
    requiredScope: MCP_SCOPES.READ_SOURCES,
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string" },
        limit: { type: "number", minimum: 1, maximum: 50 },
      },
      required: ["project_id"],
      additionalProperties: false,
    },
  },
  {
    name: "get_source_urls",
    title: "Get Source URLs",
    description: "Return source URLs, prompt evidence, and citation counts for a project, optionally filtered by domain.",
    requiredScope: MCP_SCOPES.READ_SOURCES,
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string" },
        domain: { type: "string" },
        limit: { type: "number", minimum: 1, maximum: 50 },
      },
      required: ["project_id"],
      additionalProperties: false,
    },
  },
  {
    name: "get_competitors",
    title: "Get Competitors",
    description: "Return tracked competitors and their observed mention metrics for one project.",
    requiredScope: MCP_SCOPES.READ_COMPETITORS,
    inputSchema: projectIdSchema(),
  },
  {
    name: "get_prompt_performance",
    title: "Get Prompt Performance",
    description: "Return prompt-level visibility, sentiment, and response counts.",
    requiredScope: MCP_SCOPES.READ_PROMPTS,
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string" },
        limit: { type: "number", minimum: 1, maximum: 50 },
      },
      required: ["project_id"],
      additionalProperties: false,
    },
  },
  {
    name: "get_action_queue",
    title: "Get Action Queue",
    description: "Return read-only action queue items for a project.",
    requiredScope: MCP_SCOPES.READ_ACTION_QUEUE,
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string" },
        status: { type: "string" },
        limit: { type: "number", minimum: 1, maximum: 50 },
      },
      required: ["project_id"],
      additionalProperties: false,
    },
  },
  {
    name: "get_reports",
    title: "Get Reports",
    description: "Return recent AI visibility reports and summaries for a project.",
    requiredScope: MCP_SCOPES.READ_REPORTS,
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string" },
        limit: { type: "number", minimum: 1, maximum: 20 },
      },
      required: ["project_id"],
      additionalProperties: false,
    },
  },

  // ─── SEO Intelligence ──────────────────────────────────────────────────────
  {
    name: "get_ai_reports",
    title: "Get AI Visibility Reports",
    description: "Return saved AI visibility reports for a project. Each report includes the period covered, brand name, status, high-level summary, and the full report data (visibility scores, coverage, sentiment, recommendations).",
    requiredScope: MCP_SCOPES.READ_AI_REPORTS,
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string", description: "The project ID to fetch reports for." },
        limit: { type: "number", minimum: 1, maximum: 20, description: "Max number of reports to return. Default 10." },
      },
      required: ["project_id"],
      additionalProperties: false,
    },
  },
  {
    name: "get_brand_mentions",
    title: "Get Brand Mentions",
    description: "Return saved brand mention records across AI engine responses for a project. Includes mention position, sentiment score, source engine (ChatGPT, Gemini, Perplexity, etc.), and the prompt that triggered the response.",
    requiredScope: MCP_SCOPES.READ_BRAND_MENTIONS,
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string", description: "The project ID to fetch mentions for." },
        limit: { type: "number", minimum: 1, maximum: 50, description: "Max number of mentions to return. Default 25." },
      },
      required: ["project_id"],
      additionalProperties: false,
    },
  },
  {
    name: "get_prompt_visibility_breakdown",
    title: "Get Prompt Visibility Breakdown",
    description: "Per-prompt breakdown: brand mention rate, average position, average sentiment, and per-engine stats for all active prompts in a project. Useful for identifying which questions your brand is being mentioned in.",
    requiredScope: MCP_SCOPES.READ_BRAND_MENTIONS,
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string", description: "The project ID." },
        limit: { type: "number", minimum: 1, maximum: 50, description: "Max number of prompts to analyze. Default 20." },
      },
      required: ["project_id"],
      additionalProperties: false,
    },
  },

  // ─── GEO Intelligence ──────────────────────────────────────────────────────
  {
    name: "get_geo_variants",
    title: "Get GEO Prompt Variants",
    description: "List all active geo-targeted prompt variants for a project. Shows which prompts are being tracked across which countries and cities.",
    requiredScope: MCP_SCOPES.READ_GEO,
    inputSchema: projectIdSchema(),
  },
  {
    name: "get_geo_visibility",
    title: "Get GEO Visibility",
    description: "Brand visibility results aggregated by country and city. Shows mention rate, average position, average sentiment, and which AI engines returned the brand per geographic market.",
    requiredScope: MCP_SCOPES.READ_GEO,
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string", description: "The project ID." },
        country_code: { type: "string", description: "Optional ISO 3166-1 alpha-2 code (e.g. 'DE', 'US') to filter to a specific country." },
        limit: { type: "number", minimum: 1, maximum: 200, description: "Max raw chat responses to aggregate. Default 100." },
      },
      required: ["project_id"],
      additionalProperties: false,
    },
  },

  // ─── Content ───────────────────────────────────────────────────────────────
  {
    name: "get_content_briefs",
    title: "Get Content Briefs",
    description: "Return saved AI-generated content briefs for a project. Includes title, topic, target prompt, brief structure, status, and content type. Does not include the generated article text to keep responses lean.",
    requiredScope: MCP_SCOPES.READ_CONTENT_BRIEFS,
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string", description: "The project ID." },
        status: { type: "string", description: "Optional status filter (e.g. 'COMPLETED', 'DRAFT', 'GENERATING')." },
        limit: { type: "number", minimum: 1, maximum: 50, description: "Max number of briefs to return. Default 20." },
      },
      required: ["project_id"],
      additionalProperties: false,
    },
  },

  // ─── Analytics ─────────────────────────────────────────────────────────────
  {
    name: "get_reddit_intelligence",
    title: "Get Reddit Intelligence Runs",
    description: "Return saved Reddit intelligence analysis runs for a project. Each run includes AI-generated brand insight summary, discovered themes, recommended actions, and the top 10 most important Reddit posts found.",
    requiredScope: MCP_SCOPES.READ_ANALYTICS,
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string", description: "The project ID." },
        limit: { type: "number", minimum: 1, maximum: 10, description: "Max number of runs to return. Default 5." },
      },
      required: ["project_id"],
      additionalProperties: false,
    },
  },
  {
    name: "get_reddit_posts",
    title: "Get Reddit Posts",
    description: "Return saved Reddit posts for a project sorted by importance score. Includes title, subreddit, sentiment, intent, upvotes, comment count, mentioned brands and competitors. Useful for brand monitoring and identifying discussion opportunities.",
    requiredScope: MCP_SCOPES.READ_ANALYTICS,
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string", description: "The project ID." },
        subreddit: { type: "string", description: "Optional: filter posts by subreddit name." },
        limit: { type: "number", minimum: 1, maximum: 50, description: "Max number of posts to return. Default 25." },
      },
      required: ["project_id"],
      additionalProperties: false,
    },
  },
]

function projectIdSchema() {
  return {
    type: "object",
    properties: {
      project_id: { type: "string" },
    },
    required: ["project_id"],
    additionalProperties: false,
  }
}
