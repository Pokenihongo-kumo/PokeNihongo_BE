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
  constructor(private readonly walletTransactionService: WalletTransactionService) {}

  @Get()
  @ZodSerializerDto(PaginationResponseSchema)
  list(@Query() query: PaginationQueryDTO, @I18nLang() lang: string) {
    return this.walletTransactionService.list(query, lang)
  }

  @Get(':walletTransactionId')
  @ZodSerializerDto(GetWalletTransactionDetailResDTO)
  findById(@Param() params: GetWalletTransactionParamsDTO, @I18nLang() lang: string) {
    return this.walletTransactionService.findById(params.walletTransactionId, lang)
  }

  @Put(':walletTransactionId')
  @ZodSerializerDto(UpdateWalletTransactionResDTO)
  update(
    @Body() body: UpdateWalletTransactionBodyDTO,
    @Param() params: GetWalletTransactionParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.walletTransactionService.update(
      {
        data: body,
        id: params.walletTransactionId,
        updatedById: userId
      },
      lang
    )
  }

  @Delete(':walletTransactionId')
  @ZodSerializerDto(MessageResDTO)
  delete(
    @Param() params: GetWalletTransactionParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.walletTransactionService.delete(
      {
        id: params.walletTransactionId,
        deletedById: userId
      },
      lang
    )
  }
}
