import { ResponseMessage } from '@/i18n/response-message'
import { WalletMessage } from '@/i18n/message-keys'
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
  Post,
  Put,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus
} from '@nestjs/common'
import { ApiBearerAuth } from '@nestjs/swagger'
import { ZodSerializerDto } from 'nestjs-zod'
import {
  CreatedWalletBodyDTO,
  CreateWalletResDTO,
  GetWalletDetailResDTO,
  GetWalletParamsDTO,
  GetWalletsWithUserResDTO,
  UpdateWalletBodyDTO,
  UpdateWalletResDTO
} from './dto/walletzod-dto'
import { WalletService } from './wallet.service'

@Controller('wallet')
@UseGuards(AuthenticationGuard)
@ApiBearerAuth()
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get()
  @ZodSerializerDto(PaginationResponseSchema)
  @ResponseMessage(WalletMessage.GET_LIST_SUCCESS)
  async list(@Query() query: PaginationQueryDTO) {
    return this.walletService.list(query)
  }

  @Get('user')
  @ZodSerializerDto(GetWalletsWithUserResDTO)
  @ResponseMessage(WalletMessage.GET_LIST_SUCCESS)
  async getWalletsByUser(@ActiveUser('userId') userId: number) {
    return this.walletService.getWalletsByUser(userId)
  }

  @Get(':walletId')
  @ZodSerializerDto(GetWalletDetailResDTO)
  @ResponseMessage(WalletMessage.GET_SUCCESS)
  async findById(@Param() params: GetWalletParamsDTO) {
    return this.walletService.findById(params.walletId)
  }

  @Post('generate/users')
  @HttpCode(HttpStatus.OK)
  @ZodSerializerDto(MessageResDTO)
  @ResponseMessage(WalletMessage.CREATE_SUCCESS)
  async generateWalletForAllUsers(@ActiveUser('userId') userId: number) {
    await this.walletService.generateWalletForAllUsers({
      createdById: userId
    })
  }

  @Post()
  @ZodSerializerDto(CreateWalletResDTO)
  @ResponseMessage(WalletMessage.CREATE_SUCCESS)
  async create(@Body() body: CreatedWalletBodyDTO, @ActiveUser('userId') userId: number) {
    return this.walletService.create({
      data: body,
      createdById: userId
    })
  }

  @Put(':walletId')
  @ZodSerializerDto(UpdateWalletResDTO)
  @ResponseMessage(WalletMessage.UPDATE_SUCCESS)
  async update(
    @Body() body: UpdateWalletBodyDTO,
    @Param() params: GetWalletParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.walletService.update({
      data: body,
      id: params.walletId,
      updatedById: userId
    })
  }

  @Delete(':walletId')
  @ZodSerializerDto(MessageResDTO)
  @ResponseMessage(WalletMessage.DELETE_SUCCESS)
  async delete(
    @Param() params: GetWalletParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    await this.walletService.delete({
      id: params.walletId,
      deletedById: userId
    })
  }
}
