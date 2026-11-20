import { ResponseMessage } from '@/i18n/response-message'
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
  constructor(private readonly roundQuestionService: RoundQuestionService) {}

  @Get()
  @ZodSerializerDto(PaginationResponseDTO)
  @ResponseMessage(RoundQuestionMessage.GET_LIST_SUCCESS)
  async list(@Query() query: PaginationQueryDTO) {
    return this.roundQuestionService.list(query)
  }

  @Get(':roundQuestionId')
  @ZodSerializerDto(GetRoundQuestionDetailResDTO)
  @ResponseMessage(RoundQuestionMessage.GET_LIST_SUCCESS)
  async findById(
    @Param() params: GetRoundQuestionParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.roundQuestionService.findById(params.roundQuestionId)
  }

  @Post()
  @ZodSerializerDto(CreateRoundQuestionResDTO)
  @ResponseMessage(RoundQuestionMessage.CREATE_SUCCESS)
  async create(
    @Body() body: CreateRoundQuestionBodyDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.roundQuestionService.create({
      userId,
      data: body
    })
  }

  @Put('answer/:roundQuestionId')
  @ResponseMessage(RoundQuestionMessage.ANSWER_SUCCESS)
  async answerQuestion(
    @Body() body: AnswerQuestionBodyDTO,
    @Param() params: GetRoundQuestionParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.roundQuestionService.answerQuestion(
      {
        data: body,
        id: params.roundQuestionId,
        userId
      },
      lang
    )
  }

  @Put(':roundQuestionId')
  @ZodSerializerDto(UpdateRoundQuestionResDTO)
  @ResponseMessage(RoundQuestionMessage.UPDATE_SUCCESS)
  async update(
    @Body() body: UpdateRoundQuestionBodyDTO,
    @Param() params: GetRoundQuestionParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.roundQuestionService.update({
      data: body,
      id: params.roundQuestionId,
      userId
    })
  }

  @Delete(':roundQuestionId')
  @ZodSerializerDto(MessageResDTO)
  @ResponseMessage(RoundQuestionMessage.DELETE_SUCCESS)
  async delete(
    @Param() params: GetRoundQuestionParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    await this.roundQuestionService.delete({
      id: params.roundQuestionId,
      userId
    })
  }
}
