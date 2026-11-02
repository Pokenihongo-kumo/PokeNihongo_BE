import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { AIConversationRoomService } from './ai-conversation-room.service'
import {
  CreateAIConversationRoomBodySchema,
  GetAIConversationRoomByIdParamsSchema,
  GetAIConversationRoomListQuerySchema,
  UpdateAIConversationRoomBodySchema
} from './entities/ai-conversation-room.entities'

@ApiTags('User AI Conversation Room')
@ApiBearerAuth()
@Controller('ai-conversation-room')
export class AIConversationRoomController {
  constructor(private readonly aiConversationRoomService: AIConversationRoomService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo phòng hội thoại AI mới' })
  async create(@Body() body: any, @ActiveUser('userId') userId: number) {
    return this.aiConversationRoomService.create({
      ...body,
      userId
    })
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách phòng hội thoại AI' })
  async findAll(@Query() query: any, @ActiveUser('userId') userId: number) {
    return this.aiConversationRoomService.findAll(query, userId)
  }

  @Get('conversation/:conversationId')
  @ApiOperation({ summary: 'Lấy thông tin phòng theo conversationId' })
  async findByConversationId(
    @Param('conversationId') conversationId: string,
    @ActiveUser('userId') userId: number
  ) {
    return this.aiConversationRoomService.findByConversationId(conversationId, userId)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin phòng hội thoại AI theo ID' })
  async findOne(@Param() params: any) {
    return this.aiConversationRoomService.findOne(params)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật phòng hội thoại AI' })
  async update(@Param() params: any, @Body() body: any) {
    return this.aiConversationRoomService.update(params.id, body)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa phòng hội thoại AI' })
  async remove(@Param() params: any) {
    return this.aiConversationRoomService.remove(params.id)
  }
}
