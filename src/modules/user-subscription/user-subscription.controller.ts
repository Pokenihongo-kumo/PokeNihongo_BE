import { ResponseMessage } from '@/i18n/response-message'
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
  constructor(private readonly userSubscriptionService: UserSubscriptionService) {}

  @Get()
  @ZodSerializerDto(PaginationResponseDTO)
  @ResponseMessage(UserSubscriptionMessage.GET_LIST_SUCCESS)
  async list(@Query() query: PaginationQueryDTO) {
    return this.userSubscriptionService.list(query)
  }

  @Get('user')
  @ZodSerializerDto(PaginationResponseDTO)
  @ResponseMessage(UserSubscriptionMessage.GET_LIST_SUCCESS)
  async getUserSubWithSubPlan(
    @Query() query: PaginationQueryDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.userSubscriptionService.getUserSubWithSubPlan(query, userId, lang)
  }

  @Get('user/features')
  // @ZodSerializerDto(PaginationResponseDTO)
  @ResponseMessage(UserSubscriptionMessage.GET_LIST_SUCCESS)
  async getListFeatureOfUser(@ActiveUser('userId') userId: number) {
    return this.userSubscriptionService.getListFeatureOfUser(userId)
  }

  @Get(':userSubscriptionId')
  @ZodSerializerDto(GetUserSubscriptionDetailResDTO)
  @ResponseMessage(UserSubscriptionMessage.GET_LIST_SUCCESS)
  async findById(
    @Param() params: GetUserSubscriptionParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.userSubscriptionService.findById(params.userSubscriptionId)
  }
  @Post()
  @ZodSerializerDto(CreateUserSubscriptionResDTO)
  @ResponseMessage(UserSubscriptionMessage.CREATE_SUCCESS)
  async create(
    @Body() body: CreateUserSubscriptionBodyDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.userSubscriptionService.create({
      userId,
      data: body
    })
  }

  @Put(':userSubscriptionId')
  @ZodSerializerDto(UpdateUserSubscriptionResDTO)
  @ResponseMessage(UserSubscriptionMessage.UPDATE_SUCCESS)
  async update(
    @Body() body: UpdateUserSubscriptionBodyDTO,
    @Param() params: GetUserSubscriptionParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.userSubscriptionService.update({
      data: body,
      id: params.userSubscriptionId,
      userId
    })
  }

  @Delete(':userSubscriptionId')
  @ZodSerializerDto(MessageResDTO)
  @ResponseMessage(UserSubscriptionMessage.DELETE_SUCCESS)
  async delete(
    @Param() params: GetUserSubscriptionParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    await this.userSubscriptionService.delete({
      id: params.userSubscriptionId,
      userId
    })
  }
}
