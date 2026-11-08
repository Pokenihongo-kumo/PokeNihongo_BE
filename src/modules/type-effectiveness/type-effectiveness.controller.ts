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
  CalculateMultiTypeBodyDTO,
  CreateTypeEffectivenessBodyDTO,
  CreateTypeEffectivenessResDTO,
  GetDefenderParamsDTO,
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
  list(@Query() query: PaginationQueryDTO, @I18nLang() lang: string) {
    return this.typeEffectivenessService.list(query, lang)
  }

  @Get('matrix')
  @IsPublic()
  getMatrix(@I18nLang() lang: string) {
    return this.typeEffectivenessService.getEffectivenessMatrix(lang)
  }

  @Get('weaknesses/:defenderId')
  @IsPublic()
  getWeaknesses(@Param() params: GetDefenderParamsDTO, @I18nLang() lang: string) {
    return this.typeEffectivenessService.getWeaknessesForDefender(params.defenderId, lang)
  }

  @Get('resistances/:defenderId')
  @IsPublic()
  getResistances(@Param() params: GetDefenderParamsDTO, @I18nLang() lang: string) {
    return this.typeEffectivenessService.getResistancesForDefender(
      params.defenderId,
      lang
    )
  }

  @Post('calculate-multi-type')
  @HttpCode(HttpStatus.OK)
  @IsPublic()
  calculateMultiType(@Body() body: CalculateMultiTypeBodyDTO, @I18nLang() lang: string) {
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
