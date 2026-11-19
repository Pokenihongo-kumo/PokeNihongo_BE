import { I18nService } from '@/i18n/i18n.service'
import { WalletMessage } from '@/i18n/message-keys'
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
  constructor(
    private readonly walletService: WalletService,
    private readonly i18nService: I18nService
  ) {}

  @Get()
  @ZodSerializerDto(PaginationResponseSchema)
  async list(@Query() query: PaginationQueryDTO, @I18nLang() lang: string) {
    return {
      message: this.i18nService.translate(WalletMessage.GET_LIST_SUCCESS, lang),
      data: await this.walletService.list(query)
    }
  }

  @Get('user')
  @ZodSerializerDto(GetWalletsWithUserResDTO)
  async getWalletsByUser(@ActiveUser('userId') userId: number, @I18nLang() lang: string) {
    return {
      message: this.i18nService.translate(WalletMessage.GET_LIST_SUCCESS, lang),
      data: await this.walletService.getWalletsByUser(userId)
    }
  }

  @Get(':walletId')
  @ZodSerializerDto(GetWalletDetailResDTO)
  async findById(@Param() params: GetWalletParamsDTO, @I18nLang() lang: string) {
    return {
      message: this.i18nService.translate(WalletMessage.GET_SUCCESS, lang),
      data: await this.walletService.findById(params.walletId)
    }
  }

  @Post('generate/users')
  @HttpCode(HttpStatus.OK)
  @ZodSerializerDto(MessageResDTO)
  async generateWalletForAllUsers(
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    await this.walletService.generateWalletForAllUsers({
      createdById: userId
    })
    return {
      message: this.i18nService.translate(WalletMessage.CREATE_SUCCESS, lang),
      data: null
    }
  }

  @Post()
  @ZodSerializerDto(CreateWalletResDTO)
  async create(
    @Body() body: CreatedWalletBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(WalletMessage.CREATE_SUCCESS, lang),
      data: await this.walletService.create({
        data: body,
        createdById: userId
      })
    }
  }

  @Put(':walletId')
  @ZodSerializerDto(UpdateWalletResDTO)
  async update(
    @Body() body: UpdateWalletBodyDTO,
    @Param() params: GetWalletParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(WalletMessage.UPDATE_SUCCESS, lang),
      data: await this.walletService.update({
        data: body,
        id: params.walletId,
        updatedById: userId
      })
    }
  }

  @Delete(':walletId')
  @ZodSerializerDto(MessageResDTO)
  async delete(
    @Param() params: GetWalletParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    await this.walletService.delete({
      id: params.walletId,
      deletedById: userId
    })
    return {
      message: this.i18nService.translate(WalletMessage.DELETE_SUCCESS, lang),
      data: null
    }
  }
}
