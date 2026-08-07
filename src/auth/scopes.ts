export const MCP_SCOPES = {
  READ_PROJECTS: "mcp:read_projects",
  READ_DASHBOARD: "mcp:read_dashboard",
  READ_SOURCES: "mcp:read_sources",
  READ_COMPETITORS: "mcp:read_competitors",
  READ_PROMPTS: "mcp:read_prompts",
  READ_ACTION_QUEUE: "mcp:read_action_queue",
  READ_REPORTS: "mcp:read_reports",
  READ_AGENCY_CLIENTS: "mcp:read_agency_clients",
  // SEO & GEO Intelligence
  READ_AI_REPORTS: "mcp:read_ai_reports",
  READ_BRAND_MENTIONS: "mcp:read_brand_mentions",
  READ_GEO: "mcp:read_geo",
  READ_CONTENT_BRIEFS: "mcp:read_content_briefs",
  READ_ANALYTICS: "mcp:read_analytics",
} as const

export const DEFAULT_MCP_SCOPES = Object.values(MCP_SCOPES)

export function hasScope(scopes: string[], required: string) {
  return scopes.includes(required)
}
