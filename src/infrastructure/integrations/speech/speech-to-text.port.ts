// Recognizing speech (integration-ports plan I4). SPEECH_DRIVER picks the adapter.
export interface RecognizeSpeechInput {
  audio: Buffer
  config: {
    encoding: string
    sampleRateHertz: number
    languageCode: string
    enableAutomaticPunctuation: boolean
    enableWordTimeOffsets: boolean
    model: string
    speechContexts?: Array<{ phrases: string[]; boost?: number }>
  }
}

export interface RecognizedSpeech {
  transcript: string
  confidence: number
}

export abstract class SpeechToText {
  // false when the provider client could not be set up (no credentials)
  abstract isAvailable(): boolean
  // the best alternative of the first result, or null when nothing was heard
  abstract recognize(input: RecognizeSpeechInput): Promise<RecognizedSpeech | null>
}
