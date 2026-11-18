import * as keys from './message-keys'
import { enMessages } from './messages/en'
import { jaMessages } from './messages/ja'
import { viMessages } from './messages/vi'

// Every key in message-keys has a text in vi, en and ja. A key pointing at a
// name the dictionaries do not have goes out raw (seen on the battle socket),
// and one sitting under another group falls back to vi (seen on season
// rewards).
describe('message keys', () => {
  const values = new Set<string>()
  for (const group of Object.values(keys)) {
    if (!group || typeof group !== 'object') continue
    for (const value of Object.values(group)) {
      if (typeof value === 'string' && /^[a-z_]+\.[A-Za-z_0-9]+$/.test(value))
        values.add(value)
    }
  }
  const textOf = (dictionary: object, key: string) =>
    key
      .split('.')
      .reduce<unknown>(
        (node, part) =>
          node && typeof node === 'object' ? (node as never)[part] : undefined,
        dictionary
      )

  it.each([
    ['vi', viMessages],
    ['en', enMessages],
    ['ja', jaMessages]
  ])('%s has a text for every key', (_lang, dictionary) => {
    const missing = [...values].filter(
      (key) => typeof textOf(dictionary, key) !== 'string'
    )
    expect(missing).toEqual([])
  })
})
