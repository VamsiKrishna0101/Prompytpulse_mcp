export type JsonRpcRequest = {
  jsonrpc?: string
  id?: string | number | null
  method?: string
  params?: unknown
}

export function jsonRpcResult(id: JsonRpcRequest["id"], result: unknown) {
  return {
    jsonrpc: "2.0",
    id: id ?? null,
    result,
  }
}

export function jsonRpcError(id: JsonRpcRequest["id"], code: number, message: string, data?: unknown) {
  return {
    jsonrpc: "2.0",
    id: id ?? null,
    error: {
      code,
      message,
      ...(data ? { data } : {}),
    },
  }
}
