import { I18nService } from '@/i18n/i18n.service'
import { MatchRoundParticipantMessage } from '@/i18n/message-keys'
import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'
import { PaginationQueryDTO } from '@/shared/dtos/request.dto'
import { MessageResDTO, PaginationResponseDTO } from '@/shared/dtos/response.dto'
import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common'
import { ZodSerializerDto } from 'nestjs-zod'
import {
  ChoosePokemonMatchRoundParticipantBodyDTO,
  CreateMatchRoundParticipantBodyDTO,
  CreateMatchRoundParticipantResDTO,
  GetMatchRoundByRoundParamsDTO,
  GetMatchRoundParticipantDetailResDTO,
  GetMatchRoundParticipantParamsDTO,
  UpdateMatchRoundParticipantBodyDTO,
  UpdateMatchRoundParticipantResDTO
} from './dto/match-round-participant.dto'
import { MatchRoundParticipantService } from './match-round-participant.service'

@Controller('match-round-participant')
export class MatchRoundParticipantController {
  constructor(
    private readonly matchRoundParticipantService: MatchRoundParticipantService,
    private readonly i18nService: I18nService
  ) {}

  @Get()
  @ZodSerializerDto(PaginationResponseDTO)
  async list(@Query() query: PaginationQueryDTO, @I18nLang() lang: string) {
    return {
      message: this.i18nService.translate(
        MatchRoundParticipantMessage.GET_LIST_SUCCESS,
        lang
      ),
      data: await this.matchRoundParticipantService.list(query)
    }
  }

  @Get(':matchRoundParticipantId')
  @ZodSerializerDto(GetMatchRoundParticipantDetailResDTO)
  async findById(
    @Param() params: GetMatchRoundParticipantParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(
        MatchRoundParticipantMessage.GET_LIST_SUCCESS,
        lang
      ),
      data: await this.matchRoundParticipantService.findById(
        params.matchRoundParticipantId
      )
    }
  }

  @Post()
  @ZodSerializerDto(CreateMatchRoundParticipantResDTO)
  async create(
    @Body() body: CreateMatchRoundParticipantBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(
        MatchRoundParticipantMessage.CREATE_SUCCESS,
        lang
      ),
      data: await this.matchRoundParticipantService.create({
        userId,
        data: body
      })
    }
  }

  @Put('choose-pokemon/round/:matchRoundId')
  @ZodSerializerDto(UpdateMatchRoundParticipantResDTO)
  async choosePokeWithRound(
    @Body() body: ChoosePokemonMatchRoundParticipantBodyDTO,
    @Param() params: GetMatchRoundByRoundParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(
        MatchRoundParticipantMessage.UPDATE_SUCCESS,
        lang
      ),
      data: await this.matchRoundParticipantService.choosePokemonWithRound({
        data: body,
        matchRoundId: params.matchRoundId,
        userId
      })
    }
  }

  @Put(':matchRoundParticipantId')
  @ZodSerializerDto(UpdateMatchRoundParticipantResDTO)
  async update(
    @Body() body: UpdateMatchRoundParticipantBodyDTO,
    @Param() params: GetMatchRoundParticipantParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(
        MatchRoundParticipantMessage.UPDATE_SUCCESS,
        lang
      ),
      data: await this.matchRoundParticipantService.update({
        data: body,
        id: params.matchRoundParticipantId,
        userId
      })
    }
  }

  @Delete(':matchRoundParticipantId')
  @ZodSerializerDto(MessageResDTO)
  async delete(
    @Param() params: GetMatchRoundParticipantParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    await this.matchRoundParticipantService.delete({
      id: params.matchRoundParticipantId,
      userId
    })
    return {
      message: this.i18nService.translate(
        MatchRoundParticipantMessage.DELETE_SUCCESS,
        lang
      ),
      data: null
    }
  }
}
