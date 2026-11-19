import { I18nService } from '@/i18n/i18n.service'
import { MatchRoundMessage } from '@/i18n/message-keys'
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
  CreateMatchRoundBodyDTO,
  GetMatchRoundDetailForUserResDTO,
  GetMatchRoundDetailResDTO,
  GetMatchRoundParamsDTO,
  UpdateMatchRoundBodyDTO,
  UpdateMatchRoundResDTO
} from './dto/match-round.zod-dto'
import { MatchRoundService } from './match-round.service'

@Controller('match-round')
@UseGuards(AuthenticationGuard)
@ApiBearerAuth()
export class MatchRoundController {
  constructor(
    private readonly matchRoundService: MatchRoundService,
    private readonly i18nService: I18nService
  ) {}

  @Get()
  @ZodSerializerDto(PaginationResponseSchema)
  async list(@Query() query: PaginationQueryDTO, @I18nLang() lang: string) {
    return {
      message: this.i18nService.translate(MatchRoundMessage.GET_LIST_SUCCESS, lang),
      data: await this.matchRoundService.list(query, lang)
    }
  }

  @Get('now/user')
  @ZodSerializerDto(GetMatchRoundDetailForUserResDTO)
  async getListMatchRoundByUser(
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(MatchRoundMessage.GET_LIST_SUCCESS, lang),
      data: await this.matchRoundService.listNowByUser(userId, lang)
    }
  }

  @Post()
  // @ZodSerializerDto(CreateMatchRoundResDTO)
  async create(
    @Body() data: CreateMatchRoundBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(MatchRoundMessage.CREATE_SUCCESS, lang),
      data: await this.matchRoundService.create({
        createdById: userId,
        data
      })
    }
  }

  @Get(':matchRoundId')
  @ZodSerializerDto(GetMatchRoundDetailResDTO)
  async findById(@Param() params: GetMatchRoundParamsDTO, @I18nLang() lang: string) {
    return {
      message: this.i18nService.translate(MatchRoundMessage.GET_SUCCESS, lang),
      data: await this.matchRoundService.findById(params.matchRoundId)
    }
  }

  @Put(':matchRoundId')
  @ZodSerializerDto(UpdateMatchRoundResDTO)
  async update(
    @Body() body: UpdateMatchRoundBodyDTO,
    @Param() params: GetMatchRoundParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(MatchRoundMessage.UPDATE_SUCCESS, lang),
      data: await this.matchRoundService.update({
        data: body,
        id: params.matchRoundId,
        updatedById: userId
      })
    }
  }

  @Delete(':matchRoundId')
  @ZodSerializerDto(MessageResDTO)
  async delete(
    @Param() params: GetMatchRoundParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    await this.matchRoundService.delete({
      id: params.matchRoundId,
      deletedById: userId
    })
    return {
      message: this.i18nService.translate(MatchRoundMessage.DELETE_SUCCESS, lang),
      data: null
    }
  }
}
