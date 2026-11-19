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

export const TEST_SET_MESSAGE = {
  CREATE_SUCCESS: 'Tạo bộ đề thành công',
  UPDATE_SUCCESS: 'Cập nhật bộ đề thành công',
  DELETE_SUCCESS: 'Xóa bộ đề thành công',
  GET_SUCCESS: 'Lấy thông tin bộ đề thành công',
  GET_LIST_SUCCESS: 'Lấy danh sách bộ đề thành công',
  NOT_FOUND: 'Không tìm thấy bộ đề',
  ALREADY_EXISTS: 'Bộ đề đã tồn tại',
  INVALID_DATA: 'Dữ liệu bộ đề không hợp lệ',
  NAME_REQUIRED: 'Tên bộ đề không được để trống',
  NAME_TOO_LONG: 'Tên bộ đề quá dài (tối đa 200 ký tự)',
  TEST_TYPE_REQUIRED: 'Loại đề thi không được để trống',
  TEST_TYPE_TOO_LONG: 'Loại đề thi quá dài (tối đa 50 ký tự)',
  AUDIO_URL_INVALID: 'URL âm thanh không hợp lệ',
  PRICE_INVALID: 'Giá bộ đề không hợp lệ',
  LEVEL_INVALID: 'Cấp độ JLPT không hợp lệ (1-5)',
  PERMISSION_DENIED: 'Bạn không có quyền thực hiện hành động này',
  CANNOT_CHANGE_TEST_TYPE_GENERAL_MULTIPLE:
    'Không thể thay đổi testType từ GENERAL sang loại khác khi testSet đang chứa nhiều loại câu hỏi khác nhau',
  CANNOT_CHANGE_TEST_TYPE_SPECIFIC:
    'Không thể thay đổi testType. Chỉ có thể thay đổi thành cùng type hoặc GENERAL',
  CANNOT_CHANGE_TEST_TYPE_GENERAL_SINGLE:
    'Không thể thay đổi testType từ GENERAL sang type khác. TestSet hiện đang chứa câu hỏi loại',
  CANNOT_CHANGE_LEVELN_HAS_QUESTIONS:
    'Không thể thay đổi levelN khi testSet đã có câu hỏi, trừ khi testType là GENERAL'
}

export const TEST_MESSAGE = {
  CREATE_SUCCESS: 'Tạo bài test thành công',
  UPDATE_SUCCESS: 'Cập nhật bài test thành công',
  DELETE_SUCCESS: 'Xóa bài test thành công',
  GET_SUCCESS: 'Lấy thông tin bài test thành công',
  GET_LIST_SUCCESS: 'Lấy danh sách bài test thành công',
  NOT_FOUND: 'Không tìm thấy bài test',
  ALREADY_EXISTS: 'Bài test đã tồn tại',
  INVALID_DATA: 'Dữ liệu bài test không hợp lệ',
  NAME_REQUIRED: 'Tên bài test không được để trống',
  NAME_TOO_LONG: 'Tên bài test quá dài (tối đa 200 ký tự)',
  TEST_TYPE_REQUIRED: 'Loại đề thi không được để trống',
  PRICE_INVALID: 'Giá bài test không hợp lệ',
  PERMISSION_DENIED: 'Bạn không có quyền thực hiện hành động này',
  ADD_TESTSETS_SUCCESS: 'Thêm TestSet vào Test thành công',
  REMOVE_TESTSETS_SUCCESS: 'Xóa TestSet khỏi Test thành công',
  DELETE_ALL_TESTSETS_SUCCESS: 'Xóa tất cả TestSet khỏi Test thành công'
}

