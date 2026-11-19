import { I18nService } from '@/i18n/i18n.service'
import { SubscriptionFeatureMessage } from '@/i18n/message-keys'
import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'
import { PaginationQueryDTO } from '@/shared/dtos/request.dto'
import { MessageResDTO, PaginationResponseDTO } from '@/shared/dtos/response.dto'
import { Body, Controller, Delete, Get, Param, Put, Query } from '@nestjs/common'
import { ZodSerializerDto } from 'nestjs-zod'
import { GetSubscriptionParamsDTO } from '../subscription/dto/subscription.zod-dto'
import {
  GetSubscriptionFeatureDetailResDTO,
  GetSubscriptionFeatureParamsDTO,
  UpdateWithListItemBodyDTO,
  UpdateWithListItemResDTO
} from './dto/subscription-feature.dto'
import { SubscriptionFeatureService } from './subscription-feature.service'

@Controller('subscription-feature')
export class SubscriptionFeatureController {
  constructor(
    private readonly subscriptionFeatureService: SubscriptionFeatureService,
    private readonly i18nService: I18nService
  ) {}

  @Get()
  @ZodSerializerDto(PaginationResponseDTO)
  async list(@Query() query: PaginationQueryDTO, @I18nLang() lang: string) {
    return {
      message: this.i18nService.translate(
        SubscriptionFeatureMessage.GET_LIST_SUCCESS,
        lang
      ),
      data: await this.subscriptionFeatureService.list(query)
    }
  }

  @Get(':subscriptionFeatureId')
  @ZodSerializerDto(GetSubscriptionFeatureDetailResDTO)
  async findById(
    @Param() params: GetSubscriptionFeatureParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(
        SubscriptionFeatureMessage.GET_LIST_SUCCESS,
        lang
      ),
      data: await this.subscriptionFeatureService.findById(params.subscriptionFeatureId)
    }
  }

  @Put('subscription/:subscriptionId')
  @ZodSerializerDto(UpdateWithListItemResDTO)
  async updateWithListFeature(
    @Body() body: UpdateWithListItemBodyDTO,
    @Param() params: GetSubscriptionParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(
        SubscriptionFeatureMessage.UPDATE_SUCCESS,
        lang
      ),
      data: await this.subscriptionFeatureService.updateWithListFeature({
        subscriptionId: params.subscriptionId,
        updatedById: userId,
        data: body
      })
    }
  }

  @Delete(':subscriptionFeatureId')
  @ZodSerializerDto(MessageResDTO)
  async delete(
    @Param() params: GetSubscriptionFeatureParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    await this.subscriptionFeatureService.delete({
      id: params.subscriptionFeatureId,
      userId
    })
    return {
      message: this.i18nService.translate(
        SubscriptionFeatureMessage.DELETE_SUCCESS,
        lang
      ),
      data: null
    }
  }
}
