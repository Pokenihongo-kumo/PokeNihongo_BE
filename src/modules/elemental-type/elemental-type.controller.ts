import { I18nService } from '@/i18n/i18n.service'
import { ElementalTypeMessage } from '@/i18n/message-keys'
import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { IsPublic } from '@/common/decorators/auth.decorator'
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'
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
  constructor(
    private readonly elementalTypeService: ElementalTypeService,
    private readonly i18nService: I18nService
  ) {}

  @Get()
  @IsPublic()
  @ZodSerializerDto(PaginationResponseSchema)
  async list(@Query() query: PaginationQueryDTO, @I18nLang() lang: string) {
    return {
      message: this.i18nService.translate(ElementalTypeMessage.GET_LIST_SUCCESS, lang),
      data: await this.elementalTypeService.list(query)
    }
  }

  @Get('active')
  @IsPublic()
  // Was PaginationResponseSchema while the data is an array: always 500
  @ZodSerializerDto(GetActiveElementalTypesResDTO)
  async getAllActiveTypes(@I18nLang() lang: string) {
    return {
      message: this.i18nService.translate(ElementalTypeMessage.GET_LIST_SUCCESS, lang),
      data: await this.elementalTypeService.getAllActiveTypes()
    }
  }

  @Get(':elementId')
  @IsPublic()
  @ZodSerializerDto(GetElementalTypeDetailResDTO)
  async findById(@Param() params: GetElementalTypeParamsDTO, @I18nLang() lang: string) {
    return {
      message: this.i18nService.translate(ElementalTypeMessage.GET_SUCCESS, lang),
      data: await this.elementalTypeService.findById(params.elementId)
    }
  }

  @Post()
  @ZodSerializerDto(CreateElementalTypeResDTO)
  async create(
    @Body() body: CreateElementalTypeBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(ElementalTypeMessage.CREATE_SUCCESS, lang),
      data: await this.elementalTypeService.create({
        data: body,
        createdById: userId
      })
    }
  }

  @Put(':elementId')
  @ZodSerializerDto(UpdateElementalTypeResDTO)
  async update(
    @Body() body: UpdateElementalTypeBodyDTO,
    @Param() params: GetElementalTypeParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(ElementalTypeMessage.UPDATE_SUCCESS, lang),
      data: await this.elementalTypeService.update({
        data: body,
        id: params.elementId,
        updatedById: userId
      })
    }
  }

  @Delete(':elementId')
  @ZodSerializerDto(MessageResDTO)
  async delete(
    @Param() params: GetElementalTypeParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    await this.elementalTypeService.delete({
      id: params.elementId,
      deletedById: userId
    })
    return {
      message: this.i18nService.translate(ElementalTypeMessage.DELETE_SUCCESS, lang),
      data: null
    }
  }
}
