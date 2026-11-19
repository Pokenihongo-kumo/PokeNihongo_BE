import { I18nService } from '@/i18n/i18n.service'
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
  constructor(
    private readonly dailyRequestService: DailyRequestService,
    private readonly i18nService: I18nService
  ) {}

  @Get()
  @IsPublic()
  @ZodSerializerDto(PaginationResponseSchema)
  async list(@Query() query: PaginationQueryDTO, @I18nLang() lang: string) {
    return {
      message: this.i18nService.translate(DailyRequestMessage.GET_LIST_SUCCESS, lang),
      data: await this.dailyRequestService.list(query, lang)
    }
  }

  @Get('admin/:dailyRequestId')
  @ZodSerializerDto(GetDailyRequestDetailwithAllLangResDTO)
  async findByIdWithAllLang(
    @Param() params: GetDailyRequestParamsDTO,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(DailyRequestMessage.GET_SUCCESS, lang),
      data: await this.dailyRequestService.findByIdWithAllLang(
        params.dailyRequestId,
        lang
      )
    }
  }

  @Get('admin')
  @ZodSerializerDto(PaginationResponseSchema)
  async getListwithAllLang(@Query() query: PaginationQueryDTO, @I18nLang() lang: string) {
    return {
      message: this.i18nService.translate(DailyRequestMessage.GET_LIST_SUCCESS, lang),
      data: await this.dailyRequestService.getListwithAllLang(query, lang)
    }
  }

  @Get(':dailyRequestId')
  @IsPublic()
  @ZodSerializerDto(GetDailyRequestDetailResDTO)
  async findById(@Param() params: GetDailyRequestParamsDTO, @I18nLang() lang: string) {
    return {
      message: this.i18nService.translate(DailyRequestMessage.GET_SUCCESS, lang),
      data: await this.dailyRequestService.findById(params.dailyRequestId, lang)
    }
  }

  @Post()
  @ZodSerializerDto(CreateDailyRequestResDTO)
  create(
    @Body() body: CreateDailyRequestBodyInputDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.dailyRequestService.create(
      {
        data: body,
        createdById: userId
      },
      lang
    )
  }

  @Put(':dailyRequestId')
  @ZodSerializerDto(UpdateDailyRequestResDTO)
  update(
    @Body() body: UpdateDailyRequestBodyInputDTO,
    @Param() params: GetDailyRequestParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.dailyRequestService.update(
      {
        data: body,
        id: params.dailyRequestId,
        updatedById: userId
      },
      lang
    )
  }

  @Delete(':dailyRequestId')
  @ZodSerializerDto(MessageResDTO)
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
    return {
      message: this.i18nService.translate(DailyRequestMessage.DELETE_SUCCESS, lang),
      data: null
    }
  }
}
