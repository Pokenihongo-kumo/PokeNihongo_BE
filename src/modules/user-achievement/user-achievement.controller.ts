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
  list(@Query() query: PaginationQueryDTO, @I18nLang() lang: string) {
    return this.userAchievementService.list(query, lang)
  }

  @Get('user')
  @ZodSerializerDto(PaginationResponseDTO)
  getListAchieveforUser(
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
  findById(
    @Param() params: GetUserAchievementParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.userAchievementService.findById(params.userAchievementId, lang)
  }

  @Post()
  @ZodSerializerDto(CreateUserAchievementResDTO)
  create(
    @Body() body: CreateUserAchievementBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.userAchievementService.create(
      {
        userId,
        data: body
      },
      lang
    )
  }

  @Put('get-reward/:userAchievementId')
  // @ZodSerializerDto(UpdateUserSeasonHistoryResDTO)
  getReward(
    @Param() params: GetUserAchievementParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.userAchievementService.getReward(
      {
        id: params.userAchievementId,
        userId
      },
      lang
    )
  }

  @Put(':userAchievementId')
  @ZodSerializerDto(UpdateUserAchievementResDTO)
  update(
    @Body() body: UpdateUserAchievementBodyDTO,
    @Param() params: GetUserAchievementParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.userAchievementService.update(
      {
        data: body,
        id: params.userAchievementId,
        userId
      },
      lang
    )
  }

  @Delete(':userAchievementId')
  @ZodSerializerDto(MessageResDTO)
  delete(
    @Param() params: GetUserAchievementParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.userAchievementService.delete(
      {
        id: params.userAchievementId,
        userId
      },
      lang
    )
  }
}
