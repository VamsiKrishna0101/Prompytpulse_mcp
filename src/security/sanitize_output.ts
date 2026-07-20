const MAX_STRING_LENGTH = 2200
const MAX_ARRAY_LENGTH = 100
const MAX_OBJECT_KEYS = 80

export function sanitizeToolOutput(value: unknown): unknown {
  if (value == null) return value
  if (typeof value === "string") return sanitizeString(value)
  if (typeof value === "number" || typeof value === "boolean") return value
  if (value instanceof Date) return value.toISOString()
  if (Array.isArray(value)) return value.slice(0, MAX_ARRAY_LENGTH).map(sanitizeToolOutput)
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).slice(0, MAX_OBJECT_KEYS)
    return Object.fromEntries(entries.map(([key, item]) => [key, sanitizeToolOutput(item)]))
  }
  return String(value)
}

function sanitizeString(value: string) {
  return value
    .replace(/\u0000/g, "")
    .replace(/\s+\n/g, "\n")
    .slice(0, MAX_STRING_LENGTH)
}
