import { ResponseMessage } from '@/i18n/response-message'
import { WalletTransactionMessage } from '@/i18n/message-keys'
import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { AuthenticationGuard } from '@/common/guards/authentication.guard'
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
  @ResponseMessage(WalletTransactionMessage.GET_LIST_SUCCESS)
  async list(@Query() query: PaginationQueryDTO) {
    return this.walletTransactionService.list(query)
  }

  @Get(':walletTransactionId')
  @ZodSerializerDto(GetWalletTransactionDetailResDTO)
  @ResponseMessage(WalletTransactionMessage.GET_SUCCESS)
  async findById(@Param() params: GetWalletTransactionParamsDTO) {
    return this.walletTransactionService.findById(params.walletTransactionId)
  }

  @Put(':walletTransactionId')
  @ZodSerializerDto(UpdateWalletTransactionResDTO)
  @ResponseMessage(WalletTransactionMessage.UPDATE_SUCCESS)
  async update(
    @Body() body: UpdateWalletTransactionBodyDTO,
    @Param() params: GetWalletTransactionParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.walletTransactionService.update({
      data: body,
      id: params.walletTransactionId,
      updatedById: userId
    })
  }

  @Delete(':walletTransactionId')
  @ZodSerializerDto(MessageResDTO)
  @ResponseMessage(WalletTransactionMessage.DELETE_SUCCESS)
  async delete(
    @Param() params: GetWalletTransactionParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    await this.walletTransactionService.delete({
      id: params.walletTransactionId,
      deletedById: userId
    })
  }
}
