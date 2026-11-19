// Speech defaults and validation. Google clients are built by
// infrastructure/integrations/speech/google-credentials.ts (one factory).

export const SPEECH_CONFIG = {
  // Default audio configuration
  DEFAULT_LANGUAGE_CODE: 'ja-JP',
  DEFAULT_SAMPLE_RATE: 16000,
  DEFAULT_ENCODING: 'LINEAR16' as const,
  DEFAULT_MODEL: 'default' as const,
  DEFAULT_ENABLE_PUNCTUATION: true,
  DEFAULT_ENABLE_WORD_TIME_OFFSETS: false,

  // Audio format limits
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_DURATION_SECONDS: 60, // 1 minute for synchronous
  MAX_STREAMING_DURATION_SECONDS: 300, // 5 minutes for streaming

  // Supported sample rates
  SUPPORTED_SAMPLE_RATES: [8000, 16000, 22050, 44100, 48000],

  // Supported encodings
  SUPPORTED_ENCODINGS: [
    'LINEAR16',
    'FLAC',
    'MULAW',
    'AMR',
    'AMR_WB',
    'OGG_OPUS',
    'SPEEX_WITH_HEADER_BYTE'
  ] as const,

  // Supported models
  SUPPORTED_MODELS: [
    'default',
    'latest_long',
    'latest_short',
    'phone_call',
    'video',
    'command_and_search'
  ] as const,

  // Supported languages (commonly used)
  SUPPORTED_LANGUAGES: [
    // Japanese
    'ja-JP',
    'ja-JP-Wavenet-A',
    'ja-JP-Wavenet-B',
    'ja-JP-Wavenet-C',
    'ja-JP-Wavenet-D',

    // English
    'en-US',
    'en-GB',
    'en-US-Wavenet-A',
    'en-US-Wavenet-B',
    'en-US-Wavenet-C',
    'en-US-Wavenet-D',

    // Korean
    'ko-KR',
    'ko-KR-Wavenet-A',
    'ko-KR-Wavenet-B',
    'ko-KR-Wavenet-C',
    'ko-KR-Wavenet-D',

    // Chinese
    'zh-CN',
    'zh-TW',
    'zh-CN-Wavenet-A',
    'zh-CN-Wavenet-B',
    'zh-CN-Wavenet-C',
    'zh-CN-Wavenet-D'
  ],

  // Request timeouts
  REQUEST_TIMEOUT: 60000, // 60 seconds
  STREAMING_TIMEOUT: 300000, // 5 minutes

  // Error messages
  ERROR_MESSAGES: {
    INVALID_CREDENTIALS: 'Google Cloud credentials không hợp lệ',
    MISSING_AUDIO_FILE: 'Không có file âm thanh được upload',
    INVALID_AUDIO_FORMAT: 'Định dạng file âm thanh không hợp lệ',
    FILE_TOO_LARGE: 'File âm thanh quá lớn (tối đa 10MB)',
    NO_SPEECH_RESULTS: 'Không tìm thấy kết quả nhận dạng giọng nói',
    SPEECH_RECOGNITION_FAILED: 'Nhận dạng giọng nói thất bại',
    UNSUPPORTED_LANGUAGE: 'Ngôn ngữ không được hỗ trợ',
    UNSUPPORTED_ENCODING: 'Định dạng mã hóa không được hỗ trợ',
    UNSUPPORTED_MODEL: 'Mô hình không được hỗ trợ'
  },

  // Success messages
  SUCCESS_MESSAGES: {
    SPEECH_TO_TEXT_SUCCESS: 'Chuyển đổi âm thanh thành văn bản thành công',
    LANGUAGES_RETRIEVED_SUCCESS: 'Lấy danh sách ngôn ngữ thành công'
  }
}

// Validation functions
export const validateAudioFormat = (audioBuffer: Buffer, encoding: string): boolean => {
  if (audioBuffer.length === 0) {
    return false
  }

  // Check file size
  if (audioBuffer.length > SPEECH_CONFIG.MAX_FILE_SIZE) {
    return false
  }

  // For LINEAR16, check if buffer size is reasonable
  if (encoding === 'LINEAR16') {
    // Minimum 1 second of audio (16kHz * 2 bytes * 1 second)
    const minSize = 16000 * 2
    return audioBuffer.length >= minSize
  }

  return true
}

export const validateLanguageCode = (languageCode: string): boolean => {
  return SPEECH_CONFIG.SUPPORTED_LANGUAGES.includes(languageCode)
}

export const validateEncoding = (encoding: string): boolean => {
  return SPEECH_CONFIG.SUPPORTED_ENCODINGS.includes(encoding as any)
}

export const validateModel = (model: string): boolean => {
  return SPEECH_CONFIG.SUPPORTED_MODELS.includes(model as any)
}

export const validateSampleRate = (sampleRate: number): boolean => {
  return SPEECH_CONFIG.SUPPORTED_SAMPLE_RATES.includes(sampleRate)
}
