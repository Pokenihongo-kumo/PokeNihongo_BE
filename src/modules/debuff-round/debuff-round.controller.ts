import { ResponseMessage } from '@/i18n/response-message'
import { DebuffRoundMessage } from '@/i18n/message-keys'
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
import { DebuffRoundService } from './debuff-round.service'
import {
  CreatedDebuffRoundBodyInputDTO,
  CreateDebuffRoundResDTO,
  GetDebuffRoundDetailResDTO,
  GetDebuffRoundParamsDTO,
  UpdateDebuffRoundBodyInputDTO,
  UpdateDebuffRoundResDTO
} from './dto/debuff-round.zod-dto'

@Controller('debuff-round')
@UseGuards(AuthenticationGuard)
@ApiBearerAuth()
export class DebuffRoundController {
  constructor(private readonly debuffRoundService: DebuffRoundService) {}

  @Get()
  @ZodSerializerDto(PaginationResponseSchema)
  @ResponseMessage(DebuffRoundMessage.GET_LIST_SUCCESS)
  async list(
    @Query() query: PaginationQueryDTO,
    @I18nLang() lang: string,
    @ActiveUser('roleName') roleName: string
  ) {
    return this.debuffRoundService.list(query, lang, roleName)
  }

  @Post()
  @ZodSerializerDto(CreateDebuffRoundResDTO)
  @ResponseMessage(DebuffRoundMessage.CREATE_SUCCESS)
  async create(
    @Body() body: CreatedDebuffRoundBodyInputDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.debuffRoundService.create({
      data: body,
      createdById: userId
    })
  }

  @Get(':debuffRoundId')
  @ZodSerializerDto(GetDebuffRoundDetailResDTO)
  @ResponseMessage(DebuffRoundMessage.GET_SUCCESS)
  async findById(
    @Param() params: GetDebuffRoundParamsDTO,
    @I18nLang() lang: string,
    @ActiveUser('roleName') roleName: string
  ) {
    return this.debuffRoundService.findById(params.debuffRoundId, roleName, lang)
  }

  @Put(':debuffRoundId')
  @ZodSerializerDto(UpdateDebuffRoundResDTO)
  @ResponseMessage(DebuffRoundMessage.UPDATE_SUCCESS)
  async update(
    @Body() body: UpdateDebuffRoundBodyInputDTO,
    @Param() params: GetDebuffRoundParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.debuffRoundService.update({
      data: body,
      id: params.debuffRoundId,
      updatedById: userId
    })
  }

  @Delete(':debuffRoundId')
  @ZodSerializerDto(MessageResDTO)
  @ResponseMessage(DebuffRoundMessage.DELETE_SUCCESS)
  async delete(
    @Param() params: GetDebuffRoundParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    await this.debuffRoundService.delete({
      id: params.debuffRoundId,
      deletedById: userId
    })
  }
}
