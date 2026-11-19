import { Injectable } from '@nestjs/common'
import { enMessages } from './messages/en'
import { jaMessages } from './messages/ja'
import { viMessages } from './messages/vi'

@Injectable()
export class I18nService {
  private messages: Record<string, any> = {
    vi: viMessages,
    en: enMessages,
    ja: jaMessages
  }

  constructor() {
    // I18n service initialized with vi, en, ja languages
  }

  // `args` fills `{name}` placeholders, e.g. ('answer.CREATED', 'en', { created: 2 })
  translate(
    key: string,
    lang: string = 'vi',
    args?: Record<string, string | number>
  ): string {
    // Fallback order: requested language -> vi -> key itself
    const languages = [lang, 'vi']

    for (const currentLang of languages) {
      if (this.messages[currentLang]) {
        const translation = this.getNestedValue(this.messages[currentLang], key)
        if (translation) {
          return args ? this.interpolate(translation, args) : translation
        }
      }
    }

    return key
  }

  private interpolate(text: string, args: Record<string, string | number>): string {
    return text.replace(/\{(\w+)\}/g, (match, name: string) =>
      name in args ? String(args[name]) : match
    )
  }

  private getNestedValue(obj: any, key: string): string | null {
    const keys = key.split('.')
    let current = obj

    for (const k of keys) {
      if (current && typeof current === 'object' && k in current) {
        current = current[k]
      } else {
        return null
      }
    }

    return typeof current === 'string' ? current : null
  }
}
