import { ResponseMessage } from '@/i18n/response-message'
import { MatchParticipantMessage } from '@/i18n/message-keys'
import { ActiveUser } from '@/common/decorators/active-user.decorator'
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
  constructor(private readonly matchParticipantService: MatchParticipantService) {}

  @Get()
  @ZodSerializerDto(PaginationResponseDTO)
  @ResponseMessage(MatchParticipantMessage.GET_LIST_SUCCESS)
  async list(@Query() query: PaginationQueryDTO) {
    return this.matchParticipantService.list(query)
  }

  @Get(':matchParticipantId')
  @ZodSerializerDto(GetMatchParticipantDetailResDTO)
  @ResponseMessage(MatchParticipantMessage.GET_LIST_SUCCESS)
  async findById(
    @Param() params: GetMatchParticipantParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.matchParticipantService.findById(params.matchParticipantId)
  }

  @Post()
  @ZodSerializerDto(CreateMatchParticipantResDTO)
  @ResponseMessage(MatchParticipantMessage.CREATE_SUCCESS)
  async create(
    @Body() body: CreateMatchParticipantBodyDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.matchParticipantService.create({
      userId,
      data: body
    })
  }

  @Put(':matchParticipantId')
  // @ZodSerializerDto(UpdateMatchParticipantResDTO)
  @ResponseMessage(MatchParticipantMessage.UPDATE_SUCCESS)
  async update(
    @Body() body: UpdateMatchParticipantBodyDTO,
    @Param() params: GetMatchParticipantParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.matchParticipantService.update({
      data: body,
      id: params.matchParticipantId,
      userId
    })
  }

  @Delete(':matchParticipantId')
  @ZodSerializerDto(MessageResDTO)
  @ResponseMessage(MatchParticipantMessage.DELETE_SUCCESS)
  async delete(
    @Param() params: GetMatchParticipantParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    await this.matchParticipantService.delete({
      id: params.matchParticipantId,
      userId
    })
  }
}
