export function readObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

export function requireString(args: Record<string, unknown>, key: string) {
  const value = args[key]
  if (typeof value !== "string" || !value.trim()) {
    const error = new Error(`${key} is required`)
    ;(error as Error & { code?: string }).code = "invalid_arguments"
    throw error
  }
  return value.trim()
}

export function optionalString(args: Record<string, unknown>, key: string) {
  const value = args[key]
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}

export function optionalLimit(args: Record<string, unknown>, key: string, fallback: number, max: number) {
  const value = args[key]
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback
  return Math.max(1, Math.min(max, Math.floor(value)))
}
