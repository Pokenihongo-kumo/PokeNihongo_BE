import { ResponseMessage } from '@/i18n/response-message'
import { ElementalTypeMessage } from '@/i18n/message-keys'
import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { IsPublic } from '@/common/decorators/auth.decorator'
import { PaginationQueryDTO } from '@/shared/dtos/request.dto'
import { MessageResDTO } from '@/shared/dtos/response.dto'
import { PaginationResponseSchema } from '@/shared/models/response.model'
import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common'
import { ZodSerializerDto } from 'nestjs-zod'
import {
  CreateElementalTypeBodyDTO,
  CreateElementalTypeResDTO,
  GetActiveElementalTypesResDTO,
  GetElementalTypeDetailResDTO,
  GetElementalTypeParamsDTO,
  UpdateElementalTypeBodyDTO,
  UpdateElementalTypeResDTO
} from './dto/elemental-type.zod-dto'
import { ElementalTypeService } from './elemental-type.service'

@Controller('elemental-type')
export class ElementalTypeController {
  constructor(private readonly elementalTypeService: ElementalTypeService) {}

  @Get()
  @IsPublic()
  @ZodSerializerDto(PaginationResponseSchema)
  @ResponseMessage(ElementalTypeMessage.GET_LIST_SUCCESS)
  async list(@Query() query: PaginationQueryDTO) {
    return this.elementalTypeService.list(query)
  }

  @Get('active')
  @IsPublic()
  // Was PaginationResponseSchema while the data is an array: always 500
  @ZodSerializerDto(GetActiveElementalTypesResDTO)
  @ResponseMessage(ElementalTypeMessage.GET_LIST_SUCCESS)
  async getAllActiveTypes() {
    return this.elementalTypeService.getAllActiveTypes()
  }

  @Get(':elementId')
  @IsPublic()
  @ZodSerializerDto(GetElementalTypeDetailResDTO)
  @ResponseMessage(ElementalTypeMessage.GET_SUCCESS)
  async findById(@Param() params: GetElementalTypeParamsDTO) {
    return this.elementalTypeService.findById(params.elementId)
  }

  @Post()
  @ZodSerializerDto(CreateElementalTypeResDTO)
  @ResponseMessage(ElementalTypeMessage.CREATE_SUCCESS)
  async create(
    @Body() body: CreateElementalTypeBodyDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.elementalTypeService.create({
      data: body,
      createdById: userId
    })
  }

  @Put(':elementId')
  @ZodSerializerDto(UpdateElementalTypeResDTO)
  @ResponseMessage(ElementalTypeMessage.UPDATE_SUCCESS)
  async update(
    @Body() body: UpdateElementalTypeBodyDTO,
    @Param() params: GetElementalTypeParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.elementalTypeService.update({
      data: body,
      id: params.elementId,
      updatedById: userId
    })
  }

  @Delete(':elementId')
  @ZodSerializerDto(MessageResDTO)
  @ResponseMessage(ElementalTypeMessage.DELETE_SUCCESS)
  async delete(
    @Param() params: GetElementalTypeParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    await this.elementalTypeService.delete({
      id: params.elementId,
      deletedById: userId
    })
  }
}
