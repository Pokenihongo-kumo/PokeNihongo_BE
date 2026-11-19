import { I18nService } from '@/i18n/i18n.service'
import { AIConversationRoomMessage as M } from '@/i18n/message-keys'
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
  constructor(
    private readonly aiConversationRoomService: AIConversationRoomService,
    private readonly i18nService: I18nService
  ) {}

  @Post()
  @ApiOperation({ summary: 'Tạo phòng hội thoại AI mới' })
  @ZodSerializerDto(AIConversationRoomResDTO)
  async create(
    @Body() body: CreateAIConversationRoomBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(M.CREATE_SUCCESS, lang),
      data: await this.aiConversationRoomService.create({ ...body, userId })
    }
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách phòng hội thoại AI' })
  async findAll(
    @Query() query: GetAIConversationRoomListQueryDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(M.GET_LIST_SUCCESS, lang),
      data: await this.aiConversationRoomService.findAll(query, userId)
    }
  }

  @Get('conversation/:conversationId')
  @ApiOperation({ summary: 'Lấy thông tin phòng theo conversationId' })
  async findByConversationId(
    @Param() { conversationId }: GetAIConversationRoomByConversationParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(M.GET_SUCCESS, lang),
      data: await this.aiConversationRoomService.findByConversationId(
        conversationId,
        userId
      )
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin phòng hội thoại AI theo ID' })
  @ZodSerializerDto(AIConversationRoomResDTO)
  async findOne(
    @Param() { id }: GetAIConversationRoomByIdParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(M.GET_SUCCESS, lang),
      data: await this.aiConversationRoomService.findOne(id, userId)
    }
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật phòng hội thoại AI' })
  @ZodSerializerDto(AIConversationRoomResDTO)
  async update(
    @Param() { id }: GetAIConversationRoomByIdParamsDTO,
    @Body() body: UpdateAIConversationRoomBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(M.UPDATE_SUCCESS, lang),
      data: await this.aiConversationRoomService.update(id, userId, body)
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa phòng hội thoại AI' })
  @ZodSerializerDto(AIConversationRoomResDTO)
  async remove(
    @Param() { id }: GetAIConversationRoomByIdParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(M.DELETE_SUCCESS, lang),
      data: await this.aiConversationRoomService.remove(id, userId)
    }
  }
}
