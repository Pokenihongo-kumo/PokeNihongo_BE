import { HttpException, HttpStatus } from '@nestjs/common'

export const SPEAKING_MESSAGE = {
  NOT_FOUND: 'Không tìm thấy lần thử phát âm',
  ALREADY_EXISTS: 'Lần thử phát âm đã tồn tại',
  INVALID_DATA: 'Dữ liệu lần thử phát âm không hợp lệ',
  CREATE_SUCCESS: 'Tạo lần thử phát âm thành công',
  UPDATE_SUCCESS: 'Cập nhật lần thử phát âm thành công',
  DELETE_SUCCESS: 'Xóa lần thử phát âm thành công',
  GET_SUCCESS: 'Lấy thông tin lần thử phát âm thành công',
  GET_LIST_SUCCESS: 'Lấy danh sách lần thử phát âm thành công',
  GET_STATS_SUCCESS: 'Lấy thống kê phát âm thành công',
  EVALUATE_SUCCESS: 'Đánh giá phát âm thành công',
  AUDIO_URL_REQUIRED: 'URL âm thanh không được để trống',
  AUDIO_URL_INVALID: 'URL âm thanh không hợp lệ',
  QUESTION_BANK_NOT_FOUND: 'Không tìm thấy câu hỏi',
  GOOGLE_API_ERROR: 'Lỗi khi gọi Google Speech API',
  AUDIO_PROCESSING_ERROR: 'Lỗi khi xử lý file âm thanh',
  EVALUATION_ERROR: 'Lỗi khi đánh giá phát âm',
  CONFIDENCE_INVALID: 'Độ tin cậy không hợp lệ (0-1)',
  SCORE_INVALID: 'Điểm số không hợp lệ (0-100)',
  PROCESSING_TIME_INVALID: 'Thời gian xử lý không hợp lệ'
}

export const UserSpeakingAttemptNotFoundException = new HttpException(
  {
    statusCode: HttpStatus.NOT_FOUND,
    message: SPEAKING_MESSAGE.NOT_FOUND,
    error: 'USER_SPEAKING_ATTEMPT_NOT_FOUND'
  },
  HttpStatus.NOT_FOUND
)

export const UserSpeakingAttemptAlreadyExistsException = new HttpException(
  {
    statusCode: HttpStatus.CONFLICT,
    message: SPEAKING_MESSAGE.ALREADY_EXISTS,
    error: 'USER_SPEAKING_ATTEMPT_ALREADY_EXISTS'
  },
  HttpStatus.CONFLICT
)

export const InvalidUserSpeakingAttemptDataException = new HttpException(
  {
    statusCode: HttpStatus.BAD_REQUEST,
    message: SPEAKING_MESSAGE.INVALID_DATA,
    error: 'INVALID_USER_SPEAKING_ATTEMPT_DATA'
  },
  HttpStatus.BAD_REQUEST
)

export const QuestionBankNotFoundException = new HttpException(
  {
    statusCode: HttpStatus.NOT_FOUND,
    message: SPEAKING_MESSAGE.QUESTION_BANK_NOT_FOUND,
    error: 'QUESTION_BANK_NOT_FOUND'
  },
  HttpStatus.NOT_FOUND
)

export const GoogleApiException = new HttpException(
  {
    statusCode: HttpStatus.SERVICE_UNAVAILABLE,
    message: SPEAKING_MESSAGE.GOOGLE_API_ERROR,
    error: 'GOOGLE_API_ERROR'
  },
  HttpStatus.SERVICE_UNAVAILABLE
)

export const AudioProcessingException = new HttpException(
  {
    statusCode: HttpStatus.BAD_REQUEST,
    message: SPEAKING_MESSAGE.AUDIO_PROCESSING_ERROR,
    error: 'AUDIO_PROCESSING_ERROR'
  },
  HttpStatus.BAD_REQUEST
)

export const EvaluationException = new HttpException(
  {
    statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    message: SPEAKING_MESSAGE.EVALUATION_ERROR,
    error: 'EVALUATION_ERROR'
  },
  HttpStatus.INTERNAL_SERVER_ERROR
)
