// Speaking text (integration-ports plan I4). SPEECH_DRIVER picks the adapter.
export interface SynthesizeSpeechInput {
  text: string
  languageCode: string
  voiceName: string
  audioEncoding: 'MP3' | 'LINEAR16' | 'OGG_OPUS'
  speakingRate: number
  pitch: number
  volumeGainDb: number
}

export interface VoiceInfo {
  name?: string | null
  ssmlGender?: string | number | null
  naturalSampleRateHertz?: number | null
  languageCodes?: string[] | null
}

export abstract class TextToSpeech {
  abstract isAvailable(): boolean
  // the audio bytes; rejects when the provider returned none
  abstract synthesize(input: SynthesizeSpeechInput): Promise<Buffer>
  abstract listVoices(languageCode: string): Promise<VoiceInfo[]>
}
