import { ApiProperty } from '@nestjs/swagger'

export class UserAIConversationSwaggerDTO {
  @ApiProperty({ example: 1, description: 'ID của cuộc hội thoại AI' })
  id: number

  @ApiProperty({ example: 1, description: 'ID người dùng' })
  userId: number

  @ApiProperty({ example: 'conv_1_1234567890', description: 'ID cuộc trò chuyện' })
  conversationId: string

  @ApiProperty({
    example: 'USER',
    description: 'Vai trò: USER (người dùng) hoặc AI (trợ lý AI)',
    enum: ['USER', 'AI']
  })
  role: string

  @ApiProperty({ example: 'こんにちは', description: 'Nội dung tin nhắn' })
  message: string

  @ApiProperty({
    example: 'https://example.com/audio.mp3',
    description: 'URL audio (nếu có)',
    nullable: true,
    required: false
  })
  audioUrl: string | null

  @ApiProperty({
    example: '2024-01-01T00:00:00.000Z',
    description: 'Ngày tạo',
    required: false
  })
  createdAt: Date

  @ApiProperty({
    example: '2024-01-01T00:00:00.000Z',
    description: 'Ngày cập nhật',
    required: false
  })
  updatedAt: Date
}

export class CreateUserAIConversationSwaggerDTO {
  @ApiProperty({ example: 'conv_1_1234567890', description: 'ID cuộc trò chuyện' })
  conversationId: string

  @ApiProperty({
    example: 'USER',
    description: 'Vai trò: USER (người dùng) hoặc AI (trợ lý AI)',
    enum: ['USER', 'AI']
  })
  role: string

  @ApiProperty({ example: 'こんにちは', description: 'Nội dung tin nhắn' })
  message: string

  @ApiProperty({
    example: 'https://example.com/audio.mp3',
    description: 'URL audio (nếu có)',
    nullable: true,
    required: false
  })
  audioUrl?: string | null
}

export class UpdateUserAIConversationSwaggerDTO {
  @ApiProperty({
    example: 'こんにちは',
    description: 'Nội dung tin nhắn',
    required: false
  })
  message?: string

  @ApiProperty({
    example: 'https://example.com/audio.mp3',
    description: 'URL audio (nếu có)',
    nullable: true,
    required: false
  })
  audioUrl?: string | null
}

export class UserAIConversationResponseSwaggerDTO {
  @ApiProperty({ example: 200, description: 'Status code' })
  statusCode: number

  @ApiProperty({
    type: UserAIConversationSwaggerDTO,
    description: 'Dữ liệu cuộc hội thoại AI'
  })
  data: UserAIConversationSwaggerDTO

  @ApiProperty({
    example: 'Lấy thông tin cuộc hội thoại AI thành công',
    description: 'Thông báo'
  })
  message: string
}

export class UserAIConversationListResponseSwaggerDTO {
  @ApiProperty({ example: 200, description: 'Status code' })
  statusCode: number

  @ApiProperty({
    description: 'Dữ liệu danh sách cuộc hội thoại AI',
    properties: {
      results: {
        type: 'array',
        items: { $ref: '#/components/schemas/UserAIConversationSwaggerDTO' }
      },
      pagination: {
        type: 'object',
        properties: {
          current: { type: 'number', example: 1 },
          pageSize: { type: 'number', example: 10 },
          totalPage: { type: 'number', example: 5 },
          totalItem: { type: 'number', example: 50 }
        }
      }
    }
  })
  data: {
    results: UserAIConversationSwaggerDTO[]
    pagination: {
      current: number
      pageSize: number
      totalPage: number
      totalItem: number
    }
  }

  @ApiProperty({
    example: 'Lấy danh sách cuộc hội thoại AI thành công',
    description: 'Thông báo'
  })
  message: string
}

export class GetUserAIConversationListQuerySwaggerDTO {
  @ApiProperty({ example: 1, description: 'Trang hiện tại', required: false, default: 1 })
  currentPage?: number

  @ApiProperty({
    example: 10,
    description: 'Số lượng item mỗi trang',
    required: false,
    default: 10,
    maximum: 100
  })
  pageSize?: number

  @ApiProperty({
    example: 'conv_1_1234567890',
    description: 'Lọc theo conversationId',
    required: false
  })
  conversationId?: string

  @ApiProperty({
    example: 'USER',
    description: 'Lọc theo vai trò: USER hoặc AI',
    enum: ['USER', 'AI'],
    required: false
  })
  role?: string
}

export class GetUserAIConversationByIdParamsSwaggerDTO {
  @ApiProperty({ example: 1, description: 'ID cuộc hội thoại AI' })
  id: number
}

export class DeleteByConversationIdResponseSwaggerDTO {
  @ApiProperty({ example: 200, description: 'Status code' })
  statusCode: number

  @ApiProperty({
    description: 'Dữ liệu xóa',
    properties: {
      deletedCount: { type: 'number', example: 5 }
    }
  })
  data: {
    deletedCount: number
  }

  @ApiProperty({
    example: 'Xóa 5 cuộc hội thoại AI thành công',
    description: 'Thông báo'
  })
  message: string
}
