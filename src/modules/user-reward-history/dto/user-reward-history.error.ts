import { HttpException, HttpStatus } from '@nestjs/common'

export const USER_REWARD_HISTORY_MESSAGE = {
  NOT_FOUND: 'Không tìm thấy lịch sử nhận thưởng',
  INVALID_DATA: 'Dữ liệu lịch sử nhận thưởng không hợp lệ',
  CREATE_SUCCESS: 'Tạo lịch sử nhận thưởng thành công',
  UPDATE_SUCCESS: 'Cập nhật lịch sử nhận thưởng thành công',
  DELETE_SUCCESS: 'Xóa lịch sử nhận thưởng thành công',
  GET_SUCCESS: 'Lấy lịch sử nhận thưởng thành công',
  GET_LIST_SUCCESS: 'Lấy danh sách lịch sử nhận thưởng thành công'
}

export const UserRewardHistoryNotFoundException = new HttpException(
  {
    statusCode: HttpStatus.NOT_FOUND,
    message: USER_REWARD_HISTORY_MESSAGE.NOT_FOUND,
    error: 'USER_REWARD_HISTORY_NOT_FOUND'
  },
  HttpStatus.NOT_FOUND
)

export const InvalidUserRewardHistoryDataException = new HttpException(
  {
    statusCode: HttpStatus.BAD_REQUEST,
    message: USER_REWARD_HISTORY_MESSAGE.INVALID_DATA,
    error: 'INVALID_USER_REWARD_HISTORY_DATA'
  },
  HttpStatus.BAD_REQUEST
)
