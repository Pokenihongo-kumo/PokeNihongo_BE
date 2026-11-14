import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'
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
  create(
    @Body() body: CreateAIConversationRoomBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.aiConversationRoomService.create({ ...body, userId }, lang)
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách phòng hội thoại AI' })
  findAll(
    @Query() query: GetAIConversationRoomListQueryDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.aiConversationRoomService.findAll(query, userId, lang)
  }

  @Get('conversation/:conversationId')
  @ApiOperation({ summary: 'Lấy thông tin phòng theo conversationId' })
  findByConversationId(
    @Param() { conversationId }: GetAIConversationRoomByConversationParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.aiConversationRoomService.findByConversationId(
      conversationId,
      userId,
      lang
    )
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin phòng hội thoại AI theo ID' })
  @ZodSerializerDto(AIConversationRoomResDTO)
  findOne(
    @Param() { id }: GetAIConversationRoomByIdParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.aiConversationRoomService.findOne(id, userId, lang)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật phòng hội thoại AI' })
  @ZodSerializerDto(AIConversationRoomResDTO)
  update(
    @Param() { id }: GetAIConversationRoomByIdParamsDTO,
    @Body() body: UpdateAIConversationRoomBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.aiConversationRoomService.update(id, userId, body, lang)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa phòng hội thoại AI' })
  @ZodSerializerDto(AIConversationRoomResDTO)
  remove(
    @Param() { id }: GetAIConversationRoomByIdParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.aiConversationRoomService.remove(id, userId, lang)
  }
}
