import { ResponseMessage } from '@/i18n/response-message'
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
  constructor(private readonly userService: UserService) {}

  @Get()
  @ZodSerializerDto(PaginationResponseDTO)
  @ResponseMessage(UserMessage.GET_LIST_SUCCESS)
  async list(@Query() query: PaginationQueryDTO) {
    return this.userService.list(query)
  }

  @Get('stats/season')
  @ResponseMessage(UserMessage.GET_DETAIL_SUCCESS)
  async getInfoBattleWithUser(
    @I18nLang() lang: string,
    @ActiveUser('userId') userId: number
  ) {
    return this.userService.getInfoBattleWithUser(userId, lang)
  }

  @Get('matching/history')
  @ZodSerializerDto(PaginationResponseDTO)
  @ResponseMessage(ENTITY_MESSAGE.GET_LIST_SUCCESS)
  async getMatchingHisByUserId(
    @Query() query: PaginationQueryDTO,
    @I18nLang() lang: string,
    @ActiveUser('userId') userId: number
  ) {
    return this.userService.getMatchingHisByUserId(userId, lang, query)
  }

  @Get(':userId')
  @ZodSerializerDto(GetUserDetailResDTO)
  @ResponseMessage(UserMessage.GET_DETAIL_SUCCESS)
  async findById(@Param() params: GetUserParamsDTO) {
    return this.userService.findById(params.userId)
  }

  @Post()
  @ZodSerializerDto(CreateUserResDTO)
  @ResponseMessage(UserMessage.CREATE_SUCCESS)
  async create(@Body() body: CreateUserBodyDTO, @ActiveUser('userId') userId: number) {
    return this.userService.create({
      data: body,
      createdById: userId
    })
  }

  @Put('levelJLPT')
  @ZodSerializerDto(UpdateLevelJLPTResDTO)
  @ResponseMessage(AuthMessage.UPDATE_LEVEL_JLPT_SUCCESS)
  async updateLevelJLPT(
    @Body() body: UpdateLevelJLPTBodyDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.userService.updateLevelJLPT({
      userId,
      data: body
    })
  }

  @Put(':userId')
  @ZodSerializerDto(UpdateUserResDTO)
  @ResponseMessage(UserMessage.UPDATE_SUCCESS)
  async update(
    @Body() body: UpdateUserBodyDTO,
    @Param() params: GetUserParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.userService.update({
      data: body,
      id: params.userId,
      updatedById: userId
    })
  }

  @Delete(':userId')
  @ZodSerializerDto(MessageResDTO)
  @ResponseMessage(UserMessage.DELETE_SUCCESS)
  async delete(@Param() params: GetUserParamsDTO, @ActiveUser('userId') userId: number) {
    await this.userService.delete({
      id: params.userId,
      deletedById: userId
    })
  }

  @Post('me/set-main-pokemon')
  @HttpCode(HttpStatus.OK)
  @ZodSerializerDto(MessageResDTO)
  @ResponseMessage(UserMessage.SET_MAIN_POKEMON_SUCCESS)
  async setMainPokemon(
    @Body() body: SetMainPokemonBodyDTO,
    @ActiveUser('userId') userId: number
  ) {
    await this.userService.setMainPokemon(userId, body)
  }
}
