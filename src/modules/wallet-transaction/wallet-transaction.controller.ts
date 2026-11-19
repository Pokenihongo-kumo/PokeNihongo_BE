import { I18nService } from '@/i18n/i18n.service'
import { WalletTransactionMessage } from '@/i18n/message-keys'
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
  Put,
  Query,
  UseGuards
} from '@nestjs/common'
import { ApiBearerAuth } from '@nestjs/swagger'
import { ZodSerializerDto } from 'nestjs-zod'
import {
  GetWalletTransactionDetailResDTO,
  GetWalletTransactionParamsDTO,
  UpdateWalletTransactionBodyDTO,
  UpdateWalletTransactionResDTO
} from './dto/wallet-transaction.zod-dto'
import { WalletTransactionService } from './wallet-transaction.service'

// Every user's wallet movements: login and the route permission are needed
// (GET list and GET :id used to be public)
@Controller('wallet-transaction')
@UseGuards(AuthenticationGuard)
@ApiBearerAuth()
export class WalletTransactionController {
  constructor(
    private readonly walletTransactionService: WalletTransactionService,
    private readonly i18nService: I18nService
  ) {}

  @Get()
  @ZodSerializerDto(PaginationResponseSchema)
  async list(@Query() query: PaginationQueryDTO, @I18nLang() lang: string) {
    return {
      message: this.i18nService.translate(
        WalletTransactionMessage.GET_LIST_SUCCESS,
        lang
      ),
      data: await this.walletTransactionService.list(query)
    }
  }

  @Get(':walletTransactionId')
  @ZodSerializerDto(GetWalletTransactionDetailResDTO)
  async findById(
    @Param() params: GetWalletTransactionParamsDTO,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(WalletTransactionMessage.GET_SUCCESS, lang),
      data: await this.walletTransactionService.findById(params.walletTransactionId)
    }
  }

  @Put(':walletTransactionId')
  @ZodSerializerDto(UpdateWalletTransactionResDTO)
  async update(
    @Body() body: UpdateWalletTransactionBodyDTO,
    @Param() params: GetWalletTransactionParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(WalletTransactionMessage.UPDATE_SUCCESS, lang),
      data: await this.walletTransactionService.update({
        data: body,
        id: params.walletTransactionId,
        updatedById: userId
      })
    }
  }

  @Delete(':walletTransactionId')
  @ZodSerializerDto(MessageResDTO)
  async delete(
    @Param() params: GetWalletTransactionParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    await this.walletTransactionService.delete({
      id: params.walletTransactionId,
      deletedById: userId
    })
    return {
      message: this.i18nService.translate(WalletTransactionMessage.DELETE_SUCCESS, lang),
      data: null
    }
  }
}
