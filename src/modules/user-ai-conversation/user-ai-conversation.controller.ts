import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags
} from '@nestjs/swagger'
import { ZodSerializerDto } from 'nestjs-zod'
import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'
import { UserAIConversationService } from './user-ai-conversation.service'
import {
  CreateUserAIConversationBodyDTO,
  UpdateUserAIConversationBodyDTO,
  GetUserAIConversationByConversationParamsDTO,
  GetUserAIConversationByIdParamsDTO,
  GetUserAIConversationListQueryDTO,
  UserAIConversationResDTO
} from './dto/user-ai-conversation.zod-dto'
import {
  UserAIConversationSwaggerDTO,
  UserAIConversationResponseSwaggerDTO,
  UserAIConversationListResponseSwaggerDTO,
  CreateUserAIConversationSwaggerDTO,
  UpdateUserAIConversationSwaggerDTO,
  GetUserAIConversationListQuerySwaggerDTO,
  GetUserAIConversationByIdParamsSwaggerDTO,
  DeleteByConversationIdResponseSwaggerDTO
} from './dto/user-ai-conversation.dto'

@ApiTags('User AI Conversation')
@ApiBearerAuth()
@Controller('user-ai-conversation')
export class UserAIConversationController {
  constructor(private readonly userAIConversationService: UserAIConversationService) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tạo cuộc hội thoại AI mới' })
  @ApiBody({ type: CreateUserAIConversationSwaggerDTO })
  @ApiResponse({
    status: 201,
    description: 'Tạo cuộc hội thoại AI thành công',
    type: UserAIConversationResponseSwaggerDTO
  })
  @ZodSerializerDto(UserAIConversationResDTO)
  async create(
    @Body() body: CreateUserAIConversationBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.userAIConversationService.create({ ...body, userId }, lang)
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy danh sách cuộc hội thoại AI với phân trang và lọc' })
  @ApiQuery({ type: GetUserAIConversationListQuerySwaggerDTO })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách cuộc hội thoại AI thành công',
    type: UserAIConversationListResponseSwaggerDTO
  })
  async findAll(
    @Query() query: GetUserAIConversationListQueryDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.userAIConversationService.findAll(query, userId, lang)
  }

  @Get('conversation/:conversationId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy tất cả messages theo conversationId' })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách messages thành công',
    type: UserAIConversationListResponseSwaggerDTO
  })
  async findByConversationId(
    @Param() { conversationId }: GetUserAIConversationByConversationParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.userAIConversationService.findByConversationId(
      conversationId,
      userId,
      lang
    )
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy thông tin cuộc hội thoại AI theo ID' })
  @ApiResponse({
    status: 200,
    description: 'Lấy thông tin cuộc hội thoại AI thành công',
    type: UserAIConversationResponseSwaggerDTO
  })
  @ZodSerializerDto(UserAIConversationResDTO)
  async findOne(
    @Param() { id }: GetUserAIConversationByIdParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.userAIConversationService.findOne(id, userId, lang)
  }

  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cập nhật cuộc hội thoại AI theo ID' })
  @ApiBody({ type: UpdateUserAIConversationSwaggerDTO })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật cuộc hội thoại AI thành công',
    type: UserAIConversationResponseSwaggerDTO
  })
  @ZodSerializerDto(UserAIConversationResDTO)
  async update(
    @Param() { id }: GetUserAIConversationByIdParamsDTO,
    @Body() body: UpdateUserAIConversationBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.userAIConversationService.updateOwned(id, userId, body, lang)
  }

  @Delete(':id')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xóa cuộc hội thoại AI theo ID' })
  @ApiResponse({
    status: 200,
    description: 'Xóa cuộc hội thoại AI thành công',
    type: UserAIConversationResponseSwaggerDTO
  })
  @ZodSerializerDto(UserAIConversationResDTO)
  async remove(
    @Param() { id }: GetUserAIConversationByIdParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.userAIConversationService.remove(id, userId, lang)
  }

  @Delete('conversation/:conversationId')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xóa tất cả messages theo conversationId' })
  @ApiResponse({
    status: 200,
    description: 'Xóa tất cả messages thành công',
    type: DeleteByConversationIdResponseSwaggerDTO
  })
  async removeByConversationId(
    @Param() { conversationId }: GetUserAIConversationByConversationParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.userAIConversationService.removeByConversationId(
      conversationId,
      userId,
      lang
    )
  }
}
