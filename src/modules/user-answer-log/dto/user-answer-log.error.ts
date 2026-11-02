import { HttpException, HttpStatus } from '@nestjs/common'

export const USER_ANSWER_LOG_MESSAGE = {
  NOT_FOUND: 'Không tìm thấy log câu trả lời',
  ALREADY_EXISTS: 'Log câu trả lời đã tồn tại',
  INVALID_DATA: 'Dữ liệu log câu trả lời không hợp lệ',
  CREATE_SUCCESS: 'Tạo log câu trả lời thành công',
  UPDATE_SUCCESS: 'Cập nhật log câu trả lời thành công',
  DELETE_SUCCESS: 'Xóa log câu trả lời thành công',
  GET_SUCCESS: 'Lấy thông tin log câu trả lời thành công',
  GET_LIST_SUCCESS: 'Lấy danh sách log câu trả lời thành công'
}

export const UserAnswerLogNotFoundException = new HttpException(
  {
    statusCode: HttpStatus.NOT_FOUND,
    message: USER_ANSWER_LOG_MESSAGE.NOT_FOUND,
    error: 'USER_ANSWER_LOG_NOT_FOUND'
  },
  HttpStatus.NOT_FOUND
)

export const UserAnswerLogAlreadyExistsException = new HttpException(
  {
    statusCode: HttpStatus.CONFLICT,
    message: USER_ANSWER_LOG_MESSAGE.ALREADY_EXISTS,
    error: 'USER_ANSWER_LOG_ALREADY_EXISTS'
  },
  HttpStatus.CONFLICT
)

export const InvalidUserAnswerLogDataException = new HttpException(
  {
    statusCode: HttpStatus.BAD_REQUEST,
    message: USER_ANSWER_LOG_MESSAGE.INVALID_DATA,
    error: 'INVALID_USER_ANSWER_LOG_DATA'
  },
  HttpStatus.BAD_REQUEST
)
