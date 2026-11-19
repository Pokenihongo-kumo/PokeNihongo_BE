import { I18nService } from '@/i18n/i18n.service'
import { GachaPurchaseMessage } from '@/i18n/message-keys'
import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'
import { PaginationQueryDTO } from '@/shared/dtos/request.dto'
import { PaginationResponseDTO } from '@/shared/dtos/response.dto'
import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common'
import { ZodSerializerDto } from 'nestjs-zod'
import {
  CreateGachaPurchaseBodyDTO,
  GetGachaPurchaseDetailResDTO,
  GetGachaPurchaseListResDTO,
  GetGachaPurchaseParamsDTO
} from './dto/gacha-purchase.dto'
import { GachaPurchaseService } from './gacha-purchase.service'

@Controller('gacha-purchase')
export class GachaPurchaseController {
  constructor(
    private readonly gachaPurchaseService: GachaPurchaseService,
    private readonly i18nService: I18nService
  ) {}

  @Get()
  @ZodSerializerDto(PaginationResponseDTO)
  async list(@Query() query: PaginationQueryDTO, @I18nLang() lang: string) {
    return {
      message: this.i18nService.translate(GachaPurchaseMessage.GET_LIST_SUCCESS, lang),
      data: await this.gachaPurchaseService.list(query)
    }
  }

  @Get('user')
  @ZodSerializerDto(GetGachaPurchaseListResDTO)
  async getByUser(@ActiveUser('userId') userId: number, @I18nLang() lang: string) {
    return {
      message: this.i18nService.translate(GachaPurchaseMessage.GET_LIST_SUCCESS, lang),
      data: await this.gachaPurchaseService.getByUser(userId)
    }
  }

  @Get(':gachaPurchaseId')
  @ZodSerializerDto(GetGachaPurchaseDetailResDTO)
  async findById(
    @Param() params: GetGachaPurchaseParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(GachaPurchaseMessage.GET_LIST_SUCCESS, lang),
      data: await this.gachaPurchaseService.findById(params.gachaPurchaseId)
    }
  }

  @Post()
  // @ZodSerializerDto(CreateGachaPurchaseResDTO)
  async create(
    @Body() body: CreateGachaPurchaseBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(GachaPurchaseMessage.CREATE_SUCCESS, lang),
      data: await this.gachaPurchaseService.create({
        userId,
        data: body
      })
    }
  }

  // @Put(':gachaPurchaseId')
  // @ZodSerializerDto(UpdateGachaPurchaseResDTO)
  // update(
  //   @Body() body: UpdateGachaPurchaseBodyDTO,
  //   @Param() params: GetGachaPurchaseParamsDTO,
  //   @ActiveUser('userId') userId: number,
  //   @I18nLang() lang: string
  // ) {
  //   return this.gachaPurchaseService.update(
  //     {
  //       data: body,
  //       id: params.gachaPurchaseId,
  //       userId
  //     },
  //     lang
  //   )
  // }

  // @Delete(':gachaPurchaseId')
  // @ZodSerializerDto(MessageResDTO)
  // delete(
  //   @Param() params: GetGachaPurchaseParamsDTO,
  //   @ActiveUser('userId') userId: number,
  //   @I18nLang() lang: string
  // ) {
  //   return this.gachaPurchaseService.delete(
  //     {
  //       id: params.gachaPurchaseId,
  //       userId
  //     },
  //     lang
  //   )
  // }
}
