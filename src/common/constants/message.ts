export const AUTH_MESSAGE = {
  LOGIN_SUCCESS: 'Đăng nhập thành công',
  REGISTER_SUCCESS: 'Đăng ký thành công',
  LOGOUT_SUCCESS: 'Đăng xuất thành công',
  FORGOT_PASSWORD_SUCCESS: 'Đặt lại mật khẩu thành công',
  UPDATE_PROFILE_SUCCESS: 'Cập nhật thông tin cá nhân thành công',
  GET_PROFILE_SUCCESS: 'Lấy thông tin cá nhân thành công',
  PHONE_IS_INVALID: 'Số điện thoại không hợp lệ',
  NAME_IS_REQUIRED: 'Tên không được để trống',
  REFRESH_TOKEN_SUCCESS: 'Làm mới token thành công',
  INVALID_OTP: 'Mã OTP không hợp lệ hoặc hết hạn',
  OTP_EXPIRED: 'Mã OTP đã hết hạn',
  FAILED_TO_SEND_OTP: 'Gửi mã OTP thất bại',
  EMAIL_ALREADY_EXISTS: 'Email đã tồn tại',
  NOT_FOUND_EMAIL: 'Không tìm thấy email',
  EMAIL_INACTIVE: 'Email chưa được kích hoạt',
  EMAIL_ACTIVE: 'Email đã được kích hoạt',
  REFRESH_TOKEN_ALREADY_USED: 'Token làm mới đã được sử dụng',
  UNAUTHORIZED_ACCESS: 'Truy cập không được phép',
  ACCOUNT_IS_BANNED: 'Tài khoản đã bị khóa',
  FAILD_TO_GET_GOOGLE_USER_INFO: 'Lấy thông tin người dùng Google thất bại',
  RESET_PASSWORD_SUCCESS: 'Đặt lại mật khẩu thành công',
  SEND_OTP_SUCCESS: 'Gửi mã OTP thành công',
  VERIFY_OTP_FORGOT_PASSWORD_SUCCESS: 'Xác thực OTP thành công',
  CHANGE_PASSWORD_SUCCESS: 'Đổi mật khẩu thành công'
}

export const VOCABULARY_MESSAGE = {
  CREATE_SUCCESS: 'Tạo từ vựng thành công',
  CREATE_FULL_SUCCESS: 'Tạo từ vựng mới thành công với nghĩa và translations',
  CREATE_SAMPLE_SUCCESS: 'Tạo từ vựng mẫu thành công',
  ADD_MEANING_SUCCESS: 'Từ vựng đã tồn tại. Đã thêm nghĩa mới với translations',
  MEANING_ALREADY_EXISTS: 'Nghĩa này đã tồn tại trong hệ thống',
  UPDATE_SUCCESS: 'Cập nhật từ vựng thành công',
  DELETE_SUCCESS: 'Xóa từ vựng thành công',
  GET_SUCCESS: 'Lấy thông tin từ vựng thành công',
  GET_LIST_SUCCESS: 'Lấy danh sách từ vựng thành công',
  GET_STATS_SUCCESS: 'Lấy thống kê từ vựng thành công',
  NOT_FOUND: 'Không tìm thấy từ vựng',
  ALREADY_EXISTS: 'Từ vựng đã tồn tại',
  INVALID_DATA: 'Dữ liệu từ vựng không hợp lệ',
  WORD_JP_REQUIRED: 'Từ tiếng Nhật không được để trống',
  READING_REQUIRED: 'Cách đọc không được để trống',
  WORD_JP_TOO_LONG: 'Từ tiếng Nhật quá dài (tối đa 500 ký tự)',
  READING_TOO_LONG: 'Cách đọc quá dài (tối đa 500 ký tự)',
  IMAGE_URL_INVALID: 'URL hình ảnh không hợp lệ',
  AUDIO_URL_INVALID: 'URL âm thanh không hợp lệ',
  WORD_JP_INVALID_FORMAT:
    'Phải là văn bản tiếng Nhật thuần túy (CHỈ chứa Hiragana, Katakana, hoặc Kanji - không cho phép số hoặc ký tự Latin)',
  READING_INVALID_FORMAT:
    'Phải là văn bản romaji (chỉ chứa chữ cái Latin, số và dấu câu cơ bản)'
}

