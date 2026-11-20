import { ResponseMessage } from '@/i18n/response-message'
import { AIConversationRoomMessage as M } from '@/i18n/message-keys'
import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { ZodSerializerDto } from 'nestjs-zod'
import { AIConversationRoomService } from './ai-conversation-room.service'
import {
  AIConversationRoomResDTO,
  CreateAIConversationRoomBodyDTO,
  GetAIConversationRoomByConversationParamsDTO,
  GetAIConversationRoomByIdParamsDTO,
  GetAIConversationRoomListQueryDTO,
  UpdateAIConversationRoomBodyDTO
} from './dto/ai-conversation-room.zod-dto'

// The user's own kaiwa rooms; the mobile app lists and deletes them
@ApiTags('AI Conversation Room')
@ApiBearerAuth()
@Controller('ai-conversation-room')
export class AIConversationRoomController {
  constructor(private readonly aiConversationRoomService: AIConversationRoomService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo phòng hội thoại AI mới' })
  @ZodSerializerDto(AIConversationRoomResDTO)
  @ResponseMessage(M.CREATE_SUCCESS)
  async create(
    @Body() body: CreateAIConversationRoomBodyDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.aiConversationRoomService.create({ ...body, userId })
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách phòng hội thoại AI' })
  @ResponseMessage(M.GET_LIST_SUCCESS)
  async findAll(
    @Query() query: GetAIConversationRoomListQueryDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.aiConversationRoomService.findAll(query, userId)
  }

  @Get('conversation/:conversationId')
  @ApiOperation({ summary: 'Lấy thông tin phòng theo conversationId' })
  @ResponseMessage(M.GET_SUCCESS)
  async findByConversationId(
    @Param() { conversationId }: GetAIConversationRoomByConversationParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.aiConversationRoomService.findByConversationId(conversationId, userId)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin phòng hội thoại AI theo ID' })
  @ZodSerializerDto(AIConversationRoomResDTO)
  @ResponseMessage(M.GET_SUCCESS)
  async findOne(
    @Param() { id }: GetAIConversationRoomByIdParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.aiConversationRoomService.findOne(id, userId)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật phòng hội thoại AI' })
  @ZodSerializerDto(AIConversationRoomResDTO)
  @ResponseMessage(M.UPDATE_SUCCESS)
  async update(
    @Param() { id }: GetAIConversationRoomByIdParamsDTO,
    @Body() body: UpdateAIConversationRoomBodyDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.aiConversationRoomService.update(id, userId, body)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa phòng hội thoại AI' })
  @ZodSerializerDto(AIConversationRoomResDTO)
  @ResponseMessage(M.DELETE_SUCCESS)
  async remove(
    @Param() { id }: GetAIConversationRoomByIdParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.aiConversationRoomService.remove(id, userId)
  }
}
