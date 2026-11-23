import { ResponseMessage } from '@/i18n/response-message'
import { RoleMessage } from '@/i18n/message-keys'
import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { PaginationQueryDTO } from '@/shared/dtos/request.dto'
import { PaginationResponseSchema } from '@/shared/models/response.model'
import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common'
import { ApiBearerAuth } from '@nestjs/swagger'
import { ZodSerializerDto } from 'nestjs-zod'
import {
  CreateRoleBodyDTO,
  CreateRoleResDTO,
  GetRoleDetailResDTO,
  GetRoleParamsDTO,
  UpdateRoleBodyDTO,
  UpdateRoleResDTO
} from '@/modules/role/role.dto'
import { RoleService } from '@/modules/role/role.service'
import { MessageResDTO } from '@/shared/dtos/response.dto'

@Controller('roles')
@ApiBearerAuth()
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Get()
  @ZodSerializerDto(PaginationResponseSchema)
  @ResponseMessage(RoleMessage.GET_LIST_SUCCESS)
  async list(@Query() query: PaginationQueryDTO) {
    return this.roleService.list(query)
  }

  @Get(':roleId')
  @ZodSerializerDto(GetRoleDetailResDTO)
  @ResponseMessage(RoleMessage.GET_SUCCESS)
  async findById(@Param() params: GetRoleParamsDTO, @Query() query: PaginationQueryDTO) {
    return this.roleService.findById(params.roleId, query)
  }

  @Post()
  @ZodSerializerDto(CreateRoleResDTO)
  @ResponseMessage(RoleMessage.CREATE_SUCCESS)
  async create(@Body() body: CreateRoleBodyDTO, @ActiveUser('userId') userId: number) {
    return this.roleService.create({
      data: body,
      createdById: userId
    })
  }

  @Put(':roleId')
  @ZodSerializerDto(UpdateRoleResDTO)
  @ResponseMessage(RoleMessage.UPDATE_SUCCESS)
  async update(
    @Body() body: UpdateRoleBodyDTO,
    @Param() params: GetRoleParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.roleService.update({
      data: body,
      id: params.roleId,
      updatedById: userId
    })
  }

  @Delete(':roleId')
  @ZodSerializerDto(MessageResDTO)
  @ResponseMessage(RoleMessage.DELETE_SUCCESS)
  async delete(@Param() params: GetRoleParamsDTO, @ActiveUser('userId') userId: number) {
    await this.roleService.delete({
      id: params.roleId,
      deletedById: userId
    })
  }
}
