import { I18nService } from '@/i18n/i18n.service'
import { UserGachaPityMessage } from '@/i18n/message-keys'
import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'
import { PaginationQueryDTO } from '@/shared/dtos/request.dto'
import { MessageResDTO, PaginationResponseDTO } from '@/shared/dtos/response.dto'
import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common'
import { ZodSerializerDto } from 'nestjs-zod'
import {
  CreateUserGachaPityBodyDTO,
  CreateUserGachaPityResDTO,
  GetUserGachaPityDetailResDTO,
  GetUserGachaPityParamsDTO,
  UpdateUserGachaPityBodyDTO,
  UpdateUserGachaPityResDTO
} from './dto/user-gacha-pity.dto'
import { UserGachaPityService } from './user-gacha-pity.service'

@Controller('user-gacha-pity')
export class UserGachaPityController {
  constructor(
    private readonly userGachaPityService: UserGachaPityService,
    private readonly i18nService: I18nService
  ) {}

  @Get()
  @ZodSerializerDto(PaginationResponseDTO)
  async list(@Query() query: PaginationQueryDTO, @I18nLang() lang: string) {
    return {
      message: this.i18nService.translate(UserGachaPityMessage.GET_LIST_SUCCESS, lang),
      data: await this.userGachaPityService.list(query)
    }
  }

  @Get('user/present')
  @ZodSerializerDto(GetUserGachaPityDetailResDTO)
  async getUserPityNow(@ActiveUser('userId') userId: number, @I18nLang() lang: string) {
    const { created, data } = await this.userGachaPityService.getUserPityNow(userId)
    return {
      message: this.i18nService.translate(
        created
          ? UserGachaPityMessage.CREATE_SUCCESS
          : UserGachaPityMessage.GET_LIST_SUCCESS,
        lang
      ),
      data
    }
  }

  @Get(':userGachaPityId')
  @ZodSerializerDto(GetUserGachaPityDetailResDTO)
  async findById(
    @Param() params: GetUserGachaPityParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(UserGachaPityMessage.GET_LIST_SUCCESS, lang),
      data: await this.userGachaPityService.findById(params.userGachaPityId)
    }
  }

  @Post()
  @ZodSerializerDto(CreateUserGachaPityResDTO)
  async create(
    @Body() body: CreateUserGachaPityBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(UserGachaPityMessage.CREATE_SUCCESS, lang),
      data: await this.userGachaPityService.create({
        userId,
        data: body
      })
    }
  }

  @Put(':userGachaPityId')
  @ZodSerializerDto(UpdateUserGachaPityResDTO)
  async update(
    @Body() body: UpdateUserGachaPityBodyDTO,
    @Param() params: GetUserGachaPityParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(UserGachaPityMessage.UPDATE_SUCCESS, lang),
      data: await this.userGachaPityService.update({
        data: body,
        id: params.userGachaPityId,
        userId
      })
    }
  }

  @Delete(':userGachaPityId')
  @ZodSerializerDto(MessageResDTO)
  async delete(
    @Param() params: GetUserGachaPityParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    await this.userGachaPityService.delete({
      id: params.userGachaPityId,
      userId
    })
    return {
      message: this.i18nService.translate(UserGachaPityMessage.DELETE_SUCCESS, lang),
      data: null
    }
  }
}
