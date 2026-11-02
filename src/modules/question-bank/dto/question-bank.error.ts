import { HttpException, HttpStatus } from '@nestjs/common'

export const QUESTION_BANK_MESSAGE = {
  NOT_FOUND: 'Không tìm thấy câu hỏi',
  ALREADY_EXISTS: 'Câu hỏi đã tồn tại',
  INVALID_DATA: 'Dữ liệu câu hỏi không hợp lệ',
  CREATE_SUCCESS: 'Tạo câu hỏi thành công',
  UPDATE_SUCCESS: 'Cập nhật câu hỏi thành công',
  DELETE_SUCCESS: 'Xóa câu hỏi thành công',
  GET_SUCCESS: 'Lấy thông tin câu hỏi thành công',
  GET_LIST_SUCCESS: 'Lấy danh sách câu hỏi thành công',
  GET_STATS_SUCCESS: 'Lấy thống kê câu hỏi thành công',
  QUESTION_JP_REQUIRED: 'Nội dung câu hỏi không được để trống',
  QUESTION_TYPE_REQUIRED: 'Loại câu hỏi không được để trống',
  AUDIO_URL_INVALID: 'URL âm thanh không hợp lệ',
  PRONUNCIATION_TOO_LONG: 'Phiên âm quá dài (tối đa 1000 ký tự)',
  LEVEL_INVALID: 'Cấp độ JLPT không hợp lệ (1-5)'
}

export const QuestionBankNotFoundException = new HttpException(
  {
    statusCode: HttpStatus.NOT_FOUND,
    message: QUESTION_BANK_MESSAGE.NOT_FOUND,
    error: 'QUESTION_BANK_NOT_FOUND'
  },
  HttpStatus.NOT_FOUND
)

export const QuestionBankAlreadyExistsException = new HttpException(
  {
    statusCode: HttpStatus.CONFLICT,
    message: QUESTION_BANK_MESSAGE.ALREADY_EXISTS,
    error: 'QUESTION_BANK_ALREADY_EXISTS'
  },
  HttpStatus.CONFLICT
)

export const InvalidQuestionBankDataException = new HttpException(
  {
    statusCode: HttpStatus.BAD_REQUEST,
    message: QUESTION_BANK_MESSAGE.INVALID_DATA,
    error: 'INVALID_QUESTION_BANK_DATA'
  },
  HttpStatus.BAD_REQUEST
)
