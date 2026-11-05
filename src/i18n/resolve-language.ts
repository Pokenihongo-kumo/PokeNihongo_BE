export const SUPPORTED_LANGUAGES = ['vi', 'en', 'ja'] as const
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]
export const DEFAULT_LANGUAGE: SupportedLanguage = 'vi'

/**
 * Picks the supported language with the highest quality from an
 * Accept-Language header ("en-US,en;q=0.9,vi;q=0.8" -> "en"); default vi.
 */
export function resolveLanguage(acceptLanguage?: string | string[]): SupportedLanguage {
  const header = Array.isArray(acceptLanguage) ? acceptLanguage.join(',') : acceptLanguage
  if (!header) return DEFAULT_LANGUAGE
  const languages = header
    .split(',')
    .map((part) => {
      const [locale, q] = part.trim().split(';q=')
      return { locale: locale.split('-')[0], quality: q ? parseFloat(q) : 1.0 }
    })
    .sort((a, b) => b.quality - a.quality)
  const match = languages.find((l) =>
    (SUPPORTED_LANGUAGES as readonly string[]).includes(l.locale)
  )
  return (match?.locale as SupportedLanguage) ?? DEFAULT_LANGUAGE
}
