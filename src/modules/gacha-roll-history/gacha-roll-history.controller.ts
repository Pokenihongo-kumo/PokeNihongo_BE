import { ResponseMessage } from '@/i18n/response-message'
import { GachaRollHistoryMessage } from '@/i18n/message-keys'
import { ActiveUser } from '@/common/decorators/active-user.decorator'
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
  constructor(private readonly gachaRollHistoryService: GachaRollHistoryService) {}

  @Get()
  @ZodSerializerDto(PaginationResponseDTO)
  @ResponseMessage(GachaRollHistoryMessage.GET_LIST_SUCCESS)
  async list(@Query() query: PaginationQueryDTO) {
    return this.gachaRollHistoryService.list(query)
  }

  @Get('user')
  @ZodSerializerDto(PaginationResponseDTO)
  @ResponseMessage(GachaRollHistoryMessage.GET_LIST_SUCCESS)
  async getGachasHisByUser(
    @Query() query: PaginationQueryDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.gachaRollHistoryService.getGachasHisByUser(userId, query)
  }

  @Get(':gachaRollHistoryId')
  @ZodSerializerDto(GetGachaRollHistoryDetailResDTO)
  @ResponseMessage(GachaRollHistoryMessage.GET_LIST_SUCCESS)
  async findById(
    @Param() params: GetGachaRollHistoryParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.gachaRollHistoryService.findById(params.gachaRollHistoryId)
  }

  @Post()
  @ZodSerializerDto(CreateGachaRollHistoryResDTO)
  @ResponseMessage(GachaRollHistoryMessage.CREATE_SUCCESS)
  async create(
    @Body() body: CreateGachaRollHistoryBodyDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.gachaRollHistoryService.create({
      userId,
      data: body
    })
  }

  @Put(':gachaRollHistoryId')
  @ZodSerializerDto(UpdateGachaRollHistoryResDTO)
  @ResponseMessage(GachaRollHistoryMessage.UPDATE_SUCCESS)
  async update(
    @Body() body: UpdateGachaRollHistoryBodyDTO,
    @Param() params: GetGachaRollHistoryParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.gachaRollHistoryService.update({
      data: body,
      id: params.gachaRollHistoryId,
      userId
    })
  }

  @Delete(':gachaRollHistoryId')
  @ZodSerializerDto(MessageResDTO)
  @ResponseMessage(GachaRollHistoryMessage.DELETE_SUCCESS)
  async delete(
    @Param() params: GetGachaRollHistoryParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    await this.gachaRollHistoryService.delete({
      id: params.gachaRollHistoryId,
      userId
    })
  }
}
