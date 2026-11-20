import { ResponseMessage } from '@/i18n/response-message'
import { SeasonRankRewardMessage } from '@/i18n/message-keys'
import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { PaginationQueryDTO } from '@/shared/dtos/request.dto'
import { MessageResDTO, PaginationResponseDTO } from '@/shared/dtos/response.dto'
import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common'
import { ZodSerializerDto } from 'nestjs-zod'
import {
  CreateSeasonRankRewardBodyDTO,
  CreateSeasonRankRewardResDTO,
  GetSeasonRankRewardDetailResDTO,
  GetSeasonRankRewardParamsDTO,
  UpdateSeasonRankRewardBodyDTO,
  UpdateSeasonRankRewardResDTO,
  UpdateWithListItemBodyDTO,
  UpdateWithListItemResDTO
} from './dto/season-rank-reward.dto'
import { SeasonRankRewardService } from './season-rank-reward.service'

@Controller('season-rank-reward')
export class SeasonRankRewardController {
  constructor(private readonly seasonRankRewardService: SeasonRankRewardService) {}

  @Get()
  @ZodSerializerDto(PaginationResponseDTO)
  @ResponseMessage(SeasonRankRewardMessage.GET_LIST_SUCCESS)
  async list(@Query() query: PaginationQueryDTO) {
    return this.seasonRankRewardService.list(query)
  }

  @Get(':seasonRankRewardId')
  @ZodSerializerDto(GetSeasonRankRewardDetailResDTO)
  @ResponseMessage(SeasonRankRewardMessage.GET_LIST_SUCCESS)
  async findById(
    @Param() params: GetSeasonRankRewardParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.seasonRankRewardService.findById(params.seasonRankRewardId)
  }

  @Post()
  @ZodSerializerDto(CreateSeasonRankRewardResDTO)
  @ResponseMessage(SeasonRankRewardMessage.CREATE_SUCCESS)
  async create(
    @Body() body: CreateSeasonRankRewardBodyDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.seasonRankRewardService.create({
      userId,
      data: body
    })
  }

  @Put('list')
  @ZodSerializerDto(UpdateWithListItemResDTO)
  @ResponseMessage(SeasonRankRewardMessage.UPDATE_SUCCESS)
  async updateByList(
    @Body() body: UpdateWithListItemBodyDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.seasonRankRewardService.updateByList({
      updatedById: userId,
      data: body
    })
  }

  @Put(':seasonRankRewardId')
  @ZodSerializerDto(UpdateSeasonRankRewardResDTO)
  @ResponseMessage(SeasonRankRewardMessage.UPDATE_SUCCESS)
  async update(
    @Body() body: UpdateSeasonRankRewardBodyDTO,
    @Param() params: GetSeasonRankRewardParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.seasonRankRewardService.update({
      data: body,
      id: params.seasonRankRewardId,
      userId
    })
  }

  @Delete(':seasonRankRewardId')
  @ZodSerializerDto(MessageResDTO)
  @ResponseMessage(SeasonRankRewardMessage.DELETE_SUCCESS)
  async delete(
    @Param() params: GetSeasonRankRewardParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    await this.seasonRankRewardService.delete({
      id: params.seasonRankRewardId,
      userId
    })
  }
}
