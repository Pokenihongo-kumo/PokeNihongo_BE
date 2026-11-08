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
  constructor(private readonly elementalTypeService: ElementalTypeService) {}

  @Get()
  @IsPublic()
  @ZodSerializerDto(PaginationResponseSchema)
  list(@Query() query: PaginationQueryDTO, @I18nLang() lang: string) {
    return this.elementalTypeService.list(query, lang)
  }

  @Get('active')
  @IsPublic()
  // Was PaginationResponseSchema while the data is an array: always 500
  @ZodSerializerDto(GetActiveElementalTypesResDTO)
  getAllActiveTypes(@I18nLang() lang: string) {
    return this.elementalTypeService.getAllActiveTypes(lang)
  }

  @Get(':elementId')
  @IsPublic()
  @ZodSerializerDto(GetElementalTypeDetailResDTO)
  findById(@Param() params: GetElementalTypeParamsDTO, @I18nLang() lang: string) {
    return this.elementalTypeService.findById(params.elementId, lang)
  }

  @Post()
  @ZodSerializerDto(CreateElementalTypeResDTO)
  create(
    @Body() body: CreateElementalTypeBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.elementalTypeService.create(
      {
        data: body,
        createdById: userId
      },
      lang
    )
  }

  @Put(':elementId')
  @ZodSerializerDto(UpdateElementalTypeResDTO)
  update(
    @Body() body: UpdateElementalTypeBodyDTO,
    @Param() params: GetElementalTypeParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.elementalTypeService.update(
      {
        data: body,
        id: params.elementId,
        updatedById: userId
      },
      lang
    )
  }

  @Delete(':elementId')
  @ZodSerializerDto(MessageResDTO)
  delete(
    @Param() params: GetElementalTypeParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.elementalTypeService.delete(
      {
        id: params.elementId,
        deletedById: userId
      },
      lang
    )
  }
}