export const REWARD_MESSAGE = {
  CREATE_SUCCESS: 'Tạo phần thưởng thành công',
  UPDATE_SUCCESS: 'Cập nhật phần thưởng thành công',
  DELETE_SUCCESS: 'Xóa phần thưởng thành công',
  GET_SUCCESS: 'Lấy thông tin phần thưởng thành công',
  GET_LIST_SUCCESS: 'Lấy danh sách phần thưởng thành công',
  NOT_FOUND: 'Không tìm thấy phần thưởng',
  ALREADY_EXISTS: 'Phần thưởng đã tồn tại',
  INVALID_DATA: 'Dữ liệu phần thưởng không hợp lệ',
  NAME_REQUIRED: 'Tên phần thưởng không được để trống'
}

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

export const LEVEL_MESSAGE = {
  CREATE_SUCCESS: 'Tạo cấp độ thành công',
  UPDATE_SUCCESS: 'Cập nhật cấp độ thành công',
  DELETE_SUCCESS: 'Xóa cấp độ thành công',
  GET_SUCCESS: 'Lấy thông tin cấp độ thành công',
  GET_LIST_SUCCESS: 'Lấy danh sách cấp độ thành công',
  NOT_FOUND: 'Không tìm thấy cấp độ',
  ALREADY_EXISTS: 'Cấp độ đã tồn tại',

  INVALID_DATA: 'Dữ liệu cấp độ không hợp lệ',
  LEVEL_NUMBER_REQUIRED: 'Số cấp độ không được để trống',
  LEVEL_NUMBER_MIN: 'Số cấp độ phải lớn hơn hoặc bằng 1',
  REQUIRED_EXP_REQUIRED: 'Kinh nghiệm yêu cầu không được để trống',
  LEVEL_TYPE_REQUIRED: 'Loại cấp độ không được để trống',
  NEXT_LEVEL_ID_REQUIRED: 'ID cấp độ tiếp theo không được để trống',
  REWARD_ID_REQUIRED: 'ID phần thưởng không được để trống',
  CONFLICT_TYPE_NEXT_LEVEL:
    'Cấp độ tiếp theo không hợp lệ (phải cùng loại và số cấp độ phải là số liền kề)'
}

export const ELEMENTAL_TYPE_MESSAGE = {
  CREATE_SUCCESS: 'Tạo loại hệ thành công',
  UPDATE_SUCCESS: 'Cập nhật loại hệ thành công',
  DELETE_SUCCESS: 'Xóa loại hệ thành công',
  GET_SUCCESS: 'Lấy thông tin loại hệ thành công',
  GET_LIST_SUCCESS: 'Lấy danh sách loại hệ thành công',
  NOT_FOUND: 'Không tìm thấy loại hệ',
  ALREADY_EXISTS: 'Loại hệ đã tồn tại',
  INVALID_DATA: 'Dữ liệu loại hệ không hợp lệ',
  TYPE_NAME_REQUIRED: 'Tên loại hệ không được để trống',
  TYPE_NAME_MAX_LENGTH: 'Tên loại hệ quá dài (tối đa 20 ký tự)',
  DISPLAY_NAME_REQUIRED: 'Tên hiển thị không được để trống',
  INVALID_COLOR_HEX: 'Mã màu hex không hợp lệ (ví dụ: #FF0000)'
}

