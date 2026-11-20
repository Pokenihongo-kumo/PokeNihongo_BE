import { ResponseMessage } from '@/i18n/response-message'
import { LeaderboardSeasonMessage } from '@/i18n/message-keys'
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
  CreatedLeaderboardSeasonBodyInputDTO,
  CreateLeaderboardSeasonResDTO,
  GetLeaderboardSeasonDetailResDTO,
  GetLeaderboardSeasonParamsDTO,
  GetLeaderboardWithRewardSeasonDetailResDTO,
  UpdateLeaderboardSeasonBodyInputDTO,
  UpdateLeaderboardSeasonResDTO
} from './dto/leaderboard-season.zod-dto'
import { LeaderboardSeasonService } from './leaderboard-season.service'

@Controller('leaderboard-season')
@UseGuards(AuthenticationGuard)
@ApiBearerAuth()
export class LeaderboardSeasonController {
  constructor(private readonly leaderboardSeasonService: LeaderboardSeasonService) {}

  @Get()
  @ZodSerializerDto(PaginationResponseSchema)
  @ResponseMessage(LeaderboardSeasonMessage.GET_LIST_SUCCESS)
  async list(
    @Query() query: PaginationQueryDTO,
    @I18nLang() lang: string,
    @ActiveUser('roleName') roleName: string
  ) {
    return this.leaderboardSeasonService.list(query, lang, roleName)
  }

  @Get('rank-list')
  // @ZodSerializerDto(PaginationResponseSchema)
  @ResponseMessage(LeaderboardSeasonMessage.GET_LIST_SUCCESS)
  async getListRankByLeaderboard(
    @Query() pagination: PaginationQueryDTO,
    @I18nLang() lang: string,
    @ActiveUser('userId') userId: number,
    @Query('rankName') rankName?: string,
    @Query('leaderboardSeasonId') leaderboardSeasonId?: string
  ) {
    return this.leaderboardSeasonService.getListRankByLeaderboard({
      id: leaderboardSeasonId ? +leaderboardSeasonId : undefined,
      lang,
      userId,
      rankName,
      pagination
    })
  }

  @Post()
  @ZodSerializerDto(CreateLeaderboardSeasonResDTO)
  @ResponseMessage(LeaderboardSeasonMessage.CREATE_SUCCESS)
  async create(
    @Body() body: CreatedLeaderboardSeasonBodyInputDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.leaderboardSeasonService.create({
      data: body,
      createdById: userId
    })
  }

  @Get('reward-now')
  @ZodSerializerDto(GetLeaderboardWithRewardSeasonDetailResDTO)
  @ResponseMessage(LeaderboardSeasonMessage.GET_LIST_SUCCESS)
  async getRewardLeaderboardSeasonNow(
    @I18nLang() lang: string,
    @ActiveUser('roleName') roleName: string
  ) {
    return this.leaderboardSeasonService.getRewardLeaderboardSeasonNow(roleName, lang)
  }

  @Get(':leaderboardSeasonId')
  @ZodSerializerDto(GetLeaderboardSeasonDetailResDTO)
  @ResponseMessage(LeaderboardSeasonMessage.GET_SUCCESS)
  async findById(
    @Param() params: GetLeaderboardSeasonParamsDTO,
    @I18nLang() lang: string,
    @ActiveUser('roleName') roleName: string
  ) {
    return this.leaderboardSeasonService.findById(
      params.leaderboardSeasonId,
      roleName,
      lang
    )
  }

  @Put(':leaderboardSeasonId')
  @ZodSerializerDto(UpdateLeaderboardSeasonResDTO)
  @ResponseMessage(LeaderboardSeasonMessage.UPDATE_SUCCESS)
  async update(
    @Body() body: UpdateLeaderboardSeasonBodyInputDTO,
    @Param() params: GetLeaderboardSeasonParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.leaderboardSeasonService.update({
      data: body,
      id: params.leaderboardSeasonId,
      updatedById: userId
    })
  }

  @Delete(':leaderboardSeasonId')
  @ZodSerializerDto(MessageResDTO)
  @ResponseMessage(LeaderboardSeasonMessage.DELETE_SUCCESS)
  async delete(
    @Param() params: GetLeaderboardSeasonParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    await this.leaderboardSeasonService.delete({
      id: params.leaderboardSeasonId,
      deletedById: userId
    })
  }
}
