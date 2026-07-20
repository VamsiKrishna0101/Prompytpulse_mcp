import type http from "node:http"
import { authenticateMcpToken, hashToken, McpAuthError } from "../auth/authenticate_mcp_token"
import { DEFAULT_MCP_SCOPES } from "../auth/scopes"
import { getBaseUrl, parseRequestBody, readBody, redirect, sendHtml, sendJson } from "./http"
import { renderAuthorizePage } from "./authorize_page"
import { verifyPkce } from "./pkce"
import {
  consumeAuthorizationCode,
  createAuthorizationCode,
  createClient,
  getClient,
  getRefreshToken,
  issueTokenPair,
  normalizeScopes,
  normalizeStringArray,
} from "./storage"

export async function tryHandleOAuthRequest(req: http.IncomingMessage, res: http.ServerResponse) {
  const url = new URL(req.url || "/", getBaseUrl(req))

  if (req.method === "GET" && url.pathname.startsWith("/.well-known/oauth-protected-resource")) {
    return handleProtectedResourceMetadata(req, res)
  }

  if (req.method === "GET" && url.pathname.startsWith("/.well-known/oauth-authorization-server")) {
    return handleAuthorizationServerMetadata(req, res)
  }

  if (req.method === "POST" && url.pathname === "/oauth/register") {
    await handleRegister(req, res)
    return true
  }

  if (req.method === "GET" && url.pathname === "/oauth/authorize") {
    await handleAuthorizeGet(req, res, url)
    return true
  }

  if (req.method === "POST" && url.pathname === "/oauth/authorize") {
    await handleAuthorizePost(req, res)
    return true
  }

  if (req.method === "POST" && url.pathname === "/oauth/token") {
    await handleToken(req, res)
    return true
  }

  return false
}

function handleProtectedResourceMetadata(req: http.IncomingMessage, res: http.ServerResponse) {
  const baseUrl = getBaseUrl(req)
  sendJson(res, 200, {
    resource: `${baseUrl}/mcp`,
    authorization_servers: [baseUrl],
    scopes_supported: DEFAULT_MCP_SCOPES,
    bearer_methods_supported: ["header"],
    resource_documentation: "https://promptpulse.online",
  })
  return true
}

