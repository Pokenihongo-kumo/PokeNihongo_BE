import { I18nService } from './i18n.service'

describe('I18nService.translate', () => {
  const i18n = new I18nService()

  it('returns the message for the language, falls back to vi, then to the key', () => {
    expect(i18n.translate('grammar.NOT_FOUND', 'en')).toBe('Grammar not found')
    expect(i18n.translate('grammar.NOT_FOUND', 'xx')).toBe('Ngữ pháp không tồn tại')
    expect(i18n.translate('no.such.key', 'en')).toBe('no.such.key')
  })

  it('fills {name} placeholders from args and leaves unknown ones as they are', () => {
    const fill = i18n['interpolate'].bind(i18n)
    expect(fill('Created {created}, updated {updated}', { created: 2, updated: 0 })).toBe(
      'Created 2, updated 0'
    )
    expect(fill('Left {other}', { created: 1 })).toBe('Left {other}')
  })

  it('without args the message is returned untouched', () => {
    expect(i18n.translate('no.such.{key}', 'en')).toBe('no.such.{key}')
  })
})
