import { ResponseMessage } from '@/i18n/response-message'
import { MatchMessage } from '@/i18n/message-keys'
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
  CreateMatchResDTO,
  GetMatchDetailResDTO,
  GetMatchParamsDTO,
  UpdateMatchBodyDTO,
  UpdateMatchResDTO
} from './dto/match.zod-dto'
import { MatchService } from './match.service'
const TIME_CHOOSE_POKEMON_MS = 5000
@Controller('match')
@UseGuards(AuthenticationGuard)
@ApiBearerAuth()
export class MatchController {
  constructor(private readonly matchService: MatchService) {}

  @Get()
  @ZodSerializerDto(PaginationResponseSchema)
  @ResponseMessage(MatchMessage.GET_LIST_SUCCESS)
  async list(@Query() query: PaginationQueryDTO, @I18nLang() lang: string) {
    return this.matchService.list(query, lang)
  }

  @Post()
  @ZodSerializerDto(CreateMatchResDTO)
  @ResponseMessage(MatchMessage.CREATE_SUCCESS)
  async create(@ActiveUser('userId') userId: number) {
    return this.matchService.create({
      createdById: userId
    })
  }

  @Get('tracking')
  // @ZodSerializerDto(GetMatchDetailResDTO)
  getTrackingMatch(@ActiveUser('userId') userId: number, @I18nLang() lang: string) {
    return this.matchService.getTrackingMatch(userId, lang)
  }

  @Get(':matchId')
  @ZodSerializerDto(GetMatchDetailResDTO)
  @ResponseMessage(MatchMessage.GET_SUCCESS)
  async findById(@Param() params: GetMatchParamsDTO) {
    return this.matchService.findById(params.matchId)
  }

  @Put(':matchId')
  @ZodSerializerDto(UpdateMatchResDTO)
  @ResponseMessage(MatchMessage.UPDATE_SUCCESS)
  async update(
    @Body() body: UpdateMatchBodyDTO,
    @Param() params: GetMatchParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.matchService.update({
      data: body,
      id: params.matchId,
      updatedById: userId
    })
  }

  @Delete(':matchId')
  @ZodSerializerDto(MessageResDTO)
  @ResponseMessage(MatchMessage.DELETE_SUCCESS)
  async delete(@Param() params: GetMatchParamsDTO, @ActiveUser('userId') userId: number) {
    await this.matchService.delete({
      id: params.matchId,
      deletedById: userId
    })
  }
}
