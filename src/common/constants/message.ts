export const SYSTEM_MESSAGE = {
  NOT_FOUND: 'Không tìm thấy bản ghi',
  INVALID_NEW_PASSWORD_CONFIRM_PASSWORD: 'Mật khẩu mới và mật khẩu xác nhận không khớp',
  INVALID_NEW_PASSWORD_CONFIRM_PASSWORD_REGISTER:
    'Mật khẩu và mật khẩu xác nhận không khớp',
  INVALID_PASSWORD: 'Sai mật khẩu',
  INVALID_OLD_PASSWORD: 'Mật khẩu cũ không đúng',
  SESSION_EXPIRED: 'Phiên đã hết hạn, vui lòng đăng nhập lại',
  UNAUTHTHORIZED: 'Không có quyền truy cập'
}

export const Error = {
  // Kaiwa Gateway Errors
  MISSING_USER_ID: 'Missing userId',
  GEMINI_API_NOT_INITIALIZED: 'Gemini API not initialized',
  GEMINI_API_KEY_NOT_SET: 'Please set GEMINI_API_KEY in .env file',
  SPEECH_RECOGNITION_FAILED: 'Không thể nhận diện giọng nói. Vui lòng thử lại.',
  SPEECH_RECOGNITION_SUGGESTION: 'Hãy nói rõ ràng hơn hoặc kiểm tra microphone',
  SPEECH_CONVERSION_ERROR: 'Lỗi chuyển đổi âm thanh',
  CHECK_MICROPHONE_SUGGESTION: 'Vui lòng kiểm tra microphone và thử lại',
  NOT_JAPANESE_LANGUAGE: 'Vui lòng nói bằng tiếng Nhật',
  NOT_JAPANESE_LANGUAGE_SUGGESTION:
    'Kaiwa chỉ hỗ trợ hội thoại bằng tiếng Nhật. Vui lòng nói lại bằng tiếng Nhật.',
  AI_ERROR: 'Lỗi AI',
  CHECK_GEMINI_API_KEY_SUGGESTION: 'Vui lòng kiểm tra GEMINI_API_KEY và thử lại',
  AUDIO_RESPONSE_FAILED: 'Không thể tạo audio response',
  AUDIO_NOT_AVAILABLE_SUGGESTION: 'Text response đã được gửi, nhưng audio không khả dụng',
  PROCESS_AUDIO_FAILED: 'Failed to process audio',
  LEAVE_ROOM_FAILED: 'Failed to leave room',
  AI_KAIWA_FEATURE_REQUIRED: 'Vui lòng nâng cấp gói để sử dụng AI Kaiwa'
}
