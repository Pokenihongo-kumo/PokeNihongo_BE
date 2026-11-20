import { ResponseMessage } from '@/i18n/response-message'
import { UserAchievementMessage } from '@/i18n/message-keys'
import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'
import { PaginationQueryDTO } from '@/shared/dtos/request.dto'
import { MessageResDTO, PaginationResponseDTO } from '@/shared/dtos/response.dto'
import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common'
import { ZodSerializerDto } from 'nestjs-zod'
import {
  CreateUserAchievementBodyDTO,
  CreateUserAchievementResDTO,
  GetUserAchievementDetailResDTO,
  GetUserAchievementListForUserQueryDTO,
  GetUserAchievementParamsDTO,
  UpdateUserAchievementBodyDTO,
  UpdateUserAchievementResDTO
} from './dto/user-achievement.dto'
import { UserAchievementService } from './user-achievement.service'

@Controller('user-achievement')
export class UserAchievementController {
  constructor(private readonly userAchievementService: UserAchievementService) {}

  @Get()
  @ZodSerializerDto(PaginationResponseDTO)
  @ResponseMessage(UserAchievementMessage.GET_LIST_SUCCESS)
  async list(@Query() query: PaginationQueryDTO) {
    return this.userAchievementService.list(query)
  }

  @Get('user')
  @ZodSerializerDto(PaginationResponseDTO)
  @ResponseMessage(UserAchievementMessage.GET_LIST_SUCCESS)
  async getListAchieveforUser(
    @Query() query: GetUserAchievementListForUserQueryDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    const { achCurrentPage, achPageSize, achievementGroupId, ...pagination } = query
    return this.userAchievementService.getListAchieveforUser(
      userId,
      lang,
      pagination,
      achCurrentPage,
      achPageSize,
      achievementGroupId
    )
  }

  @Get(':userAchievementId')
  @ZodSerializerDto(GetUserAchievementDetailResDTO)
  @ResponseMessage(UserAchievementMessage.GET_LIST_SUCCESS)
  async findById(
    @Param() params: GetUserAchievementParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.userAchievementService.findById(params.userAchievementId)
  }

  @Post()
  @ZodSerializerDto(CreateUserAchievementResDTO)
  @ResponseMessage(UserAchievementMessage.CREATE_SUCCESS)
  async create(
    @Body() body: CreateUserAchievementBodyDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.userAchievementService.create({
      userId,
      data: body
    })
  }

  @Put('get-reward/:userAchievementId')
  // @ZodSerializerDto(UpdateUserSeasonHistoryResDTO)
  @ResponseMessage(UserAchievementMessage.GET_REWARD_SUCCESS)
  async getReward(
    @Param() params: GetUserAchievementParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.userAchievementService.getReward({
      id: params.userAchievementId,
      userId
    })
  }

  @Put(':userAchievementId')
  @ZodSerializerDto(UpdateUserAchievementResDTO)
  @ResponseMessage(UserAchievementMessage.UPDATE_SUCCESS)
  async update(
    @Body() body: UpdateUserAchievementBodyDTO,
    @Param() params: GetUserAchievementParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.userAchievementService.update({
      data: body,
      id: params.userAchievementId,
      userId
    })
  }

  @Delete(':userAchievementId')
  @ZodSerializerDto(MessageResDTO)
  @ResponseMessage(UserAchievementMessage.DELETE_SUCCESS)
  async delete(
    @Param() params: GetUserAchievementParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    await this.userAchievementService.delete({
      id: params.userAchievementId,
      userId
    })
  }
}
