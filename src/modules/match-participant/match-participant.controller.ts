import { I18nService } from '@/i18n/i18n.service'
import { MatchParticipantMessage } from '@/i18n/message-keys'
import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'
import { PaginationQueryDTO } from '@/shared/dtos/request.dto'
import { MessageResDTO, PaginationResponseDTO } from '@/shared/dtos/response.dto'
import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common'
import { ZodSerializerDto } from 'nestjs-zod'
import {
  CreateMatchParticipantBodyDTO,
  CreateMatchParticipantResDTO,
  GetMatchParticipantDetailResDTO,
  GetMatchParticipantParamsDTO,
  UpdateMatchParticipantBodyDTO
} from './dto/match-participant.dto'
import { MatchParticipantService } from './match-participant.service'

@Controller('match-participant')
export class MatchParticipantController {
  constructor(
    private readonly matchParticipantService: MatchParticipantService,
    private readonly i18nService: I18nService
  ) {}

  @Get()
  @ZodSerializerDto(PaginationResponseDTO)
  async list(@Query() query: PaginationQueryDTO, @I18nLang() lang: string) {
    return {
      message: this.i18nService.translate(MatchParticipantMessage.GET_LIST_SUCCESS, lang),
      data: await this.matchParticipantService.list(query)
    }
  }

  @Get(':matchParticipantId')
  @ZodSerializerDto(GetMatchParticipantDetailResDTO)
  async findById(
    @Param() params: GetMatchParticipantParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(MatchParticipantMessage.GET_LIST_SUCCESS, lang),
      data: await this.matchParticipantService.findById(params.matchParticipantId)
    }
  }

  @Post()
  @ZodSerializerDto(CreateMatchParticipantResDTO)
  async create(
    @Body() body: CreateMatchParticipantBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(MatchParticipantMessage.CREATE_SUCCESS, lang),
      data: await this.matchParticipantService.create({
        userId,
        data: body
      })
    }
  }

  @Put(':matchParticipantId')
  // @ZodSerializerDto(UpdateMatchParticipantResDTO)
  async update(
    @Body() body: UpdateMatchParticipantBodyDTO,
    @Param() params: GetMatchParticipantParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(MatchParticipantMessage.UPDATE_SUCCESS, lang),
      data: await this.matchParticipantService.update({
        data: body,
        id: params.matchParticipantId,
        userId
      })
    }
  }

  @Delete(':matchParticipantId')
  @ZodSerializerDto(MessageResDTO)
  async delete(
    @Param() params: GetMatchParticipantParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    await this.matchParticipantService.delete({
      id: params.matchParticipantId,
      userId
    })
    return {
      message: this.i18nService.translate(MatchParticipantMessage.DELETE_SUCCESS, lang),
      data: null
    }
  }
}
