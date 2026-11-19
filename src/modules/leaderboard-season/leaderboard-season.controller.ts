import { I18nService } from '@/i18n/i18n.service'
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
  constructor(
    private readonly leaderboardSeasonService: LeaderboardSeasonService,
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
      message: this.i18nService.translate(
        LeaderboardSeasonMessage.GET_LIST_SUCCESS,
        lang
      ),
      data: await this.leaderboardSeasonService.list(query, lang, roleName)
    }
  }

  @Get('rank-list')
  // @ZodSerializerDto(PaginationResponseSchema)
  async getListRankByLeaderboard(
    @Query() pagination: PaginationQueryDTO,
    @I18nLang() lang: string,
    @ActiveUser('userId') userId: number,
    @Query('rankName') rankName?: string,
    @Query('leaderboardSeasonId') leaderboardSeasonId?: string
  ) {
    return {
      message: this.i18nService.translate(
        LeaderboardSeasonMessage.GET_LIST_SUCCESS,
        lang
      ),
      data: await this.leaderboardSeasonService.getListRankByLeaderboard({
        id: leaderboardSeasonId ? +leaderboardSeasonId : undefined,
        lang,
        userId,
        rankName,
        pagination
      })
    }
  }

  @Post()
  @ZodSerializerDto(CreateLeaderboardSeasonResDTO)
  async create(
    @Body() body: CreatedLeaderboardSeasonBodyInputDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(LeaderboardSeasonMessage.CREATE_SUCCESS, lang),
      data: await this.leaderboardSeasonService.create({
        data: body,
        createdById: userId
      })
    }
  }

  @Get('reward-now')
  @ZodSerializerDto(GetLeaderboardWithRewardSeasonDetailResDTO)
  async getRewardLeaderboardSeasonNow(
    @I18nLang() lang: string,
    @ActiveUser('roleName') roleName: string
  ) {
    return {
      message: this.i18nService.translate(
        LeaderboardSeasonMessage.GET_LIST_SUCCESS,
        lang
      ),
      data: await this.leaderboardSeasonService.getRewardLeaderboardSeasonNow(
        roleName,
        lang
      )
    }
  }

  @Get(':leaderboardSeasonId')
  @ZodSerializerDto(GetLeaderboardSeasonDetailResDTO)
  async findById(
    @Param() params: GetLeaderboardSeasonParamsDTO,
    @I18nLang() lang: string,
    @ActiveUser('roleName') roleName: string
  ) {
    return {
      message: this.i18nService.translate(LeaderboardSeasonMessage.GET_SUCCESS, lang),
      data: await this.leaderboardSeasonService.findById(
        params.leaderboardSeasonId,
        roleName,
        lang
      )
    }
  }

  @Put(':leaderboardSeasonId')
  @ZodSerializerDto(UpdateLeaderboardSeasonResDTO)
  async update(
    @Body() body: UpdateLeaderboardSeasonBodyInputDTO,
    @Param() params: GetLeaderboardSeasonParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(LeaderboardSeasonMessage.UPDATE_SUCCESS, lang),
      data: await this.leaderboardSeasonService.update({
        data: body,
        id: params.leaderboardSeasonId,
        updatedById: userId
      })
    }
  }

  @Delete(':leaderboardSeasonId')
  @ZodSerializerDto(MessageResDTO)
  async delete(
    @Param() params: GetLeaderboardSeasonParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    await this.leaderboardSeasonService.delete({
      id: params.leaderboardSeasonId,
      deletedById: userId
    })
    return {
      message: this.i18nService.translate(LeaderboardSeasonMessage.DELETE_SUCCESS, lang),
      data: null
    }
  }
}
