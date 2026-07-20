import { sanitizeToolOutput } from "../security/sanitize_output"

export function toolSuccess(data: unknown) {
  const structuredContent = sanitizeToolOutput(data)
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(structuredContent, null, 2),
      },
    ],
    structuredContent,
    isError: false,
  }
}

export function toolError(message: string, code: string) {
  const structuredContent = { error: code, message }
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(structuredContent, null, 2),
      },
    ],
    structuredContent,
    isError: true,
  }
}
