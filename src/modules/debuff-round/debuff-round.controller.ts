import { I18nService } from '@/i18n/i18n.service'
import { DebuffRoundMessage } from '@/i18n/message-keys'
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
import { DebuffRoundService } from './debuff-round.service'
import {
  CreatedDebuffRoundBodyInputDTO,
  CreateDebuffRoundResDTO,
  GetDebuffRoundDetailResDTO,
  GetDebuffRoundParamsDTO,
  UpdateDebuffRoundBodyInputDTO,
  UpdateDebuffRoundResDTO
} from './dto/debuff-round.zod-dto'

@Controller('debuff-round')
@UseGuards(AuthenticationGuard)
@ApiBearerAuth()
export class DebuffRoundController {
  constructor(
    private readonly debuffRoundService: DebuffRoundService,
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
      message: this.i18nService.translate(DebuffRoundMessage.GET_LIST_SUCCESS, lang),
      data: await this.debuffRoundService.list(query, lang, roleName)
    }
  }

  @Post()
  @ZodSerializerDto(CreateDebuffRoundResDTO)
  async create(
    @Body() body: CreatedDebuffRoundBodyInputDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(DebuffRoundMessage.CREATE_SUCCESS, lang),
      data: await this.debuffRoundService.create({
        data: body,
        createdById: userId
      })
    }
  }

  @Get(':debuffRoundId')
  @ZodSerializerDto(GetDebuffRoundDetailResDTO)
  async findById(
    @Param() params: GetDebuffRoundParamsDTO,
    @I18nLang() lang: string,
    @ActiveUser('roleName') roleName: string
  ) {
    return {
      message: this.i18nService.translate(DebuffRoundMessage.GET_SUCCESS, lang),
      data: await this.debuffRoundService.findById(params.debuffRoundId, roleName, lang)
    }
  }

  @Put(':debuffRoundId')
  @ZodSerializerDto(UpdateDebuffRoundResDTO)
  async update(
    @Body() body: UpdateDebuffRoundBodyInputDTO,
    @Param() params: GetDebuffRoundParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(DebuffRoundMessage.UPDATE_SUCCESS, lang),
      data: await this.debuffRoundService.update({
        data: body,
        id: params.debuffRoundId,
        updatedById: userId
      })
    }
  }

  @Delete(':debuffRoundId')
  @ZodSerializerDto(MessageResDTO)
  async delete(
    @Param() params: GetDebuffRoundParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    await this.debuffRoundService.delete({
      id: params.debuffRoundId,
      deletedById: userId
    })
    return {
      message: this.i18nService.translate(DebuffRoundMessage.DELETE_SUCCESS, lang),
      data: null
    }
  }
}
