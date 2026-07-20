export function renderAuthorizePage(input: {
  clientName: string
  action: string
  hiddenFields: Record<string, string>
  scopes: string[]
  error?: string | null
}) {
  const hidden = Object.entries(input.hiddenFields)
    .map(([key, value]) => `<input type="hidden" name="${escapeHtml(key)}" value="${escapeHtml(value)}" />`)
    .join("\n")

  const scopes = input.scopes.map(scope => `<li>${escapeHtml(scope)}</li>`).join("")
  const error = input.error
    ? `<div class="error">${escapeHtml(input.error)}</div>`
    : ""

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Connect PromptPulse MCP</title>
  <style>
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #f6f8fb; color: #06111f; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    .card { width: min(560px, calc(100vw - 32px)); background: #fff; border: 1px solid #dfe5ee; border-radius: 28px; box-shadow: 0 24px 80px rgba(15, 23, 42, .14); overflow: hidden; }
    .hero { padding: 28px; background: linear-gradient(135deg, #07111f, #112033); color: #fff; }
    .badge { display: inline-flex; border: 1px solid rgba(110, 231, 183, .36); background: rgba(16, 185, 129, .14); color: #a7f3d0; border-radius: 999px; padding: 6px 10px; font-size: 12px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
    h1 { margin: 18px 0 8px; font-size: 28px; line-height: 1.05; }
    p { margin: 0; color: #667085; line-height: 1.55; }
    .hero p { color: #b9c5d6; }
    form { padding: 28px; display: grid; gap: 18px; }
    label { display: grid; gap: 8px; font-weight: 800; }
    input { width: 100%; box-sizing: border-box; border: 1px solid #cfd7e3; border-radius: 16px; padding: 14px 16px; font: inherit; }
    button { border: 0; border-radius: 16px; padding: 14px 18px; background: #05070d; color: #fff; font: inherit; font-weight: 900; cursor: pointer; }
    .scopes { border: 1px solid #edf0f5; border-radius: 16px; padding: 14px 16px; background: #fafbfe; }
    .scopes strong { display: block; margin-bottom: 8px; }
    ul { margin: 0; padding-left: 18px; color: #475467; }
    .error { padding: 12px 14px; border-radius: 14px; background: #fff1f2; color: #be123c; font-weight: 800; }
    .note { font-size: 13px; }
  </style>
</head>
<body>
  <main class="card">
    <section class="hero">
      <span class="badge">Secure MCP access</span>
      <h1>Connect ${escapeHtml(input.clientName)} to PromptPulse</h1>
      <p>Approve read-only access to your PromptPulse workspace data.</p>
    </section>
    <form method="post" action="${escapeHtml(input.action)}">
      ${hidden}
      ${error}
      <div class="scopes">
        <strong>Requested read scopes</strong>
        <ul>${scopes}</ul>
      </div>
      <label>
        Existing PromptPulse MCP token
        <input name="mcp_token" type="password" autocomplete="off" placeholder="pp_mcp_..." required />
      </label>
      <p class="note">For this first OAuth bridge, paste the MCP token you generated in PromptPulse. It proves this OAuth grant belongs to your account. We store only hashed OAuth tokens.</p>
      <button type="submit">Approve connector</button>
    </form>
  </main>
</body>
</html>`
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}
