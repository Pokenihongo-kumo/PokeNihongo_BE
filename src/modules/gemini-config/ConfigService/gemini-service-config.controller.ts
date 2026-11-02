import { Body, Controller, Delete, Get, Param, Patch, Post, Put } from '@nestjs/common'
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger'
import { ZodSerializerDto } from 'nestjs-zod'
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'
import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { GeminiConfigService } from '../gemini-config.service'
import {
  CreateGeminiServiceConfigSwaggerDTO,
  GeminiServiceConfigSwaggerDTO,
  UpdateGeminiServiceConfigSwaggerDTO,
  UpdateGeminiServiceConfigToggleSwaggerDTO
} from './gemini-service-config.dto'
import { MessageResDTO } from '@/shared/dtos/response.dto'

@ApiTags('Gemini Service Config')
@Controller('gemini-config/service-configs')
@ApiBearerAuth()
export class GeminiServiceConfigController {
  constructor(private readonly geminiConfigService: GeminiConfigService) {}

  @Post()
  @ApiOperation({
    summary: 'Tạo mapping GeminiServiceConfig (gán GeminiConfig cho một service/use-case)'
  })
  @ApiBody({
    type: CreateGeminiServiceConfigSwaggerDTO,
    description:
      'Gán `geminiConfigId` vào `serviceType`. Có thể đặt mặc định và kích hoạt.'
  })
  create(
    @Body()
    body: {
      serviceType: any
      geminiConfigId: number
      isDefault?: boolean
      isActive?: boolean
    },
    @ActiveUser('userId') _userId: number,
    @I18nLang() lang: string
  ) {
    return this.geminiConfigService.createServiceConfig(body as any)
  }

  @Get()
  @ApiOperation({
    summary:
      'Danh sách tất cả cấu hình GeminiServiceConfig (kèm chi tiết GeminiConfigModel/GeminiModel)'
  })
  list(@I18nLang() _lang: string) {
    return this.geminiConfigService.listServiceConfigs()
  }

  @Patch(':id/set-default')
  @ApiOperation({
    summary: 'Đặt cấu hình làm mặc định cho serviceType (tự động bỏ mặc định cái khác)'
  })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ZodSerializerDto(GeminiServiceConfigSwaggerDTO as any)
  setDefault(@Param('id') id: number) {
    return this.geminiConfigService.setDefaultServiceConfig(Number(id))
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật geminiConfigId cho một cấu hình service' })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiBody({
    type: UpdateGeminiServiceConfigSwaggerDTO,
    description: 'Thay đổi geminiConfigId cho service config'
  })
  @ZodSerializerDto(GeminiServiceConfigSwaggerDTO as any)
  update(@Param('id') id: number, @Body() body: { geminiConfigId: number }) {
    return this.geminiConfigService.updateServiceConfig(Number(id), body.geminiConfigId)
  }

  @Patch(':id/toggle')
  @ApiOperation({ summary: 'Bật/tắt một cấu hình cho serviceType' })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiBody({ type: UpdateGeminiServiceConfigToggleSwaggerDTO })
  toggle(@Param('id') id: number, @Body() body: { isActive: boolean }) {
    return this.geminiConfigService.toggleServiceConfig(Number(id), !!body.isActive)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xoá mapping GeminiServiceConfig' })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ZodSerializerDto(MessageResDTO)
  async delete(@Param('id') id: number) {
    await this.geminiConfigService.deleteServiceConfig(Number(id))
    return { statusCode: 200, data: null, message: 'DELETE_SUCCESS' }
  }
}
