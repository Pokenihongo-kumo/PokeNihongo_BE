import { ResponseMessage } from '@/i18n/response-message'
import { DailyRequestMessage } from '@/i18n/message-keys'
import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { IsPublic } from '@/common/decorators/auth.decorator'
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
import { DailyRequestService } from './daily-request.service'
import {
  CreateDailyRequestBodyInputDTO,
  CreateDailyRequestResDTO,
  GetDailyRequestDetailResDTO,
  GetDailyRequestDetailwithAllLangResDTO,
  GetDailyRequestParamsDTO,
  UpdateDailyRequestBodyInputDTO,
  UpdateDailyRequestResDTO
} from './dto/daily-request.zod-dto'

@Controller('daily-request')
@UseGuards(AuthenticationGuard)
@ApiBearerAuth()
export class DailyRequestController {
  constructor(private readonly dailyRequestService: DailyRequestService) {}

  @Get()
  @IsPublic()
  @ZodSerializerDto(PaginationResponseSchema)
  @ResponseMessage(DailyRequestMessage.GET_LIST_SUCCESS)
  async list(@Query() query: PaginationQueryDTO, @I18nLang() lang: string) {
    return this.dailyRequestService.list(query, lang)
  }

  @Get('admin/:dailyRequestId')
  @ZodSerializerDto(GetDailyRequestDetailwithAllLangResDTO)
  @ResponseMessage(DailyRequestMessage.GET_SUCCESS)
  async findByIdWithAllLang(
    @Param() params: GetDailyRequestParamsDTO,
    @I18nLang() lang: string
  ) {
    return this.dailyRequestService.findByIdWithAllLang(params.dailyRequestId, lang)
  }

  @Get('admin')
  @ZodSerializerDto(PaginationResponseSchema)
  @ResponseMessage(DailyRequestMessage.GET_LIST_SUCCESS)
  async getListwithAllLang(@Query() query: PaginationQueryDTO, @I18nLang() lang: string) {
    return this.dailyRequestService.getListwithAllLang(query, lang)
  }

  @Get(':dailyRequestId')
  @IsPublic()
  @ZodSerializerDto(GetDailyRequestDetailResDTO)
  @ResponseMessage(DailyRequestMessage.GET_SUCCESS)
  async findById(@Param() params: GetDailyRequestParamsDTO, @I18nLang() lang: string) {
    return this.dailyRequestService.findById(params.dailyRequestId, lang)
  }

  @Post()
  @ZodSerializerDto(CreateDailyRequestResDTO)
  @ResponseMessage(DailyRequestMessage.CREATE_SUCCESS)
  async create(
    @Body() body: CreateDailyRequestBodyInputDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.dailyRequestService.create({
      data: body,
      createdById: userId
    })
  }

  @Put(':dailyRequestId')
  @ZodSerializerDto(UpdateDailyRequestResDTO)
  @ResponseMessage(DailyRequestMessage.UPDATE_SUCCESS)
  async update(
    @Body() body: UpdateDailyRequestBodyInputDTO,
    @Param() params: GetDailyRequestParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.dailyRequestService.update({
      data: body,
      id: params.dailyRequestId,
      updatedById: userId
    })
  }

  @Delete(':dailyRequestId')
  @ZodSerializerDto(MessageResDTO)
  @ResponseMessage(DailyRequestMessage.DELETE_SUCCESS)
  async delete(
    @Param() params: GetDailyRequestParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    await this.dailyRequestService.delete(
      {
        id: params.dailyRequestId,
        deletedById: userId
      },
      lang
    )
  }
}
