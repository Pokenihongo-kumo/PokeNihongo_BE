import { I18nService } from '@/i18n/i18n.service'
import { RoleMessage } from 'src/i18n/message-keys'
import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'
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
} from 'src/modules/role/role.dto'
import { RoleService } from 'src/modules/role/role.service'
import { MessageResDTO } from 'src/shared/dtos/response.dto'

@Controller('roles')
@ApiBearerAuth()
export class RoleController {
  constructor(
    private readonly roleService: RoleService,
    private readonly i18nService: I18nService
  ) {}

  @Get()
  @ZodSerializerDto(PaginationResponseSchema)
  async list(@Query() query: PaginationQueryDTO, @I18nLang() lang: string) {
    return {
      message: this.i18nService.translate(RoleMessage.GET_LIST_SUCCESS, lang),
      data: await this.roleService.list(query)
    }
  }

  @Get(':roleId')
  @ZodSerializerDto(GetRoleDetailResDTO)
  async findById(
    @Param() params: GetRoleParamsDTO,
    @Query() query: PaginationQueryDTO,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(RoleMessage.GET_SUCCESS, lang),
      data: await this.roleService.findById(params.roleId, query)
    }
  }

  @Post()
  @ZodSerializerDto(CreateRoleResDTO)
  async create(
    @Body() body: CreateRoleBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(RoleMessage.CREATE_SUCCESS, lang),
      data: await this.roleService.create({
        data: body,
        createdById: userId
      })
    }
  }

  @Put(':roleId')
  @ZodSerializerDto(UpdateRoleResDTO)
  async update(
    @Body() body: UpdateRoleBodyDTO,
    @Param() params: GetRoleParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(RoleMessage.UPDATE_SUCCESS, lang),
      data: await this.roleService.update({
        data: body,
        id: params.roleId,
        updatedById: userId
      })
    }
  }

  @Delete(':roleId')
  @ZodSerializerDto(MessageResDTO)
  async delete(
    @Param() params: GetRoleParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    await this.roleService.delete({
      id: params.roleId,
      deletedById: userId
    })
    return {
      message: this.i18nService.translate(RoleMessage.DELETE_SUCCESS, lang),
      data: null
    }
  }
}
