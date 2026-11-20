import { ResponseMessage } from '@/i18n/response-message'
import { SubscriptionPlanMessage } from '@/i18n/message-keys'
import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'
import { PaginationQueryDTO } from '@/shared/dtos/request.dto'
import { MessageResDTO, PaginationResponseDTO } from '@/shared/dtos/response.dto'
import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common'
import { ZodSerializerDto } from 'nestjs-zod'
import {
  CreateSubscriptionPlanBodyDTO,
  CreateSubscriptionPlanResDTO,
  GetDiscountBySubPlanResDTO,
  GetSubscriptionPlanDetailResDTO,
  GetSubscriptionPlanParamsDTO,
  UpdateSubscriptionPlanBodyDTO,
  UpdateSubscriptionPlanResDTO
} from './dto/subscription-plan.dto'
import { SubscriptionPlanService } from './subscription-plan.service'

@Controller('subscription-plan')
export class SubscriptionPlanController {
  constructor(private readonly subscriptionPlanService: SubscriptionPlanService) {}

  @Get()
  @ZodSerializerDto(PaginationResponseDTO)
  @ResponseMessage(SubscriptionPlanMessage.GET_LIST_SUCCESS)
  async list(
    @Query() query: PaginationQueryDTO,
    @I18nLang() lang: string,
    @ActiveUser('roleName') roleName: string
  ) {
    return this.subscriptionPlanService.list(query, lang, roleName)
  }

  @Get('discount/:subscriptionPlanId')
  @ZodSerializerDto(GetDiscountBySubPlanResDTO)
  @ResponseMessage(SubscriptionPlanMessage.GET_LIST_SUCCESS)
  async getDiscountToSubPlan(
    @Param() params: GetSubscriptionPlanParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.subscriptionPlanService.getDiscountToSubPlan(
      params.subscriptionPlanId,
      userId
    )
  }

  @Get('user')
  @ZodSerializerDto(GetSubscriptionPlanDetailResDTO)
  getPlansForUser(@ActiveUser('userId') userId: number, @I18nLang() lang: string) {
    return this.subscriptionPlanService.getPlansForUser(lang)
  }

  @Get(':subscriptionPlanId')
  @ZodSerializerDto(GetSubscriptionPlanDetailResDTO)
  @ResponseMessage(SubscriptionPlanMessage.GET_LIST_SUCCESS)
  async findById(
    @Param() params: GetSubscriptionPlanParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string,
    @ActiveUser('roleName') roleName: string
  ) {
    return this.subscriptionPlanService.findById(
      params.subscriptionPlanId,
      lang,
      roleName
    )
  }

  @Post()
  @ZodSerializerDto(CreateSubscriptionPlanResDTO)
  @ResponseMessage(SubscriptionPlanMessage.CREATE_SUCCESS)
  async create(
    @Body() body: CreateSubscriptionPlanBodyDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.subscriptionPlanService.create({ userId, data: body })
  }

  @Put(':subscriptionPlanId')
  @ZodSerializerDto(UpdateSubscriptionPlanResDTO)
  @ResponseMessage(SubscriptionPlanMessage.UPDATE_SUCCESS)
  async update(
    @Param() params: GetSubscriptionPlanParamsDTO,
    @Body() body: UpdateSubscriptionPlanBodyDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.subscriptionPlanService.update({
      id: params.subscriptionPlanId,
      data: body,
      userId
    })
  }

  @Delete(':subscriptionPlanId')
  @ZodSerializerDto(MessageResDTO)
  @ResponseMessage(SubscriptionPlanMessage.DELETE_SUCCESS)
  async delete(
    @Param() params: GetSubscriptionPlanParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    await this.subscriptionPlanService.delete({
      id: params.subscriptionPlanId,
      userId
    })
  }
}
