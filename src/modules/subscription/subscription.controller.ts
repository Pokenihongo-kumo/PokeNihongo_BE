import { ResponseMessage } from '@/i18n/response-message'
import { SubscriptionMessage } from '@/i18n/message-keys'
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
  CreatedSubscriptionBodyInputDTO,
  CreateSubscriptionResDTO,
  GetMarketplaceListResDTO,
  GetMarketplaceOptionsResDTO,
  GetSubscriptionDetailResDTO,
  GetSubscriptionParamsDTO,
  UpdateSubscriptionBodyInputDTO,
  UpdateSubscriptionResDTO
} from './dto/subscription.zod-dto'
import { SubscriptionService } from './subscription.service'

@Controller('subscription')
@UseGuards(AuthenticationGuard)
@ApiBearerAuth()
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get()
  @ZodSerializerDto(PaginationResponseSchema)
  @ResponseMessage(SubscriptionMessage.GET_LIST_SUCCESS)
  async list(
    @Query() query: PaginationQueryDTO,
    @I18nLang() lang: string,
    @ActiveUser('roleName') roleName: string
  ) {
    return this.subscriptionService.list(query, lang, roleName)
  }

  @Post()
  @ZodSerializerDto(CreateSubscriptionResDTO)
  @ResponseMessage(SubscriptionMessage.CREATE_SUCCESS)
  async create(
    @Body() body: CreatedSubscriptionBodyInputDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.subscriptionService.create({
      data: body,
      createdById: userId
    })
  }

  @Get(':subscriptionId')
  @ZodSerializerDto(GetSubscriptionDetailResDTO)
  @ResponseMessage(SubscriptionMessage.GET_SUCCESS)
  async findById(
    @Param() params: GetSubscriptionParamsDTO,
    @I18nLang() lang: string,
    @ActiveUser('roleName') roleName: string
  ) {
    return this.subscriptionService.findById(params.subscriptionId, roleName, lang)
  }

  @Put(':subscriptionId')
  @ZodSerializerDto(UpdateSubscriptionResDTO)
  @ResponseMessage(SubscriptionMessage.UPDATE_SUCCESS)
  async update(
    @Body() body: UpdateSubscriptionBodyInputDTO,
    @Param() params: GetSubscriptionParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.subscriptionService.update({
      data: body,
      id: params.subscriptionId,
      updatedById: userId
    })
  }

  @Delete(':subscriptionId')
  @ZodSerializerDto(MessageResDTO)
  @ResponseMessage(SubscriptionMessage.DELETE_SUCCESS)
  async delete(
    @Param() params: GetSubscriptionParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    await this.subscriptionService.delete({
      id: params.subscriptionId,
      deletedById: userId
    })
  }

  @Get('marketplace/list')
  @ZodSerializerDto(GetMarketplaceListResDTO)
  @ResponseMessage(SubscriptionMessage.GET_LIST_SUCCESS)
  async listMarketplace(
    @I18nLang() lang: string,
    @ActiveUser('roleName') roleName: string,
    @ActiveUser('userId') userId?: number
  ) {
    return this.subscriptionService.listForMarketplace(lang, roleName, userId)
  }
  @Get('marketplace/options/:subscriptionId')
  @ZodSerializerDto(GetMarketplaceOptionsResDTO)
  @ResponseMessage(SubscriptionMessage.GET_SUCCESS)
  async getListOption(
    @I18nLang() lang: string,
    @ActiveUser('roleName') roleName: string,
    @Param() params: GetSubscriptionParamsDTO
  ) {
    return this.subscriptionService.getMarketplaceOptions(
      params.subscriptionId,
      lang,
      roleName
    )
  }
}
