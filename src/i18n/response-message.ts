import { SetMetadata } from '@nestjs/common'
import * as keys from './message-keys'

type Groups = typeof keys
// Every key of message-keys ('vocabulary.GET_SUCCESS', ...): a typo fails tsc
export type MessageKey = { [G in keyof Groups]: Groups[G][keyof Groups[G]] }[keyof Groups]
export type MessageArgs = Record<string, string | number>

export const RESPONSE_MESSAGE = 'response_message'

// A handler with a fixed success message: it returns its data, and
// TransformInterceptor answers { message: <translated key>, data }.
export const ResponseMessage = (key: MessageKey) => SetMetadata(RESPONSE_MESSAGE, key)

// A message the handler picks (or fills with args): { message: msg(KEY, args), data }.
// TransformInterceptor translates it in the request's language.
export class TranslatableMessage {
  constructor(
    readonly key: MessageKey,
    readonly args?: MessageArgs
  ) {}
}

export const msg = (key: MessageKey, args?: MessageArgs) =>
  new TranslatableMessage(key, args)
