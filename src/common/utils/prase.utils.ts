/**
 * Parse label from composite string format
 * Supports key-value format: "vi:label_vi+en:label_en+jp:label_jp"
 *
 * @param raw - The composite string to parse
 * @param lang - The target language code (vi, en, ja, jp)
 * @returns The parsed label for the specified language, or the original string if format is not recognized
 */
export function pickLabelFromComposite(raw: string, lang: string): string {
  if (!raw) return ''

  // Format: "vi:label_vi+en:label_en+jp:label_jp"
  // Kiểm tra format có dấu '+' (key:value format)
  if (raw.includes('+')) {
    const parts = raw.split('+').map((p) => p.trim())
    const map: Record<string, string> = {}
    for (const part of parts) {
      const idx = part.indexOf(':')
      if (idx > -1) {
        const k = part.slice(0, idx).trim()
        const v = part.slice(idx + 1).trim()
        if (k) map[k] = v
      }
    }
    if (Object.keys(map).length === 0) {
      const first = raw.split('+')[0]?.trim() ?? ''
      return first
    }
    if (map[lang]) return map[lang]
    if (map['vi'] && lang.startsWith('vi')) return map['vi']
    if (map['en'] && lang.startsWith('en')) return map['en']
    return map['jp'] ?? raw.replace(/\b(jp|vi|en)\s*:/g, '').trim()
  }

  // Nếu không có dấu '+', kiểm tra xem có format "lang:value" không
  const colonIdx = raw.indexOf(':')
  if (colonIdx > -1) {
    const key = raw.slice(0, colonIdx).trim().toLowerCase()
    const value = raw.slice(colonIdx + 1).trim()
    // Nếu key là 'jp', 'ja' và lang là 'jp' hoặc 'ja', trả về value (bỏ prefix)
    if ((key === 'jp' || key === 'ja') && (lang === 'jp' || lang === 'ja')) {
      return value
    }
    // Nếu key khớp với lang, trả về value
    if (
      key === lang ||
      (key === 'vi' && lang.startsWith('vi')) ||
      (key === 'en' && lang.startsWith('en'))
    ) {
      return value
    }
    // Nếu không khớp, trả về value (bỏ prefix) để tránh hiển thị "jp:..."
    return value
  }

  // Nếu không có dấu ':' và '+', trả về nguyên string
  return raw.trim()
}
