import { I18nService } from '@/i18n/i18n.service'
import { PermissionMessage } from 'src/i18n/message-keys'
import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'
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
  constructor(
    private readonly permissionService: PermissionService,
    private readonly i18nService: I18nService
  ) {}

  //permissions?currentPage=1&pageSize=15&qs=name:like=POST,path:like=/auth/l,sort:-name
  @Get()
  @ZodSerializerDto(PaginationResponseSchema)
  async list(@Query() query: PaginationQueryDTO, @I18nLang() lang: string) {
    return {
      message: this.i18nService.translate(PermissionMessage.GET_LIST_SUCCESS, lang),
      data: await this.permissionService.list(query)
    }
  }

  @Get(':permissionId')
  @ZodSerializerDto(GetPermissionDetailResDTO)
  async findById(@Param() params: GetPermissionParamsDTO, @I18nLang() lang: string) {
    return {
      message: this.i18nService.translate(PermissionMessage.GET_SUCCESS, lang),
      data: await this.permissionService.findById(params.permissionId)
    }
  }

  @Post()
  @ZodSerializerDto(CreatePermissionResDTO)
  async create(
    @Body() body: CreatePermissionBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(PermissionMessage.CREATE_SUCCESS, lang),
      data: await this.permissionService.create({
        data: body,
        createdById: userId
      })
    }
  }

  @Put(':permissionId')
  @ZodSerializerDto(UpdatePermissionResDTO)
  async update(
    @Body() body: UpdatePermissionBodyDTO,
    @Param() params: GetPermissionParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(PermissionMessage.UPDATE_SUCCESS, lang),
      data: await this.permissionService.update({
        data: body,
        id: params.permissionId,
        updatedById: userId
      })
    }
  }

  @Delete(':permissionId')
  @ZodSerializerDto(MessageResDTO)
  async delete(
    @Param() params: GetPermissionParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    await this.permissionService.delete({
      id: params.permissionId,
      deletedById: userId
    })
    return {
      message: this.i18nService.translate(PermissionMessage.DELETE_SUCCESS, lang),
      data: null
    }
  }
}
