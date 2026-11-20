import { ResponseMessage } from '@/i18n/response-message'
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
  constructor(private readonly matchRoundService: MatchRoundService) {}

  @Get()
  @ZodSerializerDto(PaginationResponseSchema)
  @ResponseMessage(MatchRoundMessage.GET_LIST_SUCCESS)
  async list(@Query() query: PaginationQueryDTO, @I18nLang() lang: string) {
    return this.matchRoundService.list(query, lang)
  }

  @Get('now/user')
  @ZodSerializerDto(GetMatchRoundDetailForUserResDTO)
  @ResponseMessage(MatchRoundMessage.GET_LIST_SUCCESS)
  async getListMatchRoundByUser(
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.matchRoundService.listNowByUser(userId, lang)
  }

  @Post()
  // @ZodSerializerDto(CreateMatchRoundResDTO)
  @ResponseMessage(MatchRoundMessage.CREATE_SUCCESS)
  async create(
    @Body() data: CreateMatchRoundBodyDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.matchRoundService.create({
      createdById: userId,
      data
    })
  }

  @Get(':matchRoundId')
  @ZodSerializerDto(GetMatchRoundDetailResDTO)
  @ResponseMessage(MatchRoundMessage.GET_SUCCESS)
  async findById(@Param() params: GetMatchRoundParamsDTO) {
    return this.matchRoundService.findById(params.matchRoundId)
  }

  @Put(':matchRoundId')
  @ZodSerializerDto(UpdateMatchRoundResDTO)
  @ResponseMessage(MatchRoundMessage.UPDATE_SUCCESS)
  async update(
    @Body() body: UpdateMatchRoundBodyDTO,
    @Param() params: GetMatchRoundParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.matchRoundService.update({
      data: body,
      id: params.matchRoundId,
      updatedById: userId
    })
  }

  @Delete(':matchRoundId')
  @ZodSerializerDto(MessageResDTO)
  @ResponseMessage(MatchRoundMessage.DELETE_SUCCESS)
  async delete(
    @Param() params: GetMatchRoundParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    await this.matchRoundService.delete({
      id: params.matchRoundId,
      deletedById: userId
    })
  }
}
