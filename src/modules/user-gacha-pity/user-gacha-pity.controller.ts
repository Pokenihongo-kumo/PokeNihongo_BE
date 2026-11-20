import { ResponseMessage, msg } from '@/i18n/response-message'
import { UserGachaPityMessage } from '@/i18n/message-keys'
import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { PaginationQueryDTO } from '@/shared/dtos/request.dto'
import { MessageResDTO, PaginationResponseDTO } from '@/shared/dtos/response.dto'
import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common'
import { ZodSerializerDto } from 'nestjs-zod'
import {
  CreateUserGachaPityBodyDTO,
  CreateUserGachaPityResDTO,
  GetUserGachaPityDetailResDTO,
  GetUserGachaPityParamsDTO,
  UpdateUserGachaPityBodyDTO,
  UpdateUserGachaPityResDTO
} from './dto/user-gacha-pity.dto'
import { UserGachaPityService } from './user-gacha-pity.service'

@Controller('user-gacha-pity')
export class UserGachaPityController {
  constructor(private readonly userGachaPityService: UserGachaPityService) {}

  @Get()
  @ZodSerializerDto(PaginationResponseDTO)
  @ResponseMessage(UserGachaPityMessage.GET_LIST_SUCCESS)
  async list(@Query() query: PaginationQueryDTO) {
    return this.userGachaPityService.list(query)
  }

  @Get('user/present')
  @ZodSerializerDto(GetUserGachaPityDetailResDTO)
  async getUserPityNow(@ActiveUser('userId') userId: number) {
    const { created, data } = await this.userGachaPityService.getUserPityNow(userId)
    return {
      message: msg(
        created
          ? UserGachaPityMessage.CREATE_SUCCESS
          : UserGachaPityMessage.GET_LIST_SUCCESS
      ),
      data
    }
  }

  @Get(':userGachaPityId')
  @ZodSerializerDto(GetUserGachaPityDetailResDTO)
  @ResponseMessage(UserGachaPityMessage.GET_LIST_SUCCESS)
  async findById(
    @Param() params: GetUserGachaPityParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.userGachaPityService.findById(params.userGachaPityId)
  }

  @Post()
  @ZodSerializerDto(CreateUserGachaPityResDTO)
  @ResponseMessage(UserGachaPityMessage.CREATE_SUCCESS)
  async create(
    @Body() body: CreateUserGachaPityBodyDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.userGachaPityService.create({
      userId,
      data: body
    })
  }

  @Put(':userGachaPityId')
  @ZodSerializerDto(UpdateUserGachaPityResDTO)
  @ResponseMessage(UserGachaPityMessage.UPDATE_SUCCESS)
  async update(
    @Body() body: UpdateUserGachaPityBodyDTO,
    @Param() params: GetUserGachaPityParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.userGachaPityService.update({
      data: body,
      id: params.userGachaPityId,
      userId
    })
  }

  @Delete(':userGachaPityId')
  @ZodSerializerDto(MessageResDTO)
  @ResponseMessage(UserGachaPityMessage.DELETE_SUCCESS)
  async delete(
    @Param() params: GetUserGachaPityParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    await this.userGachaPityService.delete({
      id: params.userGachaPityId,
      userId
    })
  }
}
