import { I18nService } from '@/i18n/i18n.service'
import { AchievementGroupMessage } from '@/i18n/message-keys'
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
import { AchievementGroupService } from './achievement-group.service'
import {
  CreateAchievementGroupBodyInputDTO,
  CreateAchievementGroupResDTO,
  GetAchievementGroupDetailResDTO,
  GetAchievementGroupParamsDTO,
  UpdateAchievementGroupBodyInputDTO,
  UpdateAchievementGroupResDTO
} from './dto/achievement-group.zod-dto'

@Controller('achievement-group')
@UseGuards(AuthenticationGuard)
@ApiBearerAuth()
export class AchievementGroupController {
  constructor(
    private readonly achievementGroupService: AchievementGroupService,
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
      message: this.i18nService.translate(AchievementGroupMessage.GET_LIST_SUCCESS, lang),
      data: await this.achievementGroupService.list(query, lang, roleName)
    }
  }

  @Post()
  @ZodSerializerDto(CreateAchievementGroupResDTO)
  create(
    @Body() body: CreateAchievementGroupBodyInputDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.achievementGroupService.create(
      {
        data: body,
        createdById: userId
      },
      lang
    )
  }

  @Get(':achievementGroupId')
  @ZodSerializerDto(GetAchievementGroupDetailResDTO)
  async findById(
    @Param() params: GetAchievementGroupParamsDTO,
    @I18nLang() lang: string,
    @ActiveUser('roleName') roleName: string
  ) {
    return {
      message: this.i18nService.translate(AchievementGroupMessage.GET_SUCCESS, lang),
      data: await this.achievementGroupService.findById(
        params.achievementGroupId,
        roleName,
        lang
      )
    }
  }

  @Put(':achievementGroupId')
  @ZodSerializerDto(UpdateAchievementGroupResDTO)
  update(
    @Body() body: UpdateAchievementGroupBodyInputDTO,
    @Param() params: GetAchievementGroupParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.achievementGroupService.update(
      {
        data: body,
        id: params.achievementGroupId,
        updatedById: userId
      },
      lang
    )
  }

  @Delete(':achievementGroupId')
  @ZodSerializerDto(MessageResDTO)
  async delete(
    @Param() params: GetAchievementGroupParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    await this.achievementGroupService.delete({
      id: params.achievementGroupId,
      deletedById: userId
    })
    return {
      message: this.i18nService.translate(AchievementGroupMessage.DELETE_SUCCESS, lang),
      data: null
    }
  }
}
