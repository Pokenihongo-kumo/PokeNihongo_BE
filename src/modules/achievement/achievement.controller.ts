import { ResponseMessage } from '@/i18n/response-message'
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
  constructor(private readonly achievementService: AchievementService) {}

  @Get()
  @ZodSerializerDto(PaginationResponseSchema)
  @ResponseMessage(AchievementMessage.GET_LIST_SUCCESS)
  async list(
    @Query() query: PaginationQueryDTO,
    @I18nLang() lang: string,
    @ActiveUser('roleName') roleName: string
  ) {
    return this.achievementService.list(query, lang, roleName)
  }

  @Post()
  @ZodSerializerDto(CreateAchievementResDTO)
  @ResponseMessage(AchievementMessage.CREATE_SUCCESS)
  async create(
    @Body() body: CreateAchievementBodyInputDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.achievementService.create({
      data: body,
      createdById: userId
    })
  }

  @Get(':achievementId')
  @ZodSerializerDto(GetAchievementDetailResDTO)
  @ResponseMessage(AchievementMessage.GET_SUCCESS)
  async findById(
    @Param() params: GetAchievementParamsDTO,
    @I18nLang() lang: string,
    @ActiveUser('roleName') roleName: string
  ) {
    return this.achievementService.findById(params.achievementId, roleName, lang)
  }

  @Put(':achievementId')
  @ZodSerializerDto(UpdateAchievementResDTO)
  @ResponseMessage(AchievementMessage.UPDATE_SUCCESS)
  async update(
    @Body() body: UpdateAchievementBodyInputDTO,
    @Param() params: GetAchievementParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.achievementService.update({
      data: body,
      id: params.achievementId,
      updatedById: userId
    })
  }

  @Delete(':achievementId')
  @ZodSerializerDto(MessageResDTO)
  @ResponseMessage(AchievementMessage.DELETE_SUCCESS)
  async delete(
    @Param() params: GetAchievementParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    await this.achievementService.delete({
      id: params.achievementId,
      deletedById: userId
    })
  }
}
