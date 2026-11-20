import { ResponseMessage } from '@/i18n/response-message'
import { FeatureMessage } from '@/i18n/message-keys'
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
import {
  CreatedFeatureBodyInputDTO,
  CreateFeatureResDTO,
  GetFeatureDetailResDTO,
  GetFeatureParamsDTO,
  UpdateFeatureBodyInputDTO,
  UpdateFeatureResDTO
} from './dto/feature.zod-dto'
import { FeatureService } from './feature.service'

@Controller('feature')
@UseGuards(AuthenticationGuard)
@ApiBearerAuth()
export class FeatureController {
  constructor(private readonly FeatureService: FeatureService) {}

  @Get()
  @ZodSerializerDto(PaginationResponseSchema)
  @ResponseMessage(FeatureMessage.GET_LIST_SUCCESS)
  async list(
    @Query() query: PaginationQueryDTO,
    @I18nLang() lang: string,
    @ActiveUser('roleName') roleName: string
  ) {
    return this.FeatureService.list(query, lang, roleName)
  }

  @Post()
  @ZodSerializerDto(CreateFeatureResDTO)
  @ResponseMessage(FeatureMessage.CREATE_SUCCESS)
  async create(
    @Body() body: CreatedFeatureBodyInputDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.FeatureService.create({
      data: body,
      createdById: userId
    })
  }

  @Get(':featureId')
  @ZodSerializerDto(GetFeatureDetailResDTO)
  @ResponseMessage(FeatureMessage.GET_SUCCESS)
  async findById(
    @Param() params: GetFeatureParamsDTO,
    @I18nLang() lang: string,
    @ActiveUser('roleName') roleName: string
  ) {
    return this.FeatureService.findById(params.featureId, roleName, lang)
  }

  @Put(':featureId')
  @ZodSerializerDto(UpdateFeatureResDTO)
  @ResponseMessage(FeatureMessage.UPDATE_SUCCESS)
  async update(
    @Body() body: UpdateFeatureBodyInputDTO,
    @Param() params: GetFeatureParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.FeatureService.update({
      data: body,
      id: params.featureId,
      updatedById: userId
    })
  }

  @Delete(':featureId')
  @ZodSerializerDto(MessageResDTO)
  @ResponseMessage(FeatureMessage.DELETE_SUCCESS)
  async delete(
    @Param() params: GetFeatureParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    await this.FeatureService.delete({
      id: params.featureId,
      deletedById: userId
    })
  }
}
