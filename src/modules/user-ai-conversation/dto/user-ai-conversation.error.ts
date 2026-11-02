import { HttpException, HttpStatus } from '@nestjs/common'

export const UserAIConversationNotFoundException = new HttpException(
  {
    statusCode: HttpStatus.NOT_FOUND,
    message: 'Không tìm thấy cuộc hội thoại AI',
    error: 'USER_AI_CONVERSATION_NOT_FOUND'
  },
  HttpStatus.NOT_FOUND
)

export const InvalidUserAIConversationDataException = new HttpException(
  {
    statusCode: HttpStatus.BAD_REQUEST,
    message: 'Dữ liệu cuộc hội thoại AI không hợp lệ',
    error: 'INVALID_USER_AI_CONVERSATION_DATA'
  },
  HttpStatus.BAD_REQUEST
)
