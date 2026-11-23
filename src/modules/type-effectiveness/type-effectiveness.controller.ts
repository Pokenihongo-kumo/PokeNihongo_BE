import { ResponseMessage } from '@/i18n/response-message'
import { TypeEffectivenessMessage } from '@/i18n/message-keys'
import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { IsPublic } from '@/common/decorators/auth.decorator'
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
  UpdateTypeEffectivenessResDTO,
  TypeEffectivenessMatrixResDTO,
  TypeEffectivenessArrayResDTO,
  MultiTypeEffectivenessResDTO
} from './dto/type-effectiveness.zod-dto'
import { TypeEffectivenessService } from './type-effectiveness.service'

@Controller('type-effectiveness')
export class TypeEffectivenessController {
  constructor(private readonly typeEffectivenessService: TypeEffectivenessService) {}

  @Get()
  @IsPublic()
  @ZodSerializerDto(PaginationResponseDTO)
  @ResponseMessage(TypeEffectivenessMessage.GET_LIST_SUCCESS)
  async list(@Query() query: PaginationQueryDTO) {
    return this.typeEffectivenessService.list(query)
  }

  @Get('matrix')
  @IsPublic()
  @ResponseMessage(TypeEffectivenessMessage.GET_SUCCESS)
  @ZodSerializerDto(TypeEffectivenessMatrixResDTO)
  async getMatrix() {
    return this.typeEffectivenessService.getEffectivenessMatrix()
  }

  @Get('weaknesses/:defenderId')
  @IsPublic()
  @ResponseMessage(TypeEffectivenessMessage.GET_LIST_SUCCESS)
  @ZodSerializerDto(TypeEffectivenessArrayResDTO)
  async getWeaknesses(@Param() params: GetDefenderParamsDTO) {
    return this.typeEffectivenessService.getWeaknessesForDefender(params.defenderId)
  }

  @Get('resistances/:defenderId')
  @IsPublic()
  @ResponseMessage(TypeEffectivenessMessage.GET_LIST_SUCCESS)
  @ZodSerializerDto(TypeEffectivenessArrayResDTO)
  async getResistances(@Param() params: GetDefenderParamsDTO) {
    return this.typeEffectivenessService.getResistancesForDefender(params.defenderId)
  }

  @Post('calculate-multi-type')
  @HttpCode(HttpStatus.OK)
  @IsPublic()
  @ResponseMessage(TypeEffectivenessMessage.GET_SUCCESS)
  @ZodSerializerDto(MultiTypeEffectivenessResDTO)
  async calculateMultiType(@Body() body: CalculateMultiTypeBodyDTO) {
    return this.typeEffectivenessService.calculateMultiTypeEffectiveness(
      body.defenderTypeIds
    )
  }

  @Get(':typeEffectivenessId')
  @IsPublic()
  @ZodSerializerDto(GetTypeEffectivenessDetailResDTO)
  @ResponseMessage(TypeEffectivenessMessage.GET_SUCCESS)
  async findById(@Param() params: GetTypeEffectivenessParamsDTO) {
    return this.typeEffectivenessService.findById(params.typeEffectivenessId)
  }

  @Post()
  @ZodSerializerDto(CreateTypeEffectivenessResDTO)
  @ResponseMessage(TypeEffectivenessMessage.CREATE_SUCCESS)
  async create(
    @Body() body: CreateTypeEffectivenessBodyDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.typeEffectivenessService.create({
      data: body,
      createdById: userId
    })
  }

  @Put(':typeEffectivenessId')
  @ZodSerializerDto(UpdateTypeEffectivenessResDTO)
  @ResponseMessage(TypeEffectivenessMessage.UPDATE_SUCCESS)
  async update(
    @Body() body: UpdateTypeEffectivenessBodyDTO,
    @Param() params: GetTypeEffectivenessParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.typeEffectivenessService.update({
      data: body,
      id: params.typeEffectivenessId,
      updatedById: userId
    })
  }

  @Delete(':typeEffectivenessId')
  @ZodSerializerDto(MessageResDTO)
  @ResponseMessage(TypeEffectivenessMessage.DELETE_SUCCESS)
  async delete(
    @Param() params: GetTypeEffectivenessParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    await this.typeEffectivenessService.delete({
      id: params.typeEffectivenessId,
      deletedById: userId
    })
  }
}