export const USER_TEST_MESSAGE = {
  CREATE_SUCCESS: 'Tạo UserTest thành công',
  UPDATE_SUCCESS: 'Cập nhật UserTest thành công',
  DELETE_SUCCESS: 'Xóa UserTest thành công',
  GET_SUCCESS: 'Lấy thông tin UserTest thành công',
  GET_LIST_SUCCESS: 'Lấy danh sách UserTest thành công',
  NOT_FOUND: 'Không tìm thấy UserTest',
  ALREADY_EXISTS: 'UserTest đã tồn tại'
}

export const QUESTION_BANK_MESSAGE = {
  CREATE_SUCCESS: 'Tạo câu hỏi thành công',
  UPDATE_SUCCESS: 'Cập nhật câu hỏi thành công',
  DELETE_SUCCESS: 'Xóa câu hỏi thành công',
  GET_SUCCESS: 'Lấy thông tin câu hỏi thành công',
  GET_LIST_SUCCESS: 'Lấy danh sách câu hỏi thành công',
  NOT_FOUND: 'Không tìm thấy câu hỏi',
  ALREADY_EXISTS: 'Câu hỏi đã tồn tại',
  INVALID_DATA: 'Dữ liệu câu hỏi không hợp lệ'
}

export const TEST_SET_QUESTIONBANK_MESSAGE = {
  CREATE_SUCCESS: 'Tạo TestSetQuestionBank thành công',
  UPDATE_SUCCESS: 'Cập nhật TestSetQuestionBank thành công',
  DELETE_SUCCESS: 'Xóa TestSetQuestionBank thành công',
  GET_SUCCESS: 'Lấy thông tin TestSetQuestionBank thành công',
  GET_LIST_SUCCESS: 'Lấy danh sách TestSetQuestionBank thành công',
  NOT_FOUND: 'Không tìm thấy TestSetQuestionBank',
  ALREADY_EXISTS: 'TestSetQuestionBank đã tồn tại',
  INVALID_DATA: 'Dữ liệu TestSetQuestionBank không hợp lệ',
  TYPE_INCOMPATIBLE:
    'Loại TestSet và QuestionBank không tương thích. Chỉ có thể liên kết khi TestSet có loại GENERAL hoặc khớp với loại QuestionBank',
  INVALID_TYPE_DATA:
    'Dữ liệu không hợp lệ: TestSet loại "{testsetType}" hoặc QuestionBank loại "{questionType}" không tồn tại',
  UPDATE_QUESTION_ORDER_SUCCESS: 'Cập nhật thứ tự câu hỏi thành công',
  DELETE_BY_TESTSET_SUCCESS: 'Xóa TestSetQuestionBank theo TestSet thành công',
  DELETE_BY_QUESTIONBANK_SUCCESS: 'Xóa TestSetQuestionBank theo QuestionBank thành công'
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

export const KANJI_MESSAGE = {
  CREATE_SUCCESS: 'Tạo kanji thành công',
  CREATE_WITH_READINGS_SUCCESS: 'Tạo Kanji cùng với cách đọc thành công',
  UPDATE_SUCCESS: 'Cập nhật kanji thành công',
  DELETE_SUCCESS: 'Xóa kanji thành công',
  GET_SUCCESS: 'Lấy thông tin kanji thành công',
  GET_LIST_SUCCESS: 'Lấy danh sách kanji thành công',
  NOT_FOUND: 'Không tìm thấy kanji',
  ALREADY_EXISTS: 'Kanji đã tồn tại',
  INVALID_DATA: 'Dữ liệu kanji không hợp lệ',
  CHARACTER_REQUIRED: 'Ký tự kanji không được để trống',
  MEANING_KEY_REQUIRED: 'Key nghĩa không được để trống',
  CHARACTER_INVALID: 'Phải là một ký tự Kanji duy nhất',
  STROKE_COUNT_INVALID: 'Số nét vẽ phải lớn hơn 0 và nhỏ hơn 50',
  JLPT_LEVEL_INVALID: 'Cấp độ JLPT không hợp lệ'
}

export const KANJI_READING_MESSAGE = {
  CREATE_SUCCESS: 'Tạo cách đọc kanji thành công',
  UPDATE_SUCCESS: 'Cập nhật cách đọc kanji thành công',
  DELETE_SUCCESS: 'Xóa cách đọc kanji thành công',
  GET_SUCCESS: 'Lấy thông tin cách đọc kanji thành công',
  GET_LIST_SUCCESS: 'Lấy danh sách cách đọc kanji thành công',
  NOT_FOUND: 'Không tìm thấy cách đọc kanji',
  ALREADY_EXISTS: 'Cách đọc kanji đã tồn tại',
  INVALID_DATA: 'Dữ liệu cách đọc kanji không hợp lệ',
  KANJI_ID_REQUIRED: 'Kanji ID không được để trống',
  READING_TYPE_REQUIRED: 'Loại cách đọc không được để trống',
  READING_REQUIRED: 'Cách đọc không được để trống',
  READING_TYPE_INVALID: 'Loại cách đọc phải là onyomi, kunyomi, nanori, hoặc irregular'
}

export const MEANING_MESSAGE = {
  CREATE_SUCCESS: 'Tạo nghĩa thành công',
  UPDATE_SUCCESS: 'Cập nhật nghĩa thành công',
  DELETE_SUCCESS: 'Xóa nghĩa thành công',
  GET_SUCCESS: 'Lấy thông tin nghĩa thành công',
  GET_LIST_SUCCESS: 'Lấy danh sách nghĩa thành công',
  NOT_FOUND: 'Không tìm thấy nghĩa',
  ALREADY_EXISTS: 'Nghĩa đã tồn tại',
  INVALID_DATA: 'Dữ liệu nghĩa không hợp lệ',
  VOCABULARY_ID_REQUIRED: 'Vocabulary ID không được để trống',
  EXAMPLE_SENTENCE_TOO_LONG: 'Câu ví dụ quá dài (tối đa 1000 ký tự)',
  JAPANESE_TEXT_INVALID: 'Phải là văn bản tiếng Nhật hợp lệ'
}

export const TRANSLATION_MESSAGE = {
  CREATE_SUCCESS: 'Tạo bản dịch thành công',
  UPDATE_SUCCESS: 'Cập nhật bản dịch thành công',
  DELETE_SUCCESS: 'Xóa bản dịch thành công',
  GET_SUCCESS: 'Lấy thông tin bản dịch thành công',
  GET_LIST_SUCCESS: 'Lấy danh sách bản dịch thành công',
  NOT_FOUND: 'Không tìm thấy bản dịch',
  ALREADY_EXISTS: 'Bản dịch đã tồn tại',
  INVALID_DATA: 'Dữ liệu bản dịch không hợp lệ',
  LANGUAGE_CODE_REQUIRED: 'Mã ngôn ngữ không được để trống',
  KEY_REQUIRED: 'Key dịch không được để trống',
  VALUE_REQUIRED: 'Nội dung dịch không được để trống',
  LANGUAGE_CODE_INVALID: 'Mã ngôn ngữ không hợp lệ',
  KEY_INVALID: 'Key dịch không đúng định dạng',
  VALUE_TOO_LONG: 'Nội dung dịch quá dài (tối đa 2000 ký tự)',
  BULK_CREATE_SUCCESS: 'Tạo nhiều bản dịch thành công'
}

export const WORDTYPE_MESSAGE = {
  CREATE_SUCCESS: 'Tạo loại từ thành công',
  UPDATE_SUCCESS: 'Cập nhật loại từ thành công',
  DELETE_SUCCESS: 'Xóa loại từ thành công',
  GET_SUCCESS: 'Lấy thông tin loại từ thành công',
  GET_LIST_SUCCESS: 'Lấy danh sách loại từ thành công',
  NOT_FOUND: 'Không tìm thấy loại từ',
  ALREADY_EXISTS: 'Loại từ đã tồn tại',
  INVALID_DATA: 'Dữ liệu loại từ không hợp lệ',
  TAG_REQUIRED: 'Tag không được để trống',
  TAG_TOO_LONG: 'Tag quá dài (tối đa 50 ký tự)',
  NAME_KEY_INVALID: 'Name key không đúng định dạng'
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

export const LESSON_MESSAGE = {
  CREATE_SUCCESS: 'Tạo bài học thành công',
  UPDATE_SUCCESS: 'Cập nhật bài học thành công',
  DELETE_SUCCESS: 'Xóa bài học thành công',
  GET_BY_ID_SUCCESS: 'Lấy thông tin bài học thành công',
  GET_LIST_SUCCESS: 'Lấy danh sách bài học thành công',
  PUBLISH_SUCCESS: 'Xuất bản bài học thành công',
  UNPUBLISH_SUCCESS: 'Hủy xuất bản bài học thành công',
  NOT_FOUND: 'Không tìm thấy bài học',
  ALREADY_EXISTS: 'Bài học đã tồn tại',
  INVALID_DATA: 'Dữ liệu bài học không hợp lệ',
  SLUG_REQUIRED: 'Slug không được để trống',
  TITLE_KEY_REQUIRED: 'Title key không được để trống',
  LESSON_CATEGORY_ID_REQUIRED: 'Lesson category ID không được để trống',
  SLUG_TOO_LONG: 'Slug quá dài (tối đa 200 ký tự)',
  TITLE_KEY_TOO_LONG: 'Title key quá dài (tối đa 500 ký tự)',
  LEVEL_JLPT_INVALID: 'Cấp độ JLPT không hợp lệ (1-5)',
  ESTIMATED_TIME_INVALID: 'Thời gian ước tính không hợp lệ (1-480 phút)',
  VERSION_INVALID: 'Phiên bản không hợp lệ'
}

export const USER_EXERCISE_ATTEMPT_MESSAGE = {
  CREATE_SUCCESS: 'Tạo lần thử bài tập thành công',
  UPDATE_SUCCESS: 'Cập nhật lần thử bài tập thành công',
  DELETE_SUCCESS: 'Xóa lần thử bài tập thành công',
  GET_SUCCESS: 'Lấy thông tin lần thử bài tập thành công',
  GET_LIST_SUCCESS: 'Lấy danh sách lần thử bài tập thành công',
  NOT_FOUND: 'Không tìm thấy lần thử bài tập',
  ALREADY_EXISTS: 'Lần thử bài tập đã tồn tại',
  INVALID_DATA: 'Dữ liệu lần thử bài tập không hợp lệ',
  EXERCISE_NOT_FOUND: 'Không tìm thấy bài tập',
  LESSON_BLOCKED:
    'Bạn đang học lesson khác. Chỉ có thể làm bài tập trong lesson hiện tại',
  EXERCISE_COMPLETED: 'Bài tập đã hoàn thành',
  EXERCISE_ABANDONED: 'Bài tập đã bị bỏ dở',
  CHECK_COMPLETION_SUCCESS: 'Kiểm tra trạng thái hoàn thành thành công',
  ABANDON_SUCCESS: 'Đánh dấu bài tập bỏ dở thành công',
  GET_STATUS_SUCCESS: 'Lấy trạng thái bài tập thành công',
  FORBIDDEN_REVIEW_ACCESS: 'Bạn không có quyền xem review của lần thử này'
}

export const USER_TEST_ATTEMPT_MESSAGE = {
  CREATE_SUCCESS: 'Tạo lần thử bài test thành công',
  UPDATE_SUCCESS: 'Cập nhật lần thử bài test thành công',
  DELETE_SUCCESS: 'Xóa lần thử bài test thành công',
  GET_SUCCESS: 'Lấy thông tin lần thử bài test thành công',
  GET_LIST_SUCCESS: 'Lấy danh sách lần thử bài test thành công',
  NOT_FOUND: 'Không tìm thấy lần thử bài test',
  ALREADY_EXISTS: 'Lần thử bài test đã tồn tại',
  INVALID_DATA: 'Dữ liệu lần thử bài test không hợp lệ',
  TEST_NOT_FOUND: 'Không tìm thấy bài test',
  TEST_COMPLETED: 'Bài test đã hoàn thành',
  TEST_ABANDONED: 'Bài test đã bị bỏ dở',
  CHECK_COMPLETION_SUCCESS: 'Kiểm tra trạng thái hoàn thành thành công',
  ABANDON_SUCCESS: 'Đánh dấu bài test bỏ dở thành công',
  GET_STATUS_SUCCESS: 'Lấy trạng thái bài test thành công',
  FORBIDDEN_REVIEW_ACCESS: 'Bạn không có quyền xem review của lần thử này',
  UNAUTHORIZED_ACCESS: 'Bạn không có quyền truy cập lần thử bài test này'
}

export const USER_TEST_ANSWER_LOG_MESSAGE = {
  NOT_FOUND: 'Không tìm thấy log câu trả lời test',
  ALREADY_EXISTS: 'Log câu trả lời test đã tồn tại',
  INVALID_DATA: 'Dữ liệu log câu trả lời test không hợp lệ',
  CREATE_SUCCESS: 'Tạo log câu trả lời test thành công',
  UPDATE_SUCCESS: 'Cập nhật log câu trả lời test thành công',
  DELETE_SUCCESS: 'Xóa log câu trả lời test thành công',
  GET_SUCCESS: 'Lấy thông tin log câu trả lời test thành công',
  GET_LIST_SUCCESS: 'Lấy danh sách log câu trả lời test thành công'
}

export const EXERCISES_MESSAGE = {
  CREATE_SUCCESS: 'Tạo bài tập thành công',
  UPDATE_SUCCESS: 'Cập nhật bài tập thành công',
  DELETE_SUCCESS: 'Xóa bài tập thành công',
  GET_SUCCESS: 'Lấy thông tin bài tập thành công',
  GET_LIST_SUCCESS: 'Lấy danh sách bài tập thành công',
  NOT_FOUND: 'Không tìm thấy bài tập',
  ALREADY_EXISTS: 'Bài tập đã tồn tại',
  INVALID_DATA: 'Dữ liệu bài tập không hợp lệ',
  LESSON_NOT_FOUND: 'Không tìm thấy bài học',
  CONTENT_REQUIRED: 'Nội dung bài tập không được để trống',
  EXERCISE_TYPE_REQUIRED: 'Loại bài tập không được để trống',
  LESSON_ID_REQUIRED: 'ID bài học không được để trống',
  CONTENT_TOO_LONG: 'Nội dung bài tập quá dài (tối đa 2000 ký tự)',
  PRICE_INVALID: 'Giá bài tập không hợp lệ (phải >= 0)',
  AUDIO_URL_INVALID: 'URL audio không hợp lệ',
  EXERCISE_TYPE_INVALID: 'Loại bài tập không hợp lệ'
}

export const USER_HISTORY_MESSAGE = {
  GET_LIST_SUCCESS: 'Lấy danh sách lịch sử làm bài thành công'
}

export const SRS_REVIEW_MESSAGE = {
  GET_SUCCESS: 'Lấy thông tin SRS thành công',
  GET_LIST_SUCCESS: 'Lấy danh sách SRS thành công',
  UPDATE_SUCCESS: 'Cập nhật SRS thành công',
  UPSERT_SUCCESS: 'Tạo/cập nhật SRS thành công'
}

export const SRS_MESSAGE = {
  FORBIDDEN_ACCESS: 'Bạn không có quyền truy cập bản ghi SRS này',
  NOT_FOUND: 'Không tìm thấy bản ghi SRS',
  INVALID_DATA: 'Dữ liệu SRS không hợp lệ'
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
