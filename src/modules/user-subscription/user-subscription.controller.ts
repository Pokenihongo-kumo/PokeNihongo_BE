import { I18nService } from '@/i18n/i18n.service'
import { UserSubscriptionMessage } from '@/i18n/message-keys'
import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'
import { PaginationQueryDTO } from '@/shared/dtos/request.dto'
import { MessageResDTO, PaginationResponseDTO } from '@/shared/dtos/response.dto'
import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common'
import { ZodSerializerDto } from 'nestjs-zod'
import {
  CreateUserSubscriptionBodyDTO,
  CreateUserSubscriptionResDTO,
  GetUserSubscriptionDetailResDTO,
  GetUserSubscriptionParamsDTO,
  UpdateUserSubscriptionBodyDTO,
  UpdateUserSubscriptionResDTO
} from './dto/user-subscription.dto'
import { UserSubscriptionService } from './user-subscription.service'

@Controller('user-subscription')
export class UserSubscriptionController {
  constructor(
    private readonly userSubscriptionService: UserSubscriptionService,
    private readonly i18nService: I18nService
  ) {}

  @Get()
  @ZodSerializerDto(PaginationResponseDTO)
  async list(@Query() query: PaginationQueryDTO, @I18nLang() lang: string) {
    return {
      message: this.i18nService.translate(UserSubscriptionMessage.GET_LIST_SUCCESS, lang),
      data: await this.userSubscriptionService.list(query)
    }
  }

  @Get('user')
  @ZodSerializerDto(PaginationResponseDTO)
  async getUserSubWithSubPlan(
    @Query() query: PaginationQueryDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(UserSubscriptionMessage.GET_LIST_SUCCESS, lang),
      data: await this.userSubscriptionService.getUserSubWithSubPlan(query, userId, lang)
    }
  }

  @Get('user/features')
  // @ZodSerializerDto(PaginationResponseDTO)
  async getListFeatureOfUser(
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(UserSubscriptionMessage.GET_LIST_SUCCESS, lang),
      data: await this.userSubscriptionService.getListFeatureOfUser(userId)
    }
  }

  @Get(':userSubscriptionId')
  @ZodSerializerDto(GetUserSubscriptionDetailResDTO)
  async findById(
    @Param() params: GetUserSubscriptionParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(UserSubscriptionMessage.GET_LIST_SUCCESS, lang),
      data: await this.userSubscriptionService.findById(params.userSubscriptionId)
    }
  }
  @Post()
  @ZodSerializerDto(CreateUserSubscriptionResDTO)
  async create(
    @Body() body: CreateUserSubscriptionBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(UserSubscriptionMessage.CREATE_SUCCESS, lang),
      data: await this.userSubscriptionService.create({
        userId,
        data: body
      })
    }
  }

  @Put(':userSubscriptionId')
  @ZodSerializerDto(UpdateUserSubscriptionResDTO)
  async update(
    @Body() body: UpdateUserSubscriptionBodyDTO,
    @Param() params: GetUserSubscriptionParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(UserSubscriptionMessage.UPDATE_SUCCESS, lang),
      data: await this.userSubscriptionService.update({
        data: body,
        id: params.userSubscriptionId,
        userId
      })
    }
  }

  @Delete(':userSubscriptionId')
  @ZodSerializerDto(MessageResDTO)
  async delete(
    @Param() params: GetUserSubscriptionParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    await this.userSubscriptionService.delete({
      id: params.userSubscriptionId,
      userId
    })
    return {
      message: this.i18nService.translate(UserSubscriptionMessage.DELETE_SUCCESS, lang),
      data: null
    }
  }
}
