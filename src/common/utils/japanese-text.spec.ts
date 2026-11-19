import { hasJapaneseText, isKanjiCharacter } from './japanese-text'

describe('japanese-text', () => {
  it('isKanjiCharacter: one kanji, including outside the BMP', () => {
    expect(isKanjiCharacter('龘')).toBe(true)
    expect(isKanjiCharacter('𠀋')).toBe(true) // U+2000B, two UTF-16 units
    expect(isKanjiCharacter('漢字')).toBe(false)
    expect(isKanjiCharacter('あ')).toBe(false)
  })

  it('isKanjiCharacter rejects the letters the old regex let through', () => {
    // The old range 'u20000-u2A6DF' read as U+2000, '0' and the range '0'..U+2A6D
    for (const c of ['đ', 'ă', 'Ω', 'Ж', 'a', '1'])
      expect(isKanjiCharacter(c)).toBe(false)
  })

  it('hasJapaneseText: kana or kanji anywhere', () => {
    expect(hasJapaneseText('I am 学生')).toBe(true)
    expect(hasJapaneseText('Câu hỏi')).toBe(false)
  })
})
