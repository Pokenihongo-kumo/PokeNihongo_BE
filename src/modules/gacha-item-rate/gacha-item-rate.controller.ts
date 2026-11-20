import { ResponseMessage } from '@/i18n/response-message'
import { GachaItemRateMessage } from '@/i18n/message-keys'
import { ActiveUser } from '@/common/decorators/active-user.decorator'
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
  constructor(private readonly gachaItemRateService: GachaItemRateService) {}

  @Get()
  @ZodSerializerDto(PaginationResponseDTO)
  @ResponseMessage(GachaItemRateMessage.GET_LIST_SUCCESS)
  async list(@Query() query: PaginationQueryDTO) {
    return this.gachaItemRateService.list(query)
  }

  @Get(':gachaItemRateId')
  @ZodSerializerDto(GetGachaItemRateDetailResDTO)
  @ResponseMessage(GachaItemRateMessage.GET_LIST_SUCCESS)
  async findById(
    @Param() params: GetGachaItemRateParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.gachaItemRateService.findById(params.gachaItemRateId)
  }

  @Post()
  @ZodSerializerDto(CreateGachaItemRateResDTO)
  @ResponseMessage(GachaItemRateMessage.CREATE_SUCCESS)
  async create(
    @Body() body: CreateGachaItemRateBodyDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.gachaItemRateService.create({
      userId,
      data: body
    })
  }

  @Put(':gachaItemRateId')
  @ZodSerializerDto(UpdateGachaItemRateResDTO)
  @ResponseMessage(GachaItemRateMessage.UPDATE_SUCCESS)
  async update(
    @Body() body: UpdateGachaItemRateBodyDTO,
    @Param() params: GetGachaItemRateParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.gachaItemRateService.update({
      data: body,
      id: params.gachaItemRateId,
      userId
    })
  }

  @Delete(':gachaItemRateId')
  @ZodSerializerDto(MessageResDTO)
  @ResponseMessage(GachaItemRateMessage.DELETE_SUCCESS)
  async delete(
    @Param() params: GetGachaItemRateParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    await this.gachaItemRateService.delete({
      id: params.gachaItemRateId,
      userId
    })
  }
}
