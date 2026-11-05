import { resolveLanguage } from './resolve-language'

describe('resolveLanguage', () => {
  it('picks the supported language with the highest quality', () => {
    expect(resolveLanguage('en-US,en;q=0.9,vi;q=0.8')).toBe('en')
    expect(resolveLanguage('fr;q=1,ja;q=0.5,vi;q=0.4')).toBe('ja')
    expect(resolveLanguage('vi;q=0.2,en;q=0.9')).toBe('en')
  })

  it('falls back to vi', () => {
    expect(resolveLanguage(undefined)).toBe('vi')
    expect(resolveLanguage('')).toBe('vi')
    expect(resolveLanguage('fr,de')).toBe('vi')
  })
})
