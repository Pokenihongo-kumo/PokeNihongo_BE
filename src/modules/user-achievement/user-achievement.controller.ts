import { I18nService } from '@/i18n/i18n.service'
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
  constructor(
    private readonly userAchievementService: UserAchievementService,
    private readonly i18nService: I18nService
  ) {}

  @Get()
  @ZodSerializerDto(PaginationResponseDTO)
  async list(@Query() query: PaginationQueryDTO, @I18nLang() lang: string) {
    return {
      message: this.i18nService.translate(UserAchievementMessage.GET_LIST_SUCCESS, lang),
      data: await this.userAchievementService.list(query)
    }
  }

  @Get('user')
  @ZodSerializerDto(PaginationResponseDTO)
  async getListAchieveforUser(
    @Query() query: GetUserAchievementListForUserQueryDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    const { achCurrentPage, achPageSize, achievementGroupId, ...pagination } = query
    return {
      message: this.i18nService.translate(UserAchievementMessage.GET_LIST_SUCCESS, lang),
      data: await this.userAchievementService.getListAchieveforUser(
        userId,
        lang,
        pagination,
        achCurrentPage,
        achPageSize,
        achievementGroupId
      )
    }
  }

  @Get(':userAchievementId')
  @ZodSerializerDto(GetUserAchievementDetailResDTO)
  async findById(
    @Param() params: GetUserAchievementParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(UserAchievementMessage.GET_LIST_SUCCESS, lang),
      data: await this.userAchievementService.findById(params.userAchievementId)
    }
  }

  @Post()
  @ZodSerializerDto(CreateUserAchievementResDTO)
  async create(
    @Body() body: CreateUserAchievementBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(UserAchievementMessage.CREATE_SUCCESS, lang),
      data: await this.userAchievementService.create({
        userId,
        data: body
      })
    }
  }

  @Put('get-reward/:userAchievementId')
  // @ZodSerializerDto(UpdateUserSeasonHistoryResDTO)
  async getReward(
    @Param() params: GetUserAchievementParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(
        UserAchievementMessage.GET_REWARD_SUCCESS,
        lang
      ),
      data: await this.userAchievementService.getReward({
        id: params.userAchievementId,
        userId
      })
    }
  }

  @Put(':userAchievementId')
  @ZodSerializerDto(UpdateUserAchievementResDTO)
  async update(
    @Body() body: UpdateUserAchievementBodyDTO,
    @Param() params: GetUserAchievementParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(UserAchievementMessage.UPDATE_SUCCESS, lang),
      data: await this.userAchievementService.update({
        data: body,
        id: params.userAchievementId,
        userId
      })
    }
  }

  @Delete(':userAchievementId')
  @ZodSerializerDto(MessageResDTO)
  async delete(
    @Param() params: GetUserAchievementParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    await this.userAchievementService.delete({
      id: params.userAchievementId,
      userId
    })
    return {
      message: this.i18nService.translate(UserAchievementMessage.DELETE_SUCCESS, lang),
      data: null
    }
  }
}
