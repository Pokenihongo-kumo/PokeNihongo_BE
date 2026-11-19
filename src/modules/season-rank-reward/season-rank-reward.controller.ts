import { I18nService } from '@/i18n/i18n.service'
import { SeasonRankRewardMessage } from '@/i18n/message-keys'
import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'
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
  constructor(
    private readonly seasonRankRewardService: SeasonRankRewardService,
    private readonly i18nService: I18nService
  ) {}

  @Get()
  @ZodSerializerDto(PaginationResponseDTO)
  async list(@Query() query: PaginationQueryDTO, @I18nLang() lang: string) {
    return {
      message: this.i18nService.translate(SeasonRankRewardMessage.GET_LIST_SUCCESS, lang),
      data: await this.seasonRankRewardService.list(query)
    }
  }

  @Get(':seasonRankRewardId')
  @ZodSerializerDto(GetSeasonRankRewardDetailResDTO)
  async findById(
    @Param() params: GetSeasonRankRewardParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(SeasonRankRewardMessage.GET_LIST_SUCCESS, lang),
      data: await this.seasonRankRewardService.findById(params.seasonRankRewardId)
    }
  }

  @Post()
  @ZodSerializerDto(CreateSeasonRankRewardResDTO)
  async create(
    @Body() body: CreateSeasonRankRewardBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(SeasonRankRewardMessage.CREATE_SUCCESS, lang),
      data: await this.seasonRankRewardService.create({
        userId,
        data: body
      })
    }
  }

  @Put('list')
  @ZodSerializerDto(UpdateWithListItemResDTO)
  async updateByList(
    @Body() body: UpdateWithListItemBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(SeasonRankRewardMessage.UPDATE_SUCCESS, lang),
      data: await this.seasonRankRewardService.updateByList({
        updatedById: userId,
        data: body
      })
    }
  }

  @Put(':seasonRankRewardId')
  @ZodSerializerDto(UpdateSeasonRankRewardResDTO)
  async update(
    @Body() body: UpdateSeasonRankRewardBodyDTO,
    @Param() params: GetSeasonRankRewardParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(SeasonRankRewardMessage.UPDATE_SUCCESS, lang),
      data: await this.seasonRankRewardService.update({
        data: body,
        id: params.seasonRankRewardId,
        userId
      })
    }
  }

  @Delete(':seasonRankRewardId')
  @ZodSerializerDto(MessageResDTO)
  async delete(
    @Param() params: GetSeasonRankRewardParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    await this.seasonRankRewardService.delete({
      id: params.seasonRankRewardId,
      userId
    })
    return {
      message: this.i18nService.translate(SeasonRankRewardMessage.DELETE_SUCCESS, lang),
      data: null
    }
  }
}