export const TYPE_EFFECTIVENESS_MESSAGE = {
  CREATE_SUCCESS: 'Tạo hiệu quả hệ thành công',
  UPDATE_SUCCESS: 'Cập nhật hiệu quả hệ thành công',
  DELETE_SUCCESS: 'Xóa hiệu quả hệ thành công',
  GET_SUCCESS: 'Lấy thông tin hiệu quả hệ thành công',
  GET_LIST_SUCCESS: 'Lấy danh sách hiệu quả hệ thành công',
  NOT_FOUND: 'Không tìm thấy hiệu quả hệ',
  ALREADY_EXISTS: 'Hiệu quả hệ đã tồn tại',
  INVALID_DATA: 'Dữ liệu hiệu quả hệ không hợp lệ',
  INVALID_MULTIPLIER: 'Multiplier không hợp lệ',
  INVALID_ID: 'ID không hợp lệ',
  ATTACK_TYPE_ID_REQUIRED: 'Attack Type ID không được để trống',
  DEFENSE_TYPE_ID_REQUIRED: 'Defense Type ID không được để trống',
  MULTIPLIER_REQUIRED: 'Multiplier không được để trống',
  MULTIPLIER_MIN: 'Multiplier phải lớn hơn 0',
  MULTIPLIER_MAX: 'Multiplier phải nhỏ hơn hoặc bằng 10',
  CONFLICT_ATTACK_DEFENSE_TYPE: 'Attack Type và Defense Type không được giống nhau'
}

export const POKEMON_MESSAGE = {
  CREATE_SUCCESS: 'Tạo Pokemon thành công',
  UPDATE_SUCCESS: 'Cập nhật Pokemon thành công',
  DELETE_SUCCESS: 'Xóa Pokemon thành công',
  GET_LIST_SUCCESS: 'Lấy danh sách Pokemon thành công',
  GET_DETAIL_SUCCESS: 'Lấy thông tin Pokemon thành công',
  INVALID_ID: 'ID Pokemon không hợp lệ',
  NOT_FOUND: 'Không tìm thấy Pokemon',
  ALREADY_EXISTS: 'Pokemon đã tồn tại',
  POKEDEX_NUMBER_REQUIRED: 'Pokedex number không được để trống',
  NAME_JP_REQUIRED: 'Tên tiếng Nhật không được để trống',
  ASSIGN_TYPES_SUCCESS: 'Gán types cho Pokemon thành công'
}

export const USER_POKEMON_MESSAGE = {
  CREATE_SUCCESS: 'Tạo User Pokemon thành công',
  UPDATE_SUCCESS: 'Cập nhật User Pokemon thành công',
  DELETE_SUCCESS: 'Xóa User Pokemon thành công',
  GET_LIST_SUCCESS: 'Lấy danh sách User Pokemon thành công',
  GET_DETAIL_SUCCESS: 'Lấy thông tin User Pokemon thành công',
  INVALID_ID: 'ID User Pokemon không hợp lệ',
  NOT_FOUND: 'Không tìm thấy User Pokemon',
  NICKNAME_ALREADY_EXISTS: 'Nickname đã tồn tại',
  ERROR_INIT_LEVEL: 'Lỗi khi khởi tạo level cho User Pokemon',
  INVALID_ACCESS_POKEMON: 'Bạn không có quyền thao tác Pokemon này',
  INVALID_NEXT_POKEMON: 'Pokemon này không thể tiến hóa thành Pokemon đã chọn',
  CANNOT_EVOLVE: 'Pokemon này không thể tiến hóa thêm nữa',
  USER_HAS_POKEMON: 'Người dùng đã có Pokemon này'
}

export const USER_MESSAGE = {
  CREATE_SUCCESS: 'Tạo người dùng thành công',
  UPDATE_SUCCESS: 'Cập nhật người dùng thành công',
  DELETE_SUCCESS: 'Xóa người dùng thành công',
  GET_LIST_SUCCESS: 'Lấy danh sách người dùng thành công',
  GET_DETAIL_SUCCESS: 'Lấy thông tin người dùng thành công',
  INVALID_DATA: 'Dữ liệu người dùng không hợp lệ',
  NOT_FOUND: 'Không tìm thấy người dùng',
  EMAIL_ALREADY_EXISTS: 'Email đã tồn tại',
  INVALID_EMAIL: 'Email không hợp lệ',
  NAME_REQUIRED: 'Tên không được để trống',
  PASSWORD_MIN: 'Mật khẩu phải có ít nhất 6 ký tự',
  PHONE_INVALID: 'Số điện thoại không hợp lệ',
  SET_MAIN_POKEMON_SUCCESS: 'Đặt Pokemon chính thành công',
  HAS_NOT_JOINED_SEASON: 'Bạn chưa tham gia mùa giải hiện tại'
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
