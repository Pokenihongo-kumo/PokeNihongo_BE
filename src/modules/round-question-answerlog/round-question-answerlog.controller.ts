import { I18nService } from '@/i18n/i18n.service'
import { RoundQuestionsAnswerLogMessage } from '@/i18n/message-keys'
import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'
import { PaginationQueryDTO } from '@/shared/dtos/request.dto'
import { MessageResDTO, PaginationResponseDTO } from '@/shared/dtos/response.dto'
import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common'
import { ZodSerializerDto } from 'nestjs-zod'
import {
  CreateRoundQuestionsAnswerLogBodyDTO,
  CreateRoundQuestionsAnswerLogResDTO,
  GetRoundQuestionsAnswerLogDetailResDTO,
  GetRoundQuestionsAnswerLogParamsDTO,
  UpdateRoundQuestionsAnswerLogBodyDTO,
  UpdateRoundQuestionsAnswerLogResDTO
} from './dto/round-question-answerlog.dto'
import { RoundQuestionsAnswerLogService } from './round-question-answerlog.service'

@Controller('round-question-answerlog')
export class RoundQuestionsAnswerLogController {
  constructor(
    private readonly roundQuestionService: RoundQuestionsAnswerLogService,
    private readonly i18nService: I18nService
  ) {}

  @Get()
  @ZodSerializerDto(PaginationResponseDTO)
  async list(@Query() query: PaginationQueryDTO, @I18nLang() lang: string) {
    return {
      message: this.i18nService.translate(
        RoundQuestionsAnswerLogMessage.GET_LIST_SUCCESS,
        lang
      ),
      data: await this.roundQuestionService.list(query)
    }
  }

  @Get(':roundQuestionsAnswerLogId')
  @ZodSerializerDto(GetRoundQuestionsAnswerLogDetailResDTO)
  async findById(
    @Param() params: GetRoundQuestionsAnswerLogParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(
        RoundQuestionsAnswerLogMessage.GET_LIST_SUCCESS,
        lang
      ),
      data: await this.roundQuestionService.findById(params.roundQuestionsAnswerLogId)
    }
  }

  @Post()
  @ZodSerializerDto(CreateRoundQuestionsAnswerLogResDTO)
  async create(
    @Body() body: CreateRoundQuestionsAnswerLogBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(
        RoundQuestionsAnswerLogMessage.CREATE_SUCCESS,
        lang
      ),
      data: await this.roundQuestionService.create({
        userId,
        data: body
      })
    }
  }

  @Put(':roundQuestionsAnswerLogId')
  @ZodSerializerDto(UpdateRoundQuestionsAnswerLogResDTO)
  async update(
    @Body() body: UpdateRoundQuestionsAnswerLogBodyDTO,
    @Param() params: GetRoundQuestionsAnswerLogParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(
        RoundQuestionsAnswerLogMessage.UPDATE_SUCCESS,
        lang
      ),
      data: await this.roundQuestionService.update({
        data: body,
        id: params.roundQuestionsAnswerLogId,
        userId
      })
    }
  }

  @Delete(':roundQuestionsAnswerLogId')
  @ZodSerializerDto(MessageResDTO)
  async delete(
    @Param() params: GetRoundQuestionsAnswerLogParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    await this.roundQuestionService.delete({
      id: params.roundQuestionsAnswerLogId,
      userId
    })
    return {
      message: this.i18nService.translate(
        RoundQuestionsAnswerLogMessage.DELETE_SUCCESS,
        lang
      ),
      data: null
    }
  }
}
