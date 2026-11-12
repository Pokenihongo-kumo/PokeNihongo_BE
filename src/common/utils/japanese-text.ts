// Hiragana, Katakana or CJK ideographs (Kanji) anywhere in the text
const JAPANESE = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/

export function hasJapaneseText(text: string | null | undefined): boolean {
  return !!text && JAPANESE.test(text)
}
