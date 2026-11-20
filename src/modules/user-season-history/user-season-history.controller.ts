import { ResponseMessage } from '@/i18n/response-message'
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
  constructor(private readonly userSeasonHistoryService: UserSeasonHistoryService) {}

  @Get()
  @ZodSerializerDto(PaginationResponseDTO)
  @ResponseMessage(UserSeasonHistoryMessage.GET_LIST_SUCCESS)
  async list(@Query() query: PaginationQueryDTO) {
    return this.userSeasonHistoryService.list(query)
  }

  @Get('user')
  @ZodSerializerDto(GetUserSeasonHistoryDetailResDTO)
  @ResponseMessage(UserSeasonHistoryMessage.GET_LIST_SUCCESS)
  async getUserHisNow(@ActiveUser('userId') userId: number) {
    return this.userSeasonHistoryService.getUserHisByUserId(userId)
  }

  @Get(':userSeasonHistoryId')
  @ZodSerializerDto(GetUserSeasonHistoryDetailResDTO)
  @ResponseMessage(UserSeasonHistoryMessage.GET_LIST_SUCCESS)
  async findById(
    @Param() params: GetUserSeasonHistoryParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.userSeasonHistoryService.findById(params.userSeasonHistoryId)
  }
  @Post('join')
  // @ZodSerializerDto(CreateUserSeasonHistoryResDTO)
  @ResponseMessage(UserSeasonHistoryMessage.CREATE_SUCCESS)
  async joinSeason(@ActiveUser('userId') userId: number, @I18nLang() lang: string) {
    return this.userSeasonHistoryService.joinSeason(
      {
        userId
      },
      lang
    )
  }

  @Put('get-reward/:userSeasonHistoryId')
  // @ZodSerializerDto(UpdateUserSeasonHistoryResDTO)
  @ResponseMessage(UserSeasonHistoryMessage.GET_REWARD_SUCCESS)
  async getReward(
    @Param() params: GetUserSeasonHistoryParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.userSeasonHistoryService.getReward({
      id: params.userSeasonHistoryId,
      userId
    })
  }

  @Put(':userSeasonHistoryId')
  @ZodSerializerDto(UpdateUserSeasonHistoryResDTO)
  @ResponseMessage(UserSeasonHistoryMessage.UPDATE_SUCCESS)
  async update(
    @Body() body: UpdateUserSeasonHistoryBodyDTO,
    @Param() params: GetUserSeasonHistoryParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.userSeasonHistoryService.update({
      data: body,
      id: params.userSeasonHistoryId,
      userId
    })
  }

  @Delete(':userSeasonHistoryId')
  @ZodSerializerDto(MessageResDTO)
  @ResponseMessage(UserSeasonHistoryMessage.DELETE_SUCCESS)
  async delete(
    @Param() params: GetUserSeasonHistoryParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    await this.userSeasonHistoryService.delete({
      id: params.userSeasonHistoryId,
      userId
    })
  }
}
