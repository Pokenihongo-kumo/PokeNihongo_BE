import { HttpException, HttpStatus } from '@nestjs/common'

export const AIConversationRoomNotFoundException = new HttpException(
  {
    statusCode: HttpStatus.NOT_FOUND,
    message: 'Không tìm thấy phòng hội thoại AI',
    error: 'AI_CONVERSATION_ROOM_NOT_FOUND'
  },
  HttpStatus.NOT_FOUND
)

export const InvalidAIConversationRoomDataException = new HttpException(
  {
    statusCode: HttpStatus.BAD_REQUEST,
    message: 'Dữ liệu phòng hội thoại AI không hợp lệ',
    error: 'INVALID_AI_CONVERSATION_ROOM_DATA'
  },
  HttpStatus.BAD_REQUEST
)
