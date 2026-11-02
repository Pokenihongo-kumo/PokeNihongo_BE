// Reduces a response body to its contract: object keys (sorted) and value
// types, keeping the real `statusCode`/`error` values and the `message`
// (string or array) because clients read them. Volatile values (ids, dates,
// tokens) become their type, so snapshots only change when the shape does.
export function responseShape(value: unknown, key?: string): unknown {
  if (key === 'statusCode' || key === 'error') return value
  if (key === 'message') {
    return Array.isArray(value) ? value.map((v) => responseShape(v)) : value
  }
  if (value === null) return 'null'
  if (Array.isArray(value)) {
    return value.length ? [responseShape(value[0])] : []
  }
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value as object)
        .sort()
        .map((k) => [k, responseShape((value as Record<string, unknown>)[k], k)])
    )
  }
  return typeof value
}
