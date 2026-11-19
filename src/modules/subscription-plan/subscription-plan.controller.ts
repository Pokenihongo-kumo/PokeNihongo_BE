import { I18nService } from '@/i18n/i18n.service'
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
  constructor(
    private readonly subscriptionPlanService: SubscriptionPlanService,
    private readonly i18nService: I18nService
  ) {}

  @Get()
  @ZodSerializerDto(PaginationResponseDTO)
  async list(
    @Query() query: PaginationQueryDTO,
    @I18nLang() lang: string,
    @ActiveUser('roleName') roleName: string
  ) {
    return {
      message: this.i18nService.translate(SubscriptionPlanMessage.GET_LIST_SUCCESS, lang),
      data: await this.subscriptionPlanService.list(query, lang, roleName)
    }
  }

  @Get('discount/:subscriptionPlanId')
  @ZodSerializerDto(GetDiscountBySubPlanResDTO)
  async getDiscountToSubPlan(
    @Param() params: GetSubscriptionPlanParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(SubscriptionPlanMessage.GET_LIST_SUCCESS, lang),
      data: await this.subscriptionPlanService.getDiscountToSubPlan(
        params.subscriptionPlanId,
        userId
      )
    }
  }

  @Get('user')
  @ZodSerializerDto(GetSubscriptionPlanDetailResDTO)
  getPlansForUser(@ActiveUser('userId') userId: number, @I18nLang() lang: string) {
    return this.subscriptionPlanService.getPlansForUser(lang)
  }

  @Get(':subscriptionPlanId')
  @ZodSerializerDto(GetSubscriptionPlanDetailResDTO)
  async findById(
    @Param() params: GetSubscriptionPlanParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string,
    @ActiveUser('roleName') roleName: string
  ) {
    return {
      message: this.i18nService.translate(SubscriptionPlanMessage.GET_LIST_SUCCESS, lang),
      data: await this.subscriptionPlanService.findById(
        params.subscriptionPlanId,
        lang,
        roleName
      )
    }
  }

  @Post()
  @ZodSerializerDto(CreateSubscriptionPlanResDTO)
  async create(
    @Body() body: CreateSubscriptionPlanBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(SubscriptionPlanMessage.CREATE_SUCCESS, lang),
      data: await this.subscriptionPlanService.create({ userId, data: body })
    }
  }

  @Put(':subscriptionPlanId')
  @ZodSerializerDto(UpdateSubscriptionPlanResDTO)
  async update(
    @Param() params: GetSubscriptionPlanParamsDTO,
    @Body() body: UpdateSubscriptionPlanBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(SubscriptionPlanMessage.UPDATE_SUCCESS, lang),
      data: await this.subscriptionPlanService.update({
        id: params.subscriptionPlanId,
        data: body,
        userId
      })
    }
  }

  @Delete(':subscriptionPlanId')
  @ZodSerializerDto(MessageResDTO)
  async delete(
    @Param() params: GetSubscriptionPlanParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    await this.subscriptionPlanService.delete({
      id: params.subscriptionPlanId,
      userId
    })
    return {
      message: this.i18nService.translate(SubscriptionPlanMessage.DELETE_SUCCESS, lang),
      data: null
    }
  }
}
