import { I18nService } from '@/i18n/i18n.service'
import { UserSeasonHistoryMessage } from '@/i18n/message-keys'
import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'
import { PaginationQueryDTO } from '@/shared/dtos/request.dto'
import { MessageResDTO, PaginationResponseDTO } from '@/shared/dtos/response.dto'
import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common'
import { ZodSerializerDto } from 'nestjs-zod'
import {
  GetUserSeasonHistoryDetailResDTO,
  GetUserSeasonHistoryParamsDTO,
  UpdateUserSeasonHistoryBodyDTO,
  UpdateUserSeasonHistoryResDTO
} from './dto/user-season-history.dto'
import { UserSeasonHistoryService } from './user-season-history.service'

@Controller('user-season-history')
export class UserSeasonHistoryController {
  constructor(
    private readonly userSeasonHistoryService: UserSeasonHistoryService,
    private readonly i18nService: I18nService
  ) {}

  @Get()
  @ZodSerializerDto(PaginationResponseDTO)
  async list(@Query() query: PaginationQueryDTO, @I18nLang() lang: string) {
    return {
      message: this.i18nService.translate(
        UserSeasonHistoryMessage.GET_LIST_SUCCESS,
        lang
      ),
      data: await this.userSeasonHistoryService.list(query)
    }
  }

  @Get('user')
  @ZodSerializerDto(GetUserSeasonHistoryDetailResDTO)
  async getUserHisNow(@ActiveUser('userId') userId: number, @I18nLang() lang: string) {
    return {
      message: this.i18nService.translate(
        UserSeasonHistoryMessage.GET_LIST_SUCCESS,
        lang
      ),
      data: await this.userSeasonHistoryService.getUserHisByUserId(userId)
    }
  }

  @Get(':userSeasonHistoryId')
  @ZodSerializerDto(GetUserSeasonHistoryDetailResDTO)
  async findById(
    @Param() params: GetUserSeasonHistoryParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(
        UserSeasonHistoryMessage.GET_LIST_SUCCESS,
        lang
      ),
      data: await this.userSeasonHistoryService.findById(params.userSeasonHistoryId)
    }
  }
  @Post('join')
  // @ZodSerializerDto(CreateUserSeasonHistoryResDTO)
  async joinSeason(@ActiveUser('userId') userId: number, @I18nLang() lang: string) {
    return {
      message: this.i18nService.translate(UserSeasonHistoryMessage.CREATE_SUCCESS, lang),
      data: await this.userSeasonHistoryService.joinSeason(
        {
          userId
        },
        lang
      )
    }
  }

  @Put('get-reward/:userSeasonHistoryId')
  // @ZodSerializerDto(UpdateUserSeasonHistoryResDTO)
  async getReward(
    @Param() params: GetUserSeasonHistoryParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(
        UserSeasonHistoryMessage.GET_REWARD_SUCCESS,
        lang
      ),
      data: await this.userSeasonHistoryService.getReward({
        id: params.userSeasonHistoryId,
        userId
      })
    }
  }

  @Put(':userSeasonHistoryId')
  @ZodSerializerDto(UpdateUserSeasonHistoryResDTO)
  async update(
    @Body() body: UpdateUserSeasonHistoryBodyDTO,
    @Param() params: GetUserSeasonHistoryParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(UserSeasonHistoryMessage.UPDATE_SUCCESS, lang),
      data: await this.userSeasonHistoryService.update({
        data: body,
        id: params.userSeasonHistoryId,
        userId
      })
    }
  }

  @Delete(':userSeasonHistoryId')
  @ZodSerializerDto(MessageResDTO)
  async delete(
    @Param() params: GetUserSeasonHistoryParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    await this.userSeasonHistoryService.delete({
      id: params.userSeasonHistoryId,
      userId
    })
    return {
      message: this.i18nService.translate(UserSeasonHistoryMessage.DELETE_SUCCESS, lang),
      data: null
    }
  }
}
