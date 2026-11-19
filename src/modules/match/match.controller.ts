import { I18nService } from '@/i18n/i18n.service'
import { MatchMessage } from '@/i18n/message-keys'
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
  CreateMatchResDTO,
  GetMatchDetailResDTO,
  GetMatchParamsDTO,
  UpdateMatchBodyDTO,
  UpdateMatchResDTO
} from './dto/match.zod-dto'
import { MatchService } from './match.service'
const TIME_CHOOSE_POKEMON_MS = 5000
@Controller('match')
@UseGuards(AuthenticationGuard)
@ApiBearerAuth()
export class MatchController {
  constructor(
    private readonly matchService: MatchService,
    private readonly i18nService: I18nService
  ) {}

  @Get()
  @ZodSerializerDto(PaginationResponseSchema)
  async list(@Query() query: PaginationQueryDTO, @I18nLang() lang: string) {
    return {
      message: this.i18nService.translate(MatchMessage.GET_LIST_SUCCESS, lang),
      data: await this.matchService.list(query, lang)
    }
  }

  @Post()
  @ZodSerializerDto(CreateMatchResDTO)
  async create(@ActiveUser('userId') userId: number, @I18nLang() lang: string) {
    return {
      message: this.i18nService.translate(MatchMessage.CREATE_SUCCESS, lang),
      data: await this.matchService.create({
        createdById: userId
      })
    }
  }

  @Get('tracking')
  // @ZodSerializerDto(GetMatchDetailResDTO)
  getTrackingMatch(@ActiveUser('userId') userId: number, @I18nLang() lang: string) {
    return this.matchService.getTrackingMatch(userId, lang)
  }

  @Get(':matchId')
  @ZodSerializerDto(GetMatchDetailResDTO)
  async findById(@Param() params: GetMatchParamsDTO, @I18nLang() lang: string) {
    return {
      message: this.i18nService.translate(MatchMessage.GET_SUCCESS, lang),
      data: await this.matchService.findById(params.matchId)
    }
  }

  @Put(':matchId')
  @ZodSerializerDto(UpdateMatchResDTO)
  async update(
    @Body() body: UpdateMatchBodyDTO,
    @Param() params: GetMatchParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(MatchMessage.UPDATE_SUCCESS, lang),
      data: await this.matchService.update({
        data: body,
        id: params.matchId,
        updatedById: userId
      })
    }
  }

  @Delete(':matchId')
  @ZodSerializerDto(MessageResDTO)
  async delete(
    @Param() params: GetMatchParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    await this.matchService.delete({
      id: params.matchId,
      deletedById: userId
    })
    return {
      message: this.i18nService.translate(MatchMessage.DELETE_SUCCESS, lang),
      data: null
    }
  }
}
