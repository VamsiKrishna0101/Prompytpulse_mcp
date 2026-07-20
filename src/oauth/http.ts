import type http from "node:http"

export function getBaseUrl(req: http.IncomingMessage) {
  if (process.env.MCP_PUBLIC_BASE_URL) {
    return process.env.MCP_PUBLIC_BASE_URL.replace(/\/+$/g, "")
  }

  const host = req.headers["x-forwarded-host"]?.toString() || req.headers.host || "localhost:3030"
  const proto = req.headers["x-forwarded-proto"]?.toString() || (host.includes("localhost") ? "http" : "https")
  return `${proto}://${host}`.replace(/\/+$/g, "")
}

export function sendJson(res: http.ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...headers,
  })
  res.end(JSON.stringify(body))
}

export function sendHtml(res: http.ServerResponse, status: number, html: string) {
  res.writeHead(status, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Frame-Options": "DENY",
  })
  res.end(html)
}

export function redirect(res: http.ServerResponse, location: string) {
  res.writeHead(302, {
    Location: location,
    "Cache-Control": "no-store",
  })
  res.end()
}

export function readBody(req: http.IncomingMessage, maxBytes = 64_000) {
  return new Promise<string>((resolve, reject) => {
    let total = 0
    const chunks: Buffer[] = []
    req.on("data", chunk => {
      total += chunk.length
      if (total > maxBytes) {
        reject(Object.assign(new Error("Request body too large"), { status: 413 }))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")))
    req.on("error", reject)
  })
}

export function parseRequestBody(contentType: string | undefined, body: string) {
  if (contentType?.includes("application/json")) {
    return JSON.parse(body) as Record<string, unknown>
  }

  const params = new URLSearchParams(body)
  return Object.fromEntries(params.entries())
}
