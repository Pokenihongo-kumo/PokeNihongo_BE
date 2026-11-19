import { I18nService } from '@/i18n/i18n.service'
import { UserDailyRequestMessage } from '@/i18n/message-keys'
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
import {
  CreatedUserDailyRequestBodyDTO,
  CreateUserDailyRequestResDTO,
  GetListUserDailyRequestTodayDetailResDTO,
  GetUserDailyRequestDetailResDTO,
  GetUserDailyRequestParamsDTO,
  UpdateUserDailyRequestBodyDTO,
  UpdateUserDailyRequestResDTO
} from './dto/user-daily-request.zod-dto'
import { UserDailyRequestService } from './user-daily-request.service'

@Controller('user-daily-request')
@UseGuards(AuthenticationGuard)
@ApiBearerAuth()
export class UserDailyRequestController {
  constructor(
    private readonly userDailyReqService: UserDailyRequestService,
    private readonly i18nService: I18nService
  ) {}

  @Get()
  @IsPublic()
  @ZodSerializerDto(PaginationResponseSchema)
  async list(@Query() query: PaginationQueryDTO, @I18nLang() lang: string) {
    return {
      message: this.i18nService.translate(UserDailyRequestMessage.GET_LIST_SUCCESS, lang),
      data: await this.userDailyReqService.list(query)
    }
  }

  @Get('user-today')
  @ZodSerializerDto(GetListUserDailyRequestTodayDetailResDTO)
  async getUserDailyRequestsToday(
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(UserDailyRequestMessage.GET_LIST_SUCCESS, lang),
      data: await this.userDailyReqService.getUserDailyRequestsToday(userId, lang)
    }
  }

  @Get(':userDailyRequestId')
  @IsPublic()
  @ZodSerializerDto(GetUserDailyRequestDetailResDTO)
  async findById(
    @Param() params: GetUserDailyRequestParamsDTO,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(UserDailyRequestMessage.GET_SUCCESS, lang),
      data: await this.userDailyReqService.findById(params.userDailyRequestId)
    }
  }

  @Post()
  @ZodSerializerDto(CreateUserDailyRequestResDTO)
  async create(
    @Body() body: CreatedUserDailyRequestBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(UserDailyRequestMessage.CREATE_SUCCESS, lang),
      data: await this.userDailyReqService.create({
        data: body,
        createdById: userId
      })
    }
  }

  @Put(':userDailyRequestId')
  @ZodSerializerDto(UpdateUserDailyRequestResDTO)
  async update(
    @Body() body: UpdateUserDailyRequestBodyDTO,
    @Param() params: GetUserDailyRequestParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(UserDailyRequestMessage.UPDATE_SUCCESS, lang),
      data: await this.userDailyReqService.update({
        data: body,
        id: params.userDailyRequestId,
        updatedById: userId
      })
    }
  }

  @Delete(':userDailyRequestId')
  @ZodSerializerDto(MessageResDTO)
  async delete(
    @Param() params: GetUserDailyRequestParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    await this.userDailyReqService.delete({
      id: params.userDailyRequestId,
      deletedById: userId
    })
    return {
      message: this.i18nService.translate(UserDailyRequestMessage.DELETE_SUCCESS, lang),
      data: null
    }
  }
}
