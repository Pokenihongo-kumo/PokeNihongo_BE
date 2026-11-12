// Hiragana, Katakana or CJK ideographs (Kanji) anywhere in the text
const JAPANESE = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/

export function hasJapaneseText(text: string | null | undefined): boolean {
  return !!text && JAPANESE.test(text)
}

// CJK ideograph blocks: unified (+ extensions A to F) and compatibility
const KANJI_RANGES: [number, number][] = [
  [0x4e00, 0x9fff],
  [0x3400, 0x4dbf],
  [0x20000, 0x2a6df],
  [0x2a700, 0x2b73f],
  [0x2b740, 0x2b81f],
  [0x2b820, 0x2ceaf],
  [0xf900, 0xfaff],
  [0x2f800, 0x2fa1f]
]

// Exactly one kanji. Counts code points, so a kanji outside the BMP (two UTF-16
// units) is one character
export function isKanjiCharacter(text: string | null | undefined): boolean {
  if (!text) return false
  const chars = [...text]
  if (chars.length !== 1) return false
  const code = chars[0].codePointAt(0)!
  return KANJI_RANGES.some(([from, to]) => code >= from && code <= to)
}
