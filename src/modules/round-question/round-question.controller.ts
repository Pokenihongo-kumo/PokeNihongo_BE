import { I18nService } from '@/i18n/i18n.service'
import { RoundQuestionMessage } from '@/i18n/message-keys'
import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'
import { PaginationQueryDTO } from '@/shared/dtos/request.dto'
import { MessageResDTO, PaginationResponseDTO } from '@/shared/dtos/response.dto'
import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common'
import { ZodSerializerDto } from 'nestjs-zod'
import {
  AnswerQuestionBodyDTO,
  CreateRoundQuestionBodyDTO,
  CreateRoundQuestionResDTO,
  GetRoundQuestionDetailResDTO,
  GetRoundQuestionParamsDTO,
  UpdateRoundQuestionBodyDTO,
  UpdateRoundQuestionResDTO
} from './dto/round-question.dto'
import { RoundQuestionService } from './round-question.service'

@Controller('round-question')
export class RoundQuestionController {
  constructor(
    private readonly roundQuestionService: RoundQuestionService,
    private readonly i18nService: I18nService
  ) {}

  @Get()
  @ZodSerializerDto(PaginationResponseDTO)
  async list(@Query() query: PaginationQueryDTO, @I18nLang() lang: string) {
    return {
      message: this.i18nService.translate(RoundQuestionMessage.GET_LIST_SUCCESS, lang),
      data: await this.roundQuestionService.list(query)
    }
  }

  @Get(':roundQuestionId')
  @ZodSerializerDto(GetRoundQuestionDetailResDTO)
  async findById(
    @Param() params: GetRoundQuestionParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(RoundQuestionMessage.GET_LIST_SUCCESS, lang),
      data: await this.roundQuestionService.findById(params.roundQuestionId)
    }
  }

  @Post()
  @ZodSerializerDto(CreateRoundQuestionResDTO)
  async create(
    @Body() body: CreateRoundQuestionBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(RoundQuestionMessage.CREATE_SUCCESS, lang),
      data: await this.roundQuestionService.create({
        userId,
        data: body
      })
    }
  }

  @Put('answer/:roundQuestionId')
  async answerQuestion(
    @Body() body: AnswerQuestionBodyDTO,
    @Param() params: GetRoundQuestionParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(RoundQuestionMessage.ANSWER_SUCCESS, lang),
      data: await this.roundQuestionService.answerQuestion(
        {
          data: body,
          id: params.roundQuestionId,
          userId
        },
        lang
      )
    }
  }

  @Put(':roundQuestionId')
  @ZodSerializerDto(UpdateRoundQuestionResDTO)
  async update(
    @Body() body: UpdateRoundQuestionBodyDTO,
    @Param() params: GetRoundQuestionParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(RoundQuestionMessage.UPDATE_SUCCESS, lang),
      data: await this.roundQuestionService.update({
        data: body,
        id: params.roundQuestionId,
        userId
      })
    }
  }

  @Delete(':roundQuestionId')
  @ZodSerializerDto(MessageResDTO)
  async delete(
    @Param() params: GetRoundQuestionParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    await this.roundQuestionService.delete({
      id: params.roundQuestionId,
      userId
    })
    return {
      message: this.i18nService.translate(RoundQuestionMessage.DELETE_SUCCESS, lang),
      data: null
    }
  }
}
