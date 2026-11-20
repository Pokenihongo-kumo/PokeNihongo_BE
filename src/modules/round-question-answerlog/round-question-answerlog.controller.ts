import { ResponseMessage } from '@/i18n/response-message'
import { RoundQuestionsAnswerLogMessage } from '@/i18n/message-keys'
import { ActiveUser } from '@/common/decorators/active-user.decorator'
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
  constructor(private readonly roundQuestionService: RoundQuestionsAnswerLogService) {}

  @Get()
  @ZodSerializerDto(PaginationResponseDTO)
  @ResponseMessage(RoundQuestionsAnswerLogMessage.GET_LIST_SUCCESS)
  async list(@Query() query: PaginationQueryDTO) {
    return this.roundQuestionService.list(query)
  }

  @Get(':roundQuestionsAnswerLogId')
  @ZodSerializerDto(GetRoundQuestionsAnswerLogDetailResDTO)
  @ResponseMessage(RoundQuestionsAnswerLogMessage.GET_LIST_SUCCESS)
  async findById(
    @Param() params: GetRoundQuestionsAnswerLogParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.roundQuestionService.findById(params.roundQuestionsAnswerLogId)
  }

  @Post()
  @ZodSerializerDto(CreateRoundQuestionsAnswerLogResDTO)
  @ResponseMessage(RoundQuestionsAnswerLogMessage.CREATE_SUCCESS)
  async create(
    @Body() body: CreateRoundQuestionsAnswerLogBodyDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.roundQuestionService.create({
      userId,
      data: body
    })
  }

  @Put(':roundQuestionsAnswerLogId')
  @ZodSerializerDto(UpdateRoundQuestionsAnswerLogResDTO)
  @ResponseMessage(RoundQuestionsAnswerLogMessage.UPDATE_SUCCESS)
  async update(
    @Body() body: UpdateRoundQuestionsAnswerLogBodyDTO,
    @Param() params: GetRoundQuestionsAnswerLogParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.roundQuestionService.update({
      data: body,
      id: params.roundQuestionsAnswerLogId,
      userId
    })
  }

  @Delete(':roundQuestionsAnswerLogId')
  @ZodSerializerDto(MessageResDTO)
  @ResponseMessage(RoundQuestionsAnswerLogMessage.DELETE_SUCCESS)
  async delete(
    @Param() params: GetRoundQuestionsAnswerLogParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    await this.roundQuestionService.delete({
      id: params.roundQuestionsAnswerLogId,
      userId
    })
  }
}
