import "../config/env"
import http from "node:http"

const token = process.env.MCP_TEST_TOKEN
const port = Number(process.env.MCP_PORT ?? 3030)

if (!token) {
  console.error("Set MCP_TEST_TOKEN before running this smoke test.")
  process.exit(1)
}

async function main() {
  const initialize = await post({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {},
  })
  const tools = await post({
    jsonrpc: "2.0",
    id: 2,
    method: "tools/list",
    params: {},
  })
  const projects = await post({
    jsonrpc: "2.0",
    id: 3,
    method: "tools/call",
    params: {
      name: "get_projects",
      arguments: {},
    },
  })
  console.log(JSON.stringify({ initialize, tools, projects }, null, 2))
}

function post(payload: unknown) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload)
    const req = http.request({
      hostname: "127.0.0.1",
      port,
      path: "/mcp",
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
      },
    }, res => {
      const chunks: Buffer[] = []
      res.on("data", chunk => chunks.push(chunk))
      res.on("end", () => {
        const text = Buffer.concat(chunks).toString("utf8")
        try {
          resolve(JSON.parse(text))
        } catch {
          resolve({ status: res.statusCode, text })
        }
      })
    })
    req.on("error", reject)
    req.write(body)
    req.end()
  })
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
