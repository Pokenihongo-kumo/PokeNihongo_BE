import { ResponseMessage } from '@/i18n/response-message'
import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { IsPublic } from '@/common/decorators/auth.decorator'
import { LevelMessage } from '@/i18n/message-keys'
import { PaginationQueryDTO } from '@/shared/dtos/request.dto'
import { MessageResDTO } from '@/shared/dtos/response.dto'
import { PaginationResponseSchema } from '@/shared/models/response.model'
import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common'
import { ZodSerializerDto } from 'nestjs-zod'
import {
  CreateLevelBodyDTO,
  CreateLevelResDTO,
  GetLevelDetailResDTO,
  GetLevelParamsDTO,
  UpdateLevelBodyDTO,
  UpdateLevelResDTO
} from './dto/level.zod-dto'
import { LevelService } from './level.service'

@Controller('level')
export class LevelController {
  // The service returns levels; the message is the HTTP layer's
  // (statusCode is set by TransformInterceptor from the HTTP status)
  constructor(private readonly levelService: LevelService) {}

  @Get()
  @IsPublic()
  @ZodSerializerDto(PaginationResponseSchema)
  @ResponseMessage(LevelMessage.GET_LIST_SUCCESS)
  async list(@Query() query: PaginationQueryDTO) {
    return this.levelService.list(query)
  }

  @Get(':levelId')
  @IsPublic()
  @ZodSerializerDto(GetLevelDetailResDTO)
  @ResponseMessage(LevelMessage.GET_SUCCESS)
  async findById(@Param() params: GetLevelParamsDTO) {
    return this.levelService.findById(params.levelId)
  }

  @Post()
  @ZodSerializerDto(CreateLevelResDTO)
  @ResponseMessage(LevelMessage.CREATE_SUCCESS)
  async create(@Body() body: CreateLevelBodyDTO, @ActiveUser('userId') userId: number) {
    return this.levelService.create({ data: body, createdById: userId })
  }

  @Put(':levelId')
  @ZodSerializerDto(UpdateLevelResDTO)
  @ResponseMessage(LevelMessage.UPDATE_SUCCESS)
  async update(
    @Body() body: UpdateLevelBodyDTO,
    @Param() params: GetLevelParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.levelService.update({
      data: body,
      id: params.levelId,
      updatedById: userId
    })
  }

  @Delete(':levelId')
  @ZodSerializerDto(MessageResDTO)
  @ResponseMessage(LevelMessage.DELETE_SUCCESS)
  async delete(@Param() params: GetLevelParamsDTO, @ActiveUser('userId') userId: number) {
    await this.levelService.delete({ id: params.levelId, deletedById: userId })
    // nothing returned: data null as before (MessageResDTO)
  }
}
