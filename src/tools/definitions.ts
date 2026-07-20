import { MCP_SCOPES } from "../auth/scopes"

export type ToolDefinition = {
  name: string
  title: string
  description: string
  requiredScope: string
  inputSchema: Record<string, unknown>
}

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: "get_projects",
    title: "List PromptPulse Projects",
    description: "List projects available to the authenticated PromptPulse user.",
    requiredScope: MCP_SCOPES.READ_PROJECTS,
    inputSchema: {
      type: "object",
      properties: {},
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
