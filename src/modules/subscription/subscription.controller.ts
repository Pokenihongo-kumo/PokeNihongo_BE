import { I18nService } from '@/i18n/i18n.service'
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
  constructor(
    private readonly subscriptionService: SubscriptionService,
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
      message: this.i18nService.translate(SubscriptionMessage.GET_LIST_SUCCESS, lang),
      data: await this.subscriptionService.list(query, lang, roleName)
    }
  }

  @Post()
  @ZodSerializerDto(CreateSubscriptionResDTO)
  create(
    @Body() body: CreatedSubscriptionBodyInputDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.subscriptionService.create(
      {
        data: body,
        createdById: userId
      },
      lang
    )
  }

  @Get(':subscriptionId')
  @ZodSerializerDto(GetSubscriptionDetailResDTO)
  async findById(
    @Param() params: GetSubscriptionParamsDTO,
    @I18nLang() lang: string,
    @ActiveUser('roleName') roleName: string
  ) {
    return {
      message: this.i18nService.translate(SubscriptionMessage.GET_SUCCESS, lang),
      data: await this.subscriptionService.findById(params.subscriptionId, roleName, lang)
    }
  }

  @Put(':subscriptionId')
  @ZodSerializerDto(UpdateSubscriptionResDTO)
  update(
    @Body() body: UpdateSubscriptionBodyInputDTO,
    @Param() params: GetSubscriptionParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.subscriptionService.update(
      {
        data: body,
        id: params.subscriptionId,
        updatedById: userId
      },
      lang
    )
  }

  @Delete(':subscriptionId')
  @ZodSerializerDto(MessageResDTO)
  async delete(
    @Param() params: GetSubscriptionParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    await this.subscriptionService.delete({
      id: params.subscriptionId,
      deletedById: userId
    })
    return {
      message: this.i18nService.translate(SubscriptionMessage.DELETE_SUCCESS, lang),
      data: null
    }
  }

  @Get('marketplace/list')
  @ZodSerializerDto(GetMarketplaceListResDTO)
  async listMarketplace(
    @I18nLang() lang: string,
    @ActiveUser('roleName') roleName: string,
    @ActiveUser('userId') userId?: number
  ) {
    return {
      message: this.i18nService.translate(SubscriptionMessage.GET_LIST_SUCCESS, lang),
      data: await this.subscriptionService.listForMarketplace(lang, roleName, userId)
    }
  }
  @Get('marketplace/options/:subscriptionId')
  @ZodSerializerDto(GetMarketplaceOptionsResDTO)
  async getListOption(
    @I18nLang() lang: string,
    @ActiveUser('roleName') roleName: string,
    @Param() params: GetSubscriptionParamsDTO
  ) {
    return {
      message: this.i18nService.translate(SubscriptionMessage.GET_SUCCESS, lang),
      data: await this.subscriptionService.getMarketplaceOptions(
        params.subscriptionId,
        lang,
        roleName
      )
    }
  }
}
