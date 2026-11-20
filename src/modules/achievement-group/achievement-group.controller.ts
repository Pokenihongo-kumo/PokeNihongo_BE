import { ResponseMessage } from '@/i18n/response-message'
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
  constructor(private readonly achievementGroupService: AchievementGroupService) {}

  @Get()
  @ZodSerializerDto(PaginationResponseSchema)
  @ResponseMessage(AchievementGroupMessage.GET_LIST_SUCCESS)
  async list(
    @Query() query: PaginationQueryDTO,
    @I18nLang() lang: string,
    @ActiveUser('roleName') roleName: string
  ) {
    return this.achievementGroupService.list(query, lang, roleName)
  }

  @Post()
  @ZodSerializerDto(CreateAchievementGroupResDTO)
  @ResponseMessage(AchievementGroupMessage.CREATE_SUCCESS)
  async create(
    @Body() body: CreateAchievementGroupBodyInputDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.achievementGroupService.create({
      data: body,
      createdById: userId
    })
  }

  @Get(':achievementGroupId')
  @ZodSerializerDto(GetAchievementGroupDetailResDTO)
  @ResponseMessage(AchievementGroupMessage.GET_SUCCESS)
  async findById(
    @Param() params: GetAchievementGroupParamsDTO,
    @I18nLang() lang: string,
    @ActiveUser('roleName') roleName: string
  ) {
    return this.achievementGroupService.findById(
      params.achievementGroupId,
      roleName,
      lang
    )
  }

  @Put(':achievementGroupId')
  @ZodSerializerDto(UpdateAchievementGroupResDTO)
  @ResponseMessage(AchievementGroupMessage.UPDATE_SUCCESS)
  async update(
    @Body() body: UpdateAchievementGroupBodyInputDTO,
    @Param() params: GetAchievementGroupParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.achievementGroupService.update({
      data: body,
      id: params.achievementGroupId,
      updatedById: userId
    })
  }

  @Delete(':achievementGroupId')
  @ZodSerializerDto(MessageResDTO)
  @ResponseMessage(AchievementGroupMessage.DELETE_SUCCESS)
  async delete(
    @Param() params: GetAchievementGroupParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    await this.achievementGroupService.delete({
      id: params.achievementGroupId,
      deletedById: userId
    })
  }
}
