import { ResponseMessage, msg } from '@/i18n/response-message'
import { UserAIConversationMessage as M } from '@/i18n/message-keys'
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
import { UserAIConversationService } from './user-ai-conversation.service'
import {
  CreateUserAIConversationBodyDTO,
  UpdateUserAIConversationBodyDTO,
  GetUserAIConversationByConversationParamsDTO,
  GetUserAIConversationByIdParamsDTO,
  GetUserAIConversationListQueryDTO,
  UserAIConversationResDTO,
  UserAIConversationListResDTO,
  UserAIConversationArrayResDTO,
  UserAIConversationDeletedResDTO
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
  @ResponseMessage(M.CREATE_SUCCESS)
  async create(
    @Body() body: CreateUserAIConversationBodyDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.userAIConversationService.create({ ...body, userId })
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
  @ResponseMessage(M.GET_LIST_SUCCESS)
  @ZodSerializerDto(UserAIConversationListResDTO)
  async findAll(
    @Query() query: GetUserAIConversationListQueryDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.userAIConversationService.findAll(query, userId)
  }

  @Get('conversation/:conversationId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy tất cả messages theo conversationId' })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách messages thành công',
    type: UserAIConversationListResponseSwaggerDTO
  })
  @ResponseMessage(M.GET_LIST_SUCCESS)
  @ZodSerializerDto(UserAIConversationArrayResDTO)
  async findByConversationId(
    @Param() { conversationId }: GetUserAIConversationByConversationParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.userAIConversationService.findByConversationId(conversationId, userId)
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
  @ResponseMessage(M.GET_SUCCESS)
  async findOne(
    @Param() { id }: GetUserAIConversationByIdParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.userAIConversationService.findOne(id, userId)
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
  @ResponseMessage(M.UPDATE_SUCCESS)
  async update(
    @Param() { id }: GetUserAIConversationByIdParamsDTO,
    @Body() body: UpdateUserAIConversationBodyDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.userAIConversationService.updateOwned(id, userId, body)
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
  @ResponseMessage(M.DELETE_SUCCESS)
  async remove(
    @Param() { id }: GetUserAIConversationByIdParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.userAIConversationService.remove(id, userId)
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
  @ZodSerializerDto(UserAIConversationDeletedResDTO)
  async removeByConversationId(
    @Param() { conversationId }: GetUserAIConversationByConversationParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    const data = await this.userAIConversationService.removeByConversationId(
      conversationId,
      userId
    )
    return {
      data,
      message: msg(M.DELETE_BY_CONVERSATION_SUCCESS, {
        count: data.deletedCount
      })
    }
  }
}
