import { I18nService } from '@/i18n/i18n.service'
import { GachaRollHistoryMessage } from '@/i18n/message-keys'
import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'
import { PaginationQueryDTO } from '@/shared/dtos/request.dto'
import { MessageResDTO, PaginationResponseDTO } from '@/shared/dtos/response.dto'
import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common'
import { ZodSerializerDto } from 'nestjs-zod'
import {
  CreateGachaRollHistoryBodyDTO,
  CreateGachaRollHistoryResDTO,
  GetGachaRollHistoryDetailResDTO,
  GetGachaRollHistoryParamsDTO,
  UpdateGachaRollHistoryBodyDTO,
  UpdateGachaRollHistoryResDTO
} from './dto/gacha-roll-history.dto'
import { GachaRollHistoryService } from './gacha-roll-history.service'

@Controller('gacha-roll-history')
export class GachaRollHistoryController {
  constructor(
    private readonly gachaRollHistoryService: GachaRollHistoryService,
    private readonly i18nService: I18nService
  ) {}

  @Get()
  @ZodSerializerDto(PaginationResponseDTO)
  async list(@Query() query: PaginationQueryDTO, @I18nLang() lang: string) {
    return {
      message: this.i18nService.translate(GachaRollHistoryMessage.GET_LIST_SUCCESS, lang),
      data: await this.gachaRollHistoryService.list(query)
    }
  }

  @Get('user')
  @ZodSerializerDto(PaginationResponseDTO)
  async getGachasHisByUser(
    @Query() query: PaginationQueryDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(GachaRollHistoryMessage.GET_LIST_SUCCESS, lang),
      data: await this.gachaRollHistoryService.getGachasHisByUser(userId, query)
    }
  }

  @Get(':gachaRollHistoryId')
  @ZodSerializerDto(GetGachaRollHistoryDetailResDTO)
  async findById(
    @Param() params: GetGachaRollHistoryParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(GachaRollHistoryMessage.GET_LIST_SUCCESS, lang),
      data: await this.gachaRollHistoryService.findById(params.gachaRollHistoryId)
    }
  }

  @Post()
  @ZodSerializerDto(CreateGachaRollHistoryResDTO)
  async create(
    @Body() body: CreateGachaRollHistoryBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(GachaRollHistoryMessage.CREATE_SUCCESS, lang),
      data: await this.gachaRollHistoryService.create({
        userId,
        data: body
      })
    }
  }

  @Put(':gachaRollHistoryId')
  @ZodSerializerDto(UpdateGachaRollHistoryResDTO)
  async update(
    @Body() body: UpdateGachaRollHistoryBodyDTO,
    @Param() params: GetGachaRollHistoryParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(GachaRollHistoryMessage.UPDATE_SUCCESS, lang),
      data: await this.gachaRollHistoryService.update({
        data: body,
        id: params.gachaRollHistoryId,
        userId
      })
    }
  }

  @Delete(':gachaRollHistoryId')
  @ZodSerializerDto(MessageResDTO)
  async delete(
    @Param() params: GetGachaRollHistoryParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    await this.gachaRollHistoryService.delete({
      id: params.gachaRollHistoryId,
      userId
    })
    return {
      message: this.i18nService.translate(GachaRollHistoryMessage.DELETE_SUCCESS, lang),
      data: null
    }
  }
}
