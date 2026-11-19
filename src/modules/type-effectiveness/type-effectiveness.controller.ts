import { I18nService } from '@/i18n/i18n.service'
import { TypeEffectivenessMessage } from '@/i18n/message-keys'
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
  constructor(
    private readonly typeEffectivenessService: TypeEffectivenessService,
    private readonly i18nService: I18nService
  ) {}

  @Get()
  @IsPublic()
  @ZodSerializerDto(PaginationResponseDTO)
  async list(@Query() query: PaginationQueryDTO, @I18nLang() lang: string) {
    return {
      message: this.i18nService.translate(
        TypeEffectivenessMessage.GET_LIST_SUCCESS,
        lang
      ),
      data: await this.typeEffectivenessService.list(query)
    }
  }

  @Get('matrix')
  @IsPublic()
  async getMatrix(@I18nLang() lang: string) {
    return {
      message: this.i18nService.translate(TypeEffectivenessMessage.GET_SUCCESS, lang),
      data: await this.typeEffectivenessService.getEffectivenessMatrix()
    }
  }

  @Get('weaknesses/:defenderId')
  @IsPublic()
  async getWeaknesses(@Param() params: GetDefenderParamsDTO, @I18nLang() lang: string) {
    return {
      message: this.i18nService.translate(
        TypeEffectivenessMessage.GET_LIST_SUCCESS,
        lang
      ),
      data: await this.typeEffectivenessService.getWeaknessesForDefender(
        params.defenderId
      )
    }
  }

  @Get('resistances/:defenderId')
  @IsPublic()
  async getResistances(@Param() params: GetDefenderParamsDTO, @I18nLang() lang: string) {
    return {
      message: this.i18nService.translate(
        TypeEffectivenessMessage.GET_LIST_SUCCESS,
        lang
      ),
      data: await this.typeEffectivenessService.getResistancesForDefender(
        params.defenderId
      )
    }
  }

  @Post('calculate-multi-type')
  @HttpCode(HttpStatus.OK)
  @IsPublic()
  async calculateMultiType(
    @Body() body: CalculateMultiTypeBodyDTO,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(TypeEffectivenessMessage.GET_SUCCESS, lang),
      data: await this.typeEffectivenessService.calculateMultiTypeEffectiveness(
        body.defenderTypeIds
      )
    }
  }

  @Get(':typeEffectivenessId')
  @IsPublic()
  @ZodSerializerDto(GetTypeEffectivenessDetailResDTO)
  async findById(
    @Param() params: GetTypeEffectivenessParamsDTO,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(TypeEffectivenessMessage.GET_SUCCESS, lang),
      data: await this.typeEffectivenessService.findById(params.typeEffectivenessId)
    }
  }

  @Post()
  @ZodSerializerDto(CreateTypeEffectivenessResDTO)
  async create(
    @Body() body: CreateTypeEffectivenessBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(TypeEffectivenessMessage.CREATE_SUCCESS, lang),
      data: await this.typeEffectivenessService.create({
        data: body,
        createdById: userId
      })
    }
  }

  @Put(':typeEffectivenessId')
  @ZodSerializerDto(UpdateTypeEffectivenessResDTO)
  async update(
    @Body() body: UpdateTypeEffectivenessBodyDTO,
    @Param() params: GetTypeEffectivenessParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(TypeEffectivenessMessage.UPDATE_SUCCESS, lang),
      data: await this.typeEffectivenessService.update({
        data: body,
        id: params.typeEffectivenessId,
        updatedById: userId
      })
    }
  }

  @Delete(':typeEffectivenessId')
  @ZodSerializerDto(MessageResDTO)
  async delete(
    @Param() params: GetTypeEffectivenessParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    await this.typeEffectivenessService.delete({
      id: params.typeEffectivenessId,
      deletedById: userId
    })
    return {
      message: this.i18nService.translate(TypeEffectivenessMessage.DELETE_SUCCESS, lang),
      data: null
    }
  }
}
