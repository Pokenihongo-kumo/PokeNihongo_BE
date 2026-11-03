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
  list(@Query() query: PaginationQueryDTO, @I18nLang() lang: string) {
    return this.userService.list(query, lang)
  }

  @Get('stats/season')
  getInfoBattleWithUser(@I18nLang() lang: string, @ActiveUser('userId') userId: number) {
    return this.userService.getInfoBattleWithUser(userId, lang)
  }

  @Get('matching/history')
  @ZodSerializerDto(PaginationResponseDTO)
  getMatchingHisByUserId(
    @Query() query: PaginationQueryDTO,
    @I18nLang() lang: string,
    @ActiveUser('userId') userId: number
  ) {
    return this.userService.getMatchingHisByUserId(userId, lang, query)
  }

  @Get(':userId')
  @ZodSerializerDto(GetUserDetailResDTO)
  findById(@Param() params: GetUserParamsDTO, @I18nLang() lang: string) {
    return this.userService.findById(params.userId, lang)
  }

  @Post()
  @ZodSerializerDto(CreateUserResDTO)
  create(
    @Body() body: CreateUserBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.userService.create(
      {
        data: body,
        createdById: userId
      },
      lang
    )
  }

  @Put('levelJLPT')
  @ZodSerializerDto(UpdateLevelJLPTResDTO)
  updateLevelJLPT(
    @Body() body: UpdateLevelJLPTBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.userService.updateLevelJLPT(
      {
        userId,
        data: body
      },
      lang
    )
  }

  @Put(':userId')
  @ZodSerializerDto(UpdateUserResDTO)
  update(
    @Body() body: UpdateUserBodyDTO,
    @Param() params: GetUserParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.userService.update(
      {
        data: body,
        id: params.userId,
        updatedById: userId
      },
      lang
    )
  }

  @Delete(':userId')
  @ZodSerializerDto(MessageResDTO)
  delete(
    @Param() params: GetUserParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.userService.delete(
      {
        id: params.userId,
        deletedById: userId
      },
      lang
    )
  }

  @Post('me/set-main-pokemon')
  @HttpCode(HttpStatus.OK)
  @ZodSerializerDto(MessageResDTO)
  setMainPokemon(
    @Body() body: SetMainPokemonBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.userService.setMainPokemon(userId, body, lang)
  }
}
