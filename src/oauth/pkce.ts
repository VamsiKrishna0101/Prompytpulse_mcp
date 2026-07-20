import crypto from "node:crypto"

export function verifyPkce(input: {
  verifier?: string | null
  challenge?: string | null
  method?: string | null
}) {
  if (!input.challenge) return true
  if (!input.verifier) return false

  const method = (input.method || "plain").toUpperCase()
  if (method === "S256") {
    const digest = crypto.createHash("sha256").update(input.verifier).digest("base64url")
    return timingSafeEqual(digest, input.challenge)
  }

  if (method === "PLAIN") {
    return timingSafeEqual(input.verifier, input.challenge)
  }

  return false
}

function timingSafeEqual(a: string, b: string) {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  if (left.length !== right.length) return false
  return crypto.timingSafeEqual(left, right)
}
