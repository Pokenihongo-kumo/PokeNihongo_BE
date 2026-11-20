import { ResponseMessage } from '@/i18n/response-message'
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
  constructor(private readonly userDailyReqService: UserDailyRequestService) {}

  @Get()
  @IsPublic()
  @ZodSerializerDto(PaginationResponseSchema)
  @ResponseMessage(UserDailyRequestMessage.GET_LIST_SUCCESS)
  async list(@Query() query: PaginationQueryDTO) {
    return this.userDailyReqService.list(query)
  }

  @Get('user-today')
  @ZodSerializerDto(GetListUserDailyRequestTodayDetailResDTO)
  @ResponseMessage(UserDailyRequestMessage.GET_LIST_SUCCESS)
  async getUserDailyRequestsToday(
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.userDailyReqService.getUserDailyRequestsToday(userId, lang)
  }

  @Get(':userDailyRequestId')
  @IsPublic()
  @ZodSerializerDto(GetUserDailyRequestDetailResDTO)
  @ResponseMessage(UserDailyRequestMessage.GET_SUCCESS)
  async findById(@Param() params: GetUserDailyRequestParamsDTO) {
    return this.userDailyReqService.findById(params.userDailyRequestId)
  }

  @Post()
  @ZodSerializerDto(CreateUserDailyRequestResDTO)
  @ResponseMessage(UserDailyRequestMessage.CREATE_SUCCESS)
  async create(
    @Body() body: CreatedUserDailyRequestBodyDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.userDailyReqService.create({
      data: body,
      createdById: userId
    })
  }

  @Put(':userDailyRequestId')
  @ZodSerializerDto(UpdateUserDailyRequestResDTO)
  @ResponseMessage(UserDailyRequestMessage.UPDATE_SUCCESS)
  async update(
    @Body() body: UpdateUserDailyRequestBodyDTO,
    @Param() params: GetUserDailyRequestParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.userDailyReqService.update({
      data: body,
      id: params.userDailyRequestId,
      updatedById: userId
    })
  }

  @Delete(':userDailyRequestId')
  @ZodSerializerDto(MessageResDTO)
  @ResponseMessage(UserDailyRequestMessage.DELETE_SUCCESS)
  async delete(
    @Param() params: GetUserDailyRequestParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    await this.userDailyReqService.delete({
      id: params.userDailyRequestId,
      deletedById: userId
    })
  }
}
