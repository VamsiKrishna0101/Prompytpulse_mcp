# PromptPulse MCP Server

Private, read-only MCP server for PromptPulse workspace data.

## Deploy status

This folder is deployable as its own Cloud Run service.

- Runtime: Node.js 22
- Entrypoint: `npm run start`
- HTTP endpoint: `/mcp`
- Health endpoint: `/health`
- Auth: `Authorization: Bearer pp_mcp_...`
- Cloud Run port: uses `$PORT` automatically

## Commands

```powershell
cd C:\Users\vklvl\projects\germany_project\mcp
npm install
npm run migrate
npm run create-token -- --user-id USER_ID --name "Local MCP"
npm run start
```

Use the generated `pp_mcp_...` token as:

```http
Authorization: Bearer pp_mcp_...
```

## Cloud Run

Deploy as a **service**, not a job.

Recommended settings:

- Service name: `promptpulse-mcp`
- Region: same as backend, usually `us-east1`
- Build type: Dockerfile
- Source location: `/mcp/Dockerfile` if deploying from the monorepo, or `/Dockerfile` if this folder is its own repo
- Authentication: allow public access, because MCP clients need to reach the URL; app-level bearer token auth protects `/mcp`
- Billing: request-based
- Min instances: `0`
- Max instances: `2` to start

Required env:

```env
DATABASE_URL=your_production_database_url
NODE_ENV=production
```

Optional env:

```env
MCP_PUBLIC_BASE_URL=https://YOUR_MCP_SERVICE_URL
MCP_MAX_BODY_BYTES=256000
MCP_TOKEN_RATE_LIMIT_PER_MINUTE=60
MCP_USER_RATE_LIMIT_PER_HOUR=150
MCP_TOOL_RATE_LIMIT_PER_MINUTE=40
```

After deploy:

```powershell
Invoke-WebRequest -UseBasicParsing https://YOUR_MCP_URL/health
```

Use this as the MCP endpoint:

```text
https://YOUR_MCP_URL/mcp
```

## OAuth for Claude web

Claude web custom connectors require OAuth. This server exposes the required discovery, registration, authorize, and token endpoints:

```text
GET  /.well-known/oauth-protected-resource
GET  /.well-known/oauth-authorization-server
POST /oauth/register
GET  /oauth/authorize
POST /oauth/authorize
POST /oauth/token
```

After deploying this version, run the migration once against production:

```powershell
cd C:\Users\vklvl\projects\germany_project\mcp
npm run migrate
```

Then in Claude, add a custom connector with:

```text
https://YOUR_MCP_URL/mcp
```

Claude will open a PromptPulse authorization page. For this first OAuth bridge, paste an existing `pp_mcp_...` token to approve access. The OAuth access and refresh tokens issued to Claude are stored hashed and scoped to that PromptPulse user.

## Security v1

- Bearer token authentication on every MCP request.
- OAuth 2.1-style authorization-code flow for remote MCP clients such as Claude web.
- MCP tokens are stored as SHA-256 hashes only.
- OAuth authorization codes, access tokens, and refresh tokens are stored as SHA-256 hashes only.
- Read-only tools only.
- Project ownership is checked server-side for every project-scoped tool.
- Scopes are checked per tool.
- In-memory token/user/tool rate limits.
- Audit logs are written for tool calls.
- Tool outputs are sanitized and truncated before returning to the MCP client.