function handleAuthorizationServerMetadata(req: http.IncomingMessage, res: http.ServerResponse) {
  const baseUrl = getBaseUrl(req)
  sendJson(res, 200, {
    issuer: baseUrl,
    authorization_endpoint: `${baseUrl}/oauth/authorize`,
    token_endpoint: `${baseUrl}/oauth/token`,
    registration_endpoint: `${baseUrl}/oauth/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256", "plain"],
    token_endpoint_auth_methods_supported: ["none", "client_secret_post", "client_secret_basic"],
    scopes_supported: DEFAULT_MCP_SCOPES,
  })
  return true
}

async function handleRegister(req: http.IncomingMessage, res: http.ServerResponse) {
  try {
    const body = parseRequestBody(req.headers["content-type"]?.toString(), await readBody(req))
    const redirectUris = Array.isArray(body.redirect_uris)
      ? body.redirect_uris.map(String).filter(Boolean)
      : []

    if (!redirectUris.length) {
      return sendJson(res, 400, { error: "invalid_client_metadata", error_description: "redirect_uris is required" })
    }

    const grantTypes = Array.isArray(body.grant_types)
      ? body.grant_types.map(String)
      : ["authorization_code", "refresh_token"]
    const responseTypes = Array.isArray(body.response_types)
      ? body.response_types.map(String)
      : ["code"]
    const scope = typeof body.scope === "string" ? body.scope : DEFAULT_MCP_SCOPES.join(" ")
    const clientId = await createClient({
      client_name: typeof body.client_name === "string" ? body.client_name : "Claude MCP connector",
      redirect_uris: redirectUris,
      grant_types: grantTypes,
      response_types: responseTypes,
      scope,
    })

    return sendJson(res, 201, {
      client_id: clientId,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      client_name: typeof body.client_name === "string" ? body.client_name : "Claude MCP connector",
      redirect_uris: redirectUris,
      grant_types: grantTypes,
      response_types: responseTypes,
      token_endpoint_auth_method: "none",
      scope,
    })
  } catch (error) {
    return sendJson(res, 400, {
      error: "invalid_client_metadata",
      error_description: error instanceof Error ? error.message : "Invalid registration request",
    })
  }
}

async function handleAuthorizeGet(req: http.IncomingMessage, res: http.ServerResponse, url: URL) {
  const params = Object.fromEntries(url.searchParams.entries())
  const client = await getClient(params.client_id || "")
  if (!client) {
    return sendHtml(res, 400, renderErrorPage("Unknown OAuth client. Please try adding the connector again."))
  }

  const redirectUris = normalizeStringArray(client.redirect_uris)
  if (!redirectUris.includes(params.redirect_uri)) {
    return sendHtml(res, 400, renderErrorPage("Redirect URI is not registered for this client."))
  }

  const scopes = normalizeScopes(params.scope || client.scope)
  return sendHtml(res, 200, renderAuthorizePage({
    clientName: client.client_name || "Claude",
    action: "/oauth/authorize",
    hiddenFields: {
      response_type: params.response_type || "code",
      client_id: params.client_id || "",
      redirect_uri: params.redirect_uri || "",
      scope: scopes.join(" "),
      state: params.state || "",
      code_challenge: params.code_challenge || "",
      code_challenge_method: params.code_challenge_method || "",
      resource: params.resource || "",
    },
    scopes,
  }))
}

async function handleAuthorizePost(req: http.IncomingMessage, res: http.ServerResponse) {
  const body = parseRequestBody(req.headers["content-type"]?.toString(), await readBody(req))
  const clientId = String(body.client_id || "")
  const redirectUri = String(body.redirect_uri || "")
  const client = await getClient(clientId)
  const scopes = normalizeScopes(body.scope || client?.scope)

  const rerender = (error: string) => sendHtml(res, 400, renderAuthorizePage({
    clientName: client?.client_name || "Claude",
    action: "/oauth/authorize",
    hiddenFields: {
      response_type: String(body.response_type || "code"),
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: scopes.join(" "),
      state: String(body.state || ""),
      code_challenge: String(body.code_challenge || ""),
      code_challenge_method: String(body.code_challenge_method || ""),
      resource: String(body.resource || ""),
    },
    scopes,
    error,
  }))

  if (!client) return rerender("Unknown OAuth client.")
  if (!normalizeStringArray(client.redirect_uris).includes(redirectUri)) {
    return rerender("Redirect URI is not registered for this client.")
  }

  try {
    const mcpToken = String(body.mcp_token || "").trim()
    const auth = await authenticateMcpToken(`Bearer ${mcpToken}`)
    const allowedScopes = scopes.filter(scope => auth.scopes.includes(scope))
    if (!allowedScopes.length) return rerender("That MCP token does not include any requested scopes.")

    const code = await createAuthorizationCode({
      client_id: client.id,
      user_id: auth.user_id,
      scopes: allowedScopes,
      redirect_uri: redirectUri,
      code_challenge: String(body.code_challenge || "") || null,
      code_challenge_method: String(body.code_challenge_method || "") || null,
      resource: String(body.resource || "") || null,
    })

    const target = new URL(redirectUri)
    target.searchParams.set("code", code)
    if (body.state) target.searchParams.set("state", String(body.state))
    return redirect(res, target.toString())
  } catch (error) {
    if (error instanceof McpAuthError) return rerender(error.message)
    return rerender(error instanceof Error ? error.message : "Could not approve connector.")
  }
}

async function handleToken(req: http.IncomingMessage, res: http.ServerResponse) {
  try {
    const body = parseRequestBody(req.headers["content-type"]?.toString(), await readBody(req))
    const grantType = String(body.grant_type || "")

    if (grantType === "authorization_code") {
      return handleAuthorizationCodeGrant(res, body)
    }

    if (grantType === "refresh_token") {
      return handleRefreshTokenGrant(res, body)
    }

    return sendJson(res, 400, { error: "unsupported_grant_type" })
  } catch (error) {
    return sendJson(res, 400, {
      error: "invalid_request",
      error_description: error instanceof Error ? error.message : "Invalid token request",
    })
  }
}

async function handleAuthorizationCodeGrant(res: http.ServerResponse, body: Record<string, unknown>) {
  const code = String(body.code || "")
  const clientId = String(body.client_id || "")
  const redirectUri = String(body.redirect_uri || "")
  const codeRow = await consumeAuthorizationCode(code)

  if (!codeRow) return sendJson(res, 400, { error: "invalid_grant" })
  if (codeRow.consumed_at) return sendJson(res, 400, { error: "invalid_grant", error_description: "Code already used" })
  if (codeRow.expires_at.getTime() <= Date.now()) return sendJson(res, 400, { error: "invalid_grant", error_description: "Code expired" })
  if (codeRow.client_id !== clientId) return sendJson(res, 400, { error: "invalid_grant", error_description: "Client mismatch" })
  if (codeRow.redirect_uri !== redirectUri) return sendJson(res, 400, { error: "invalid_grant", error_description: "Redirect URI mismatch" })

  if (!verifyPkce({
    verifier: typeof body.code_verifier === "string" ? body.code_verifier : null,
    challenge: codeRow.code_challenge,
    method: codeRow.code_challenge_method,
  })) {
    return sendJson(res, 400, { error: "invalid_grant", error_description: "PKCE verification failed" })
  }

  const scopes = normalizeStringArray(codeRow.scopes)
  const issued = await issueTokenPair({
    client_id: codeRow.client_id,
    user_id: codeRow.user_id,
    scopes,
  })

  return sendJson(res, 200, {
    access_token: issued.access_token,
    refresh_token: issued.refresh_token,
    token_type: "Bearer",
    expires_in: issued.expires_in,
    scope: scopes.join(" "),
  })
}

async function handleRefreshTokenGrant(res: http.ServerResponse, body: Record<string, unknown>) {
  const refreshToken = String(body.refresh_token || "")
  const row = await getRefreshToken(refreshToken)
  if (!row) return sendJson(res, 400, { error: "invalid_grant" })
  if (row.revoked_at) return sendJson(res, 400, { error: "invalid_grant", error_description: "Refresh token revoked" })
  if (row.expires_at.getTime() <= Date.now()) return sendJson(res, 400, { error: "invalid_grant", error_description: "Refresh token expired" })

  const scopes = normalizeStringArray(row.scopes)
  const issued = await issueTokenPair({
    client_id: row.client_id,
    user_id: row.user_id,
    scopes,
    refresh_token_id: row.id,
  })

  return sendJson(res, 200, {
    access_token: issued.access_token,
    token_type: "Bearer",
    expires_in: issued.expires_in,
    scope: scopes.join(" "),
  })
}

function renderErrorPage(message: string) {
  return `<!doctype html><html><body style="font-family: system-ui; padding: 40px;"><h1>PromptPulse OAuth error</h1><p>${message}</p></body></html>`
}
