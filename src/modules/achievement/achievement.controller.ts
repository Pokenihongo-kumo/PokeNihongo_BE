import { I18nService } from '@/i18n/i18n.service'
import { AchievementMessage } from '@/i18n/message-keys'
import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { AuthenticationGuard } from '@/common/guards/authentication.guard'
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'
import { PaginationQueryDTO } from '@/shared/dtos/request.dto'
import { MessageResDTO } from '@/shared/dtos/response.dto'
import { PaginationResponseSchema } from '@/shared/models/response.model'
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards
} from '@nestjs/common'
import { ApiBearerAuth } from '@nestjs/swagger'
import { ZodSerializerDto } from 'nestjs-zod'
import { AchievementService } from './achievement.service'
import {
  CreateAchievementBodyInputDTO,
  CreateAchievementResDTO,
  GetAchievementDetailResDTO,
  GetAchievementParamsDTO,
  UpdateAchievementBodyInputDTO,
  UpdateAchievementResDTO
} from './dto/achievement.zod-dto'

@Controller('achievement')
@UseGuards(AuthenticationGuard)
@ApiBearerAuth()
export class AchievementController {
  constructor(
    private readonly achievementService: AchievementService,
    private readonly i18nService: I18nService
  ) {}

  @Get()
  @ZodSerializerDto(PaginationResponseSchema)
  async list(
    @Query() query: PaginationQueryDTO,
    @I18nLang() lang: string,
    @ActiveUser('roleName') roleName: string
  ) {
    return {
      message: this.i18nService.translate(AchievementMessage.GET_LIST_SUCCESS, lang),
      data: await this.achievementService.list(query, lang, roleName)
    }
  }

  @Post()
  @ZodSerializerDto(CreateAchievementResDTO)
  async create(
    @Body() body: CreateAchievementBodyInputDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(AchievementMessage.CREATE_SUCCESS, lang),
      data: await this.achievementService.create({
        data: body,
        createdById: userId
      })
    }
  }

  @Get(':achievementId')
  @ZodSerializerDto(GetAchievementDetailResDTO)
  async findById(
    @Param() params: GetAchievementParamsDTO,
    @I18nLang() lang: string,
    @ActiveUser('roleName') roleName: string
  ) {
    return {
      message: this.i18nService.translate(AchievementMessage.GET_SUCCESS, lang),
      data: await this.achievementService.findById(params.achievementId, roleName, lang)
    }
  }

  @Put(':achievementId')
  @ZodSerializerDto(UpdateAchievementResDTO)
  async update(
    @Body() body: UpdateAchievementBodyInputDTO,
    @Param() params: GetAchievementParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(AchievementMessage.UPDATE_SUCCESS, lang),
      data: await this.achievementService.update({
        data: body,
        id: params.achievementId,
        updatedById: userId
      })
    }
  }

  @Delete(':achievementId')
  @ZodSerializerDto(MessageResDTO)
  async delete(
    @Param() params: GetAchievementParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    await this.achievementService.delete({
      id: params.achievementId,
      deletedById: userId
    })
    return {
      message: this.i18nService.translate(AchievementMessage.DELETE_SUCCESS, lang),
      data: null
    }
  }
}
