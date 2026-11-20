import { ResponseMessage } from '@/i18n/response-message'
import { SubscriptionFeatureMessage } from '@/i18n/message-keys'
import { ActiveUser } from '@/common/decorators/active-user.decorator'
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
  constructor(private readonly subscriptionFeatureService: SubscriptionFeatureService) {}

  @Get()
  @ZodSerializerDto(PaginationResponseDTO)
  @ResponseMessage(SubscriptionFeatureMessage.GET_LIST_SUCCESS)
  async list(@Query() query: PaginationQueryDTO) {
    return this.subscriptionFeatureService.list(query)
  }

  @Get(':subscriptionFeatureId')
  @ZodSerializerDto(GetSubscriptionFeatureDetailResDTO)
  @ResponseMessage(SubscriptionFeatureMessage.GET_LIST_SUCCESS)
  async findById(
    @Param() params: GetSubscriptionFeatureParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.subscriptionFeatureService.findById(params.subscriptionFeatureId)
  }

  @Put('subscription/:subscriptionId')
  @ZodSerializerDto(UpdateWithListItemResDTO)
  @ResponseMessage(SubscriptionFeatureMessage.UPDATE_SUCCESS)
  async updateWithListFeature(
    @Body() body: UpdateWithListItemBodyDTO,
    @Param() params: GetSubscriptionParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.subscriptionFeatureService.updateWithListFeature({
      subscriptionId: params.subscriptionId,
      updatedById: userId,
      data: body
    })
  }

  @Delete(':subscriptionFeatureId')
  @ZodSerializerDto(MessageResDTO)
  @ResponseMessage(SubscriptionFeatureMessage.DELETE_SUCCESS)
  async delete(
    @Param() params: GetSubscriptionFeatureParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    await this.subscriptionFeatureService.delete({
      id: params.subscriptionFeatureId,
      userId
    })
  }
}
