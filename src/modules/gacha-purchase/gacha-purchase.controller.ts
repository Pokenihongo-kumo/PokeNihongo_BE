import { ResponseMessage } from '@/i18n/response-message'
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
  constructor(private readonly gachaPurchaseService: GachaPurchaseService) {}

  @Get()
  @ZodSerializerDto(PaginationResponseDTO)
  @ResponseMessage(GachaPurchaseMessage.GET_LIST_SUCCESS)
  async list(@Query() query: PaginationQueryDTO) {
    return this.gachaPurchaseService.list(query)
  }

  @Get('user')
  @ZodSerializerDto(GetGachaPurchaseListResDTO)
  @ResponseMessage(GachaPurchaseMessage.GET_LIST_SUCCESS)
  async getByUser(@ActiveUser('userId') userId: number) {
    return this.gachaPurchaseService.getByUser(userId)
  }

  @Get(':gachaPurchaseId')
  @ZodSerializerDto(GetGachaPurchaseDetailResDTO)
  @ResponseMessage(GachaPurchaseMessage.GET_LIST_SUCCESS)
  async findById(
    @Param() params: GetGachaPurchaseParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.gachaPurchaseService.findById(params.gachaPurchaseId)
  }

  @Post()
  // @ZodSerializerDto(CreateGachaPurchaseResDTO)
  @ResponseMessage(GachaPurchaseMessage.CREATE_SUCCESS)
  async create(
    @Body() body: CreateGachaPurchaseBodyDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.gachaPurchaseService.create({
      userId,
      data: body
    })
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
