import { ResponseMessage } from '@/i18n/response-message'
import { PermissionMessage } from 'src/i18n/message-keys'
import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { PaginationQueryDTO } from '@/shared/dtos/request.dto'
import { PaginationResponseSchema } from '@/shared/models/response.model'
import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common'
import { ApiBearerAuth } from '@nestjs/swagger'
import { ZodSerializerDto } from 'nestjs-zod'
import {
  CreatePermissionBodyDTO,
  CreatePermissionResDTO,
  GetPermissionDetailResDTO,
  GetPermissionParamsDTO,
  UpdatePermissionBodyDTO,
  UpdatePermissionResDTO
} from 'src/modules/permission/permission.dto'
import { PermissionService } from 'src/modules/permission/permission.service'
import { MessageResDTO } from 'src/shared/dtos/response.dto'

@Controller('permissions')
@ApiBearerAuth()
export class PermissionController {
  constructor(private readonly permissionService: PermissionService) {}

  //permissions?currentPage=1&pageSize=15&qs=name:like=POST,path:like=/auth/l,sort:-name
  @Get()
  @ZodSerializerDto(PaginationResponseSchema)
  @ResponseMessage(PermissionMessage.GET_LIST_SUCCESS)
  async list(@Query() query: PaginationQueryDTO) {
    return this.permissionService.list(query)
  }

  @Get(':permissionId')
  @ZodSerializerDto(GetPermissionDetailResDTO)
  @ResponseMessage(PermissionMessage.GET_SUCCESS)
  async findById(@Param() params: GetPermissionParamsDTO) {
    return this.permissionService.findById(params.permissionId)
  }

  @Post()
  @ZodSerializerDto(CreatePermissionResDTO)
  @ResponseMessage(PermissionMessage.CREATE_SUCCESS)
  async create(
    @Body() body: CreatePermissionBodyDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.permissionService.create({
      data: body,
      createdById: userId
    })
  }

  @Put(':permissionId')
  @ZodSerializerDto(UpdatePermissionResDTO)
  @ResponseMessage(PermissionMessage.UPDATE_SUCCESS)
  async update(
    @Body() body: UpdatePermissionBodyDTO,
    @Param() params: GetPermissionParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.permissionService.update({
      data: body,
      id: params.permissionId,
      updatedById: userId
    })
  }

  @Delete(':permissionId')
  @ZodSerializerDto(MessageResDTO)
  @ResponseMessage(PermissionMessage.DELETE_SUCCESS)
  async delete(
    @Param() params: GetPermissionParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    await this.permissionService.delete({
      id: params.permissionId,
      deletedById: userId
    })
  }
}
