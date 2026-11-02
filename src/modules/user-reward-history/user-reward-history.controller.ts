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
  constructor(private readonly userRewardHistoryService: UserRewardHistoryService) {}

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
  create(@Body() body: CreateUserRewardHistoryBodyDTO) {
    return this.userRewardHistoryService.create(body)
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
  findAll(@Query() query: GetUserRewardHistoryListQueryDTO) {
    return this.userRewardHistoryService.findAll(query)
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
  getMy(
    @Query() query: GetMyRewardHistoryQueryDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() languageCode: string
  ) {
    return this.userRewardHistoryService.getMy(userId, query, languageCode)
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
  findOne(@Param() params: GetUserRewardHistoryByIdParamsDTO) {
    return this.userRewardHistoryService.findOne(params.id)
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
  update(
    @Param() params: GetUserRewardHistoryByIdParamsDTO,
    @Body() body: UpdateUserRewardHistoryBodyDTO
  ) {
    return this.userRewardHistoryService.update(params.id, body)
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
  remove(@Param() params: GetUserRewardHistoryByIdParamsDTO) {
    return this.userRewardHistoryService.remove(params.id)
  }
}
