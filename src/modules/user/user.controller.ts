import { I18nService } from '@/i18n/i18n.service'
import { UserMessage } from '@/i18n/message-keys'
import { ENTITY_MESSAGE } from '@/i18n/message-keys'
import { AuthMessage } from '@/i18n/message-keys'
import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'
import { PaginationQueryDTO } from '@/shared/dtos/request.dto'
import { MessageResDTO, PaginationResponseDTO } from '@/shared/dtos/response.dto'
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  HttpCode,
  HttpStatus
} from '@nestjs/common'
import { ZodSerializerDto } from 'nestjs-zod'
import { UpdateLevelJLPTBodyDTO, UpdateLevelJLPTResDTO } from '../auth/dto/auth.zod-dto'
import {
  CreateUserBodyDTO,
  CreateUserResDTO,
  GetUserDetailResDTO,
  GetUserParamsDTO,
  SetMainPokemonBodyDTO,
  UpdateUserBodyDTO,
  UpdateUserResDTO
} from './dto/user.zod-dto'
import { UserService } from './user.service'

@Controller('user')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly i18nService: I18nService
  ) {}

  @Get()
  @ZodSerializerDto(PaginationResponseDTO)
  async list(@Query() query: PaginationQueryDTO, @I18nLang() lang: string) {
    return {
      message: this.i18nService.translate(UserMessage.GET_LIST_SUCCESS, lang),
      data: await this.userService.list(query)
    }
  }

  @Get('stats/season')
  async getInfoBattleWithUser(
    @I18nLang() lang: string,
    @ActiveUser('userId') userId: number
  ) {
    return {
      message: this.i18nService.translate(UserMessage.GET_DETAIL_SUCCESS, lang),
      data: await this.userService.getInfoBattleWithUser(userId, lang)
    }
  }

  @Get('matching/history')
  @ZodSerializerDto(PaginationResponseDTO)
  async getMatchingHisByUserId(
    @Query() query: PaginationQueryDTO,
    @I18nLang() lang: string,
    @ActiveUser('userId') userId: number
  ) {
    return {
      message: this.i18nService.translate(ENTITY_MESSAGE.GET_LIST_SUCCESS, lang),
      data: await this.userService.getMatchingHisByUserId(userId, lang, query)
    }
  }

  @Get(':userId')
  @ZodSerializerDto(GetUserDetailResDTO)
  async findById(@Param() params: GetUserParamsDTO, @I18nLang() lang: string) {
    return {
      message: this.i18nService.translate(UserMessage.GET_DETAIL_SUCCESS, lang),
      data: await this.userService.findById(params.userId)
    }
  }

  @Post()
  @ZodSerializerDto(CreateUserResDTO)
  async create(
    @Body() body: CreateUserBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(UserMessage.CREATE_SUCCESS, lang),
      data: await this.userService.create({
        data: body,
        createdById: userId
      })
    }
  }

  @Put('levelJLPT')
  @ZodSerializerDto(UpdateLevelJLPTResDTO)
  async updateLevelJLPT(
    @Body() body: UpdateLevelJLPTBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(AuthMessage.UPDATE_LEVEL_JLPT_SUCCESS, lang),
      data: await this.userService.updateLevelJLPT({
        userId,
        data: body
      })
    }
  }

  @Put(':userId')
  @ZodSerializerDto(UpdateUserResDTO)
  async update(
    @Body() body: UpdateUserBodyDTO,
    @Param() params: GetUserParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(UserMessage.UPDATE_SUCCESS, lang),
      data: await this.userService.update({
        data: body,
        id: params.userId,
        updatedById: userId
      })
    }
  }

  @Delete(':userId')
  @ZodSerializerDto(MessageResDTO)
  async delete(
    @Param() params: GetUserParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    await this.userService.delete({
      id: params.userId,
      deletedById: userId
    })
    return {
      message: this.i18nService.translate(UserMessage.DELETE_SUCCESS, lang),
      data: null
    }
  }

  @Post('me/set-main-pokemon')
  @HttpCode(HttpStatus.OK)
  @ZodSerializerDto(MessageResDTO)
  async setMainPokemon(
    @Body() body: SetMainPokemonBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    await this.userService.setMainPokemon(userId, body)
    return {
      message: this.i18nService.translate(UserMessage.SET_MAIN_POKEMON_SUCCESS, lang),
      data: null
    }
  }
}
