import { ResponseMessage } from '@/i18n/response-message'
import { MatchRoundParticipantMessage } from '@/i18n/message-keys'
import { ActiveUser } from '@/common/decorators/active-user.decorator'
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
    private readonly matchRoundParticipantService: MatchRoundParticipantService
  ) {}

  @Get()
  @ZodSerializerDto(PaginationResponseDTO)
  @ResponseMessage(MatchRoundParticipantMessage.GET_LIST_SUCCESS)
  async list(@Query() query: PaginationQueryDTO) {
    return this.matchRoundParticipantService.list(query)
  }

  @Get(':matchRoundParticipantId')
  @ZodSerializerDto(GetMatchRoundParticipantDetailResDTO)
  @ResponseMessage(MatchRoundParticipantMessage.GET_LIST_SUCCESS)
  async findById(
    @Param() params: GetMatchRoundParticipantParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.matchRoundParticipantService.findById(params.matchRoundParticipantId)
  }

  @Post()
  @ZodSerializerDto(CreateMatchRoundParticipantResDTO)
  @ResponseMessage(MatchRoundParticipantMessage.CREATE_SUCCESS)
  async create(
    @Body() body: CreateMatchRoundParticipantBodyDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.matchRoundParticipantService.create({
      userId,
      data: body
    })
  }

  @Put('choose-pokemon/round/:matchRoundId')
  @ZodSerializerDto(UpdateMatchRoundParticipantResDTO)
  @ResponseMessage(MatchRoundParticipantMessage.UPDATE_SUCCESS)
  async choosePokeWithRound(
    @Body() body: ChoosePokemonMatchRoundParticipantBodyDTO,
    @Param() params: GetMatchRoundByRoundParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.matchRoundParticipantService.choosePokemonWithRound({
      data: body,
      matchRoundId: params.matchRoundId,
      userId
    })
  }

  @Put(':matchRoundParticipantId')
  @ZodSerializerDto(UpdateMatchRoundParticipantResDTO)
  @ResponseMessage(MatchRoundParticipantMessage.UPDATE_SUCCESS)
  async update(
    @Body() body: UpdateMatchRoundParticipantBodyDTO,
    @Param() params: GetMatchRoundParticipantParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.matchRoundParticipantService.update({
      data: body,
      id: params.matchRoundParticipantId,
      userId
    })
  }

  @Delete(':matchRoundParticipantId')
  @ZodSerializerDto(MessageResDTO)
  @ResponseMessage(MatchRoundParticipantMessage.DELETE_SUCCESS)
  async delete(
    @Param() params: GetMatchRoundParticipantParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    await this.matchRoundParticipantService.delete({
      id: params.matchRoundParticipantId,
      userId
    })
  }
}
