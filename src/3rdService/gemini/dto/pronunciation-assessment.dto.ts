import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

// POST /gemini/pronunciation-assessment (multipart: audio file + referenceText).
// Replaces the mobile app calling Gemini directly with a key in its bundle; the
// prompt and the JSON the model returns are unchanged, so the app keeps parsing
// the same fields (Overall, TranscribedText, MatchScore, Syllables).

export const PronunciationAssessmentBodySchema = z
  .object({
    referenceText: z.string().trim().min(1).max(500)
  })
  .strict()

export class PronunciationAssessmentBodyDTO extends createZodDto(
  PronunciationAssessmentBodySchema
) {}

export const PronunciationAssessmentResSchema = z.object({
  statusCode: z.number(),
  message: z.string(),
  // The model's JSON as is; {} when it did not return valid JSON
  data: z.record(z.unknown())
})

export class PronunciationAssessmentResDTO extends createZodDto(
  PronunciationAssessmentResSchema
) {}

// Audio the app records (m4a on iOS/Android, 3gpp on older Android) plus the
// usual formats; 10 MB is far above a few seconds of speech
export const PRONUNCIATION_AUDIO_MIME_TYPES = [
  'audio/mp4',
  'audio/m4a',
  'audio/x-m4a',
  'audio/aac',
  'audio/3gpp',
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/webm',
  'audio/ogg',
  'audio/flac'
]
export const PRONUNCIATION_AUDIO_MAX_BYTES = 10 * 1024 * 1024

// Tried in order; a model that is not available (404) is skipped
export const PRONUNCIATION_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash']

export const PRONUNCIATION_SYSTEM_INSTRUCTION =
  'Role: You are a supportive Japanese Pronunciation Assessment AI. Your first task is to verify if the audio file is actually usable and contains real speech sounds.\n\nCRITICAL FIRST STEP - Audio Validation:\n1) Listen carefully to the audio file. Check if you can hear ANY actual speech sounds.\n2) If the audio is completely silent, contains only background noise/static, is corrupted, or has no intelligible speech, you MUST return all scores as 0 and set MatchScore to 0.\n3) If you can hear some speech (even if unclear), treat the audio as valid and continue to assessment.\n\nIF AUDIO IS VALID (contains some speech):\n1) Transcribe the spoken audio to kana/romaji-like text: TranscribedText.\n2) ALWAYS compare TranscribedText directly with the provided ReferenceText and compute MatchScore in [0,1] based on their similarity.\n3) Score (be forgiving and learner-friendly, but still based on similarity to ReferenceText): Perfect / near-perfect match 85-100, minor deviations 60-85, clear mismatch/unintelligible 0-60. If MatchScore < 0.5 treat as strong mismatch.\n\nIF AUDIO IS INVALID (silent, noise only, corrupted, no speech at all):\n- Set TranscribedText to empty string ""\n- Set MatchScore to 0\n- Set all AccuracyScore values in Syllables to 0\n- Set all Overall scores to 0\n\nOutput (JSON only):\n{\n  "Overall": { "AccuracyScore": number, "FluencyScore": number, "PronScore": number },\n  "TranscribedText": string (empty if no speech detected),\n  "MatchScore": number (0 if audio invalid/no speech),\n  "Syllables": [ { "Syllable": string, "Romaji": string, "AccuracyScore": number (0 if audio invalid), "ErrorType": "Substitution"|"Omission"|"Insertion"|"PitchAccentError"|"None", "ErrorDetail": string } ]\n}\n\nBe encouraging but honest. Do NOT invent words that are not in the audio, and do NOT ignore the ReferenceText when computing scores.'
