import { I18nService } from '@/i18n/i18n.service'
import { GachaItemRateMessage } from '@/i18n/message-keys'
import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'
import { PaginationQueryDTO } from '@/shared/dtos/request.dto'
import { MessageResDTO, PaginationResponseDTO } from '@/shared/dtos/response.dto'
import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common'
import { ZodSerializerDto } from 'nestjs-zod'
import {
  CreateGachaItemRateBodyDTO,
  CreateGachaItemRateResDTO,
  GetGachaItemRateDetailResDTO,
  GetGachaItemRateParamsDTO,
  UpdateGachaItemRateBodyDTO,
  UpdateGachaItemRateResDTO
} from './dto/gacha-item-rate.dto'
import { GachaItemRateService } from './gacha-item-rate.service'

@Controller('gacha-item-rate')
export class GachaItemRateController {
  constructor(
    private readonly gachaItemRateService: GachaItemRateService,
    private readonly i18nService: I18nService
  ) {}

  @Get()
  @ZodSerializerDto(PaginationResponseDTO)
  async list(@Query() query: PaginationQueryDTO, @I18nLang() lang: string) {
    return {
      message: this.i18nService.translate(GachaItemRateMessage.GET_LIST_SUCCESS, lang),
      data: await this.gachaItemRateService.list(query)
    }
  }

  @Get(':gachaItemRateId')
  @ZodSerializerDto(GetGachaItemRateDetailResDTO)
  async findById(
    @Param() params: GetGachaItemRateParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(GachaItemRateMessage.GET_LIST_SUCCESS, lang),
      data: await this.gachaItemRateService.findById(params.gachaItemRateId)
    }
  }

  @Post()
  @ZodSerializerDto(CreateGachaItemRateResDTO)
  async create(
    @Body() body: CreateGachaItemRateBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(GachaItemRateMessage.CREATE_SUCCESS, lang),
      data: await this.gachaItemRateService.create({
        userId,
        data: body
      })
    }
  }

  @Put(':gachaItemRateId')
  @ZodSerializerDto(UpdateGachaItemRateResDTO)
  async update(
    @Body() body: UpdateGachaItemRateBodyDTO,
    @Param() params: GetGachaItemRateParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(GachaItemRateMessage.UPDATE_SUCCESS, lang),
      data: await this.gachaItemRateService.update({
        data: body,
        id: params.gachaItemRateId,
        userId
      })
    }
  }

  @Delete(':gachaItemRateId')
  @ZodSerializerDto(MessageResDTO)
  async delete(
    @Param() params: GetGachaItemRateParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    await this.gachaItemRateService.delete({
      id: params.gachaItemRateId,
      userId
    })
    return {
      message: this.i18nService.translate(GachaItemRateMessage.DELETE_SUCCESS, lang),
      data: null
    }
  }
}
