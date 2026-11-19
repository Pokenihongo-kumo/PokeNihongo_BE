import { I18nService } from '@/i18n/i18n.service'
import { UserRewardHistoryMessage } from '@/i18n/message-keys'
import { ActiveUser } from '@/common/decorators/active-user.decorator'
import {
  CreateUserRewardHistoryBodyDTO,
  GetUserRewardHistoryByIdParamsDTO,
  GetUserRewardHistoryListQueryDTO,
  GetMyRewardHistoryQueryDTO,
  UpdateUserRewardHistoryBodyDTO,
  UserRewardHistoryListResDTO,
  UserRewardHistoryResDTO
} from '@/modules/user-reward-history/dto/user-reward-history.zod-dto'
import {
  CreateUserRewardHistorySwaggerDTO,
  GetUserRewardHistoryListQuerySwaggerDTO,
  GetMyRewardHistoryQuerySwaggerDTO,
  UpdateUserRewardHistorySwaggerDTO,
  UserRewardHistoryListResponseSwaggerDTO,
  UserRewardHistoryResponseSwaggerDTO
} from '@/modules/user-reward-history/dto/user-reward-history.dto'
import { UserRewardHistoryService } from '@/modules/user-reward-history/user-reward-history.service'
import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags
} from '@nestjs/swagger'
import { ZodSerializerDto } from 'nestjs-zod'
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'

@ApiTags('User Reward History')
@Controller('user-reward-history')
export class UserRewardHistoryController {
  constructor(
    private readonly userRewardHistoryService: UserRewardHistoryService,
    private readonly i18nService: I18nService
  ) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tạo lịch sử nhận thưởng' })
  @ApiBody({ type: CreateUserRewardHistorySwaggerDTO })
  @ApiResponse({
    status: 201,
    description: 'Tạo lịch sử nhận thưởng thành công',
    type: UserRewardHistoryResponseSwaggerDTO
  })
  @ZodSerializerDto(UserRewardHistoryResDTO)
  async create(@Body() body: CreateUserRewardHistoryBodyDTO, @I18nLang() lang: string) {
    return {
      message: this.i18nService.translate(UserRewardHistoryMessage.CREATE_SUCCESS, lang),
      data: await this.userRewardHistoryService.create(body)
    }
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy danh sách lịch sử nhận thưởng (Admin)' })
  @ApiQuery({ type: GetUserRewardHistoryListQuerySwaggerDTO })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách lịch sử nhận thưởng thành công',
    type: UserRewardHistoryListResponseSwaggerDTO
  })
  @ZodSerializerDto(UserRewardHistoryListResDTO)
  async findAll(
    @Query() query: GetUserRewardHistoryListQueryDTO,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(
        UserRewardHistoryMessage.GET_LIST_SUCCESS,
        lang
      ),
      data: await this.userRewardHistoryService.findAll(query)
    }
  }

  @Get('my')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy lịch sử nhận thưởng của tôi' })
  @ApiQuery({ type: GetMyRewardHistoryQuerySwaggerDTO })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách lịch sử nhận thưởng thành công',
    type: UserRewardHistoryListResponseSwaggerDTO
  })
  @ZodSerializerDto(UserRewardHistoryListResDTO)
  async getMy(
    @Query() query: GetMyRewardHistoryQueryDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() languageCode: string
  ) {
    return {
      message: this.i18nService.translate(
        UserRewardHistoryMessage.GET_LIST_SUCCESS,
        languageCode
      ),
      data: await this.userRewardHistoryService.getMy(userId, query, languageCode)
    }
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy thông tin lịch sử nhận thưởng theo ID' })
  @ApiResponse({
    status: 200,
    description: 'Lấy lịch sử nhận thưởng thành công',
    type: UserRewardHistoryResponseSwaggerDTO
  })
  @ZodSerializerDto(UserRewardHistoryResDTO)
  async findOne(
    @Param() params: GetUserRewardHistoryByIdParamsDTO,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(UserRewardHistoryMessage.GET_SUCCESS, lang),
      data: await this.userRewardHistoryService.findOne(params.id)
    }
  }

  @Put(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cập nhật lịch sử nhận thưởng' })
  @ApiBody({ type: UpdateUserRewardHistorySwaggerDTO })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật lịch sử nhận thưởng thành công',
    type: UserRewardHistoryResponseSwaggerDTO
  })
  @ZodSerializerDto(UserRewardHistoryResDTO)
  async update(
    @Param() params: GetUserRewardHistoryByIdParamsDTO,
    @Body() body: UpdateUserRewardHistoryBodyDTO,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(UserRewardHistoryMessage.UPDATE_SUCCESS, lang),
      data: await this.userRewardHistoryService.update(params.id, body)
    }
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Xóa lịch sử nhận thưởng' })
  @ApiResponse({
    status: 200,
    description: 'Xóa lịch sử nhận thưởng thành công',
    type: UserRewardHistoryResponseSwaggerDTO
  })
  @ZodSerializerDto(UserRewardHistoryResDTO)
  async remove(
    @Param() params: GetUserRewardHistoryByIdParamsDTO,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(UserRewardHistoryMessage.DELETE_SUCCESS, lang),
      data: await this.userRewardHistoryService.remove(params.id)
    }
  }
}
