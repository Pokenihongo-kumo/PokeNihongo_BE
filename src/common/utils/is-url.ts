// An absolute URL the WHATWG parser accepts (http://, https://, gs://...)
export function isUrl(value: string): boolean {
  try {
    new URL(value)
    return true
  } catch {
    return false
  }
}
