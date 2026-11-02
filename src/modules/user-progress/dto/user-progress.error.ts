import { HttpException, HttpStatus } from '@nestjs/common'

export const USER_PROGRESS_MESSAGE = {
  NOT_FOUND: 'Không tìm thấy tiến độ học tập',
  ALREADY_EXISTS: 'Tiến độ học tập đã tồn tại',
  INVALID_DATA: 'Dữ liệu tiến độ học tập không hợp lệ',
  CREATE_SUCCESS: 'Tạo tiến độ học tập thành công',
  UPDATE_SUCCESS: 'Cập nhật tiến độ học tập thành công',
  DELETE_SUCCESS: 'Xóa tiến độ học tập thành công',
  GET_SUCCESS: 'Lấy thông tin tiến độ học tập thành công',
  GET_LIST_SUCCESS: 'Lấy danh sách tiến độ học tập thành công'
}

export const UserProgressNotFoundException = new HttpException(
  {
    statusCode: HttpStatus.NOT_FOUND,
    message: USER_PROGRESS_MESSAGE.NOT_FOUND,
    error: 'USER_PROGRESS_NOT_FOUND'
  },
  HttpStatus.NOT_FOUND
)

export const UserProgressAlreadyExistsException = new HttpException(
  {
    statusCode: HttpStatus.CONFLICT,
    message: USER_PROGRESS_MESSAGE.ALREADY_EXISTS,
    error: 'USER_PROGRESS_ALREADY_EXISTS'
  },
  HttpStatus.CONFLICT
)

export const InvalidUserProgressDataException = new HttpException(
  {
    statusCode: HttpStatus.BAD_REQUEST,
    message: USER_PROGRESS_MESSAGE.INVALID_DATA,
    error: 'INVALID_USER_PROGRESS_DATA'
  },
  HttpStatus.BAD_REQUEST
)
