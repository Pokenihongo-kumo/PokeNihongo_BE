import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { IsPublic } from '@/common/decorators/auth.decorator'
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'
import { PaginationQueryDTO } from '@/shared/dtos/request.dto'
import { MessageResDTO, PaginationResponseDTO } from '@/shared/dtos/response.dto'
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  HttpCode,
  HttpStatus
} from '@nestjs/common'
import { ZodSerializerDto } from 'nestjs-zod'
import {
  CreateTypeEffectivenessBodyDTO,
  CreateTypeEffectivenessResDTO,
  GetTypeEffectivenessDetailResDTO,
  GetTypeEffectivenessParamsDTO,
  UpdateTypeEffectivenessBodyDTO,
  UpdateTypeEffectivenessResDTO
} from './dto/type-effectiveness.zod-dto'
import { TypeEffectivenessService } from './type-effectiveness.service'

@Controller('type-effectiveness')
export class TypeEffectivenessController {
  constructor(private readonly typeEffectivenessService: TypeEffectivenessService) {}

  @Get()
  @IsPublic()
  @ZodSerializerDto(PaginationResponseDTO)
  list(@Query() query: PaginationQueryDTO) {
    return this.typeEffectivenessService.list(query)
  }

  @Get('matrix')
  @IsPublic()
  getMatrix(@I18nLang() lang: string) {
    return this.typeEffectivenessService.getEffectivenessMatrix(lang)
  }

  @Get('weaknesses/:defenderId')
  @IsPublic()
  getWeaknesses(@Param('defenderId') defenderId: string, @I18nLang() lang: string) {
    return this.typeEffectivenessService.getWeaknessesForDefender(+defenderId, lang)
  }

  @Get('resistances/:defenderId')
  @IsPublic()
  getResistances(@Param('defenderId') defenderId: string, @I18nLang() lang: string) {
    return this.typeEffectivenessService.getResistancesForDefender(+defenderId, lang)
  }

  @Post('calculate-multi-type')
  @HttpCode(HttpStatus.OK)
  @IsPublic()
  calculateMultiType(
    @Body() body: { defenderTypeIds: number[] },
    @I18nLang() lang: string
  ) {
    return this.typeEffectivenessService.calculateMultiTypeEffectiveness(
      body.defenderTypeIds,
      lang
    )
  }

  @Get(':typeEffectivenessId')
  @IsPublic()
  @ZodSerializerDto(GetTypeEffectivenessDetailResDTO)
  findById(@Param() params: GetTypeEffectivenessParamsDTO, @I18nLang() lang: string) {
    return this.typeEffectivenessService.findById(params.typeEffectivenessId, lang)
  }

  @Post()
  @ZodSerializerDto(CreateTypeEffectivenessResDTO)
  create(
    @Body() body: CreateTypeEffectivenessBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.typeEffectivenessService.create(
      {
        data: body,
        createdById: userId
      },
      lang
    )
  }

  @Put(':typeEffectivenessId')
  @ZodSerializerDto(UpdateTypeEffectivenessResDTO)
  update(
    @Body() body: UpdateTypeEffectivenessBodyDTO,
    @Param() params: GetTypeEffectivenessParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.typeEffectivenessService.update(
      {
        data: body,
        id: params.typeEffectivenessId,
        updatedById: userId
      },
      lang
    )
  }

  @Delete(':typeEffectivenessId')
  @ZodSerializerDto(MessageResDTO)
  delete(
    @Param() params: GetTypeEffectivenessParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.typeEffectivenessService.delete(
      {
        id: params.typeEffectivenessId,
        deletedById: userId
      },
      lang
    )
  }
}
