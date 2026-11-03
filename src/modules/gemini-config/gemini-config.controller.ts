import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { PaginationQueryDTO } from '@/shared/dtos/request.dto'
import { PaginationResponseSchema } from '@/shared/models/response.model'
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Patch,
  HttpCode,
  HttpStatus
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiParam,
  ApiBody
} from '@nestjs/swagger'
import { ZodSerializerDto } from 'nestjs-zod'
import {
  CreateGeminiConfigBodyDTO,
  CreateGeminiConfigResDTO,
  GetGeminiConfigResDTO,
  GetParamsGeminiConfigDTO,
  UpdateGeminiConfigBodyDTO,
  UpdateGeminiConfigResDTO
} from 'src/modules/gemini-config/dto/gemini-config.zod-dto'
import {
  CreateGeminiConfigSwaggerDTO,
  UpdateGeminiConfigSwaggerDTO
} from './dto/gemini-config.dto'
import { GeminiConfigType } from '@prisma/client'
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'
import { MessageResDTO } from 'src/shared/dtos/response.dto'
import { GeminiConfigService } from './gemini-config.service'
import {
  GeminiConfigListQuerySwaggerDTO,
  GeminiModelListQuerySwaggerDTO,
  GeminiConfigModelListQuerySwaggerDTO
} from './dto/gemini-config.query.dto'
import {
  CreateGeminiConfigModelSwaggerDTO,
  UpdateGeminiConfigModelSwaggerDTO,
  ApplyPresetBodySwaggerDTO,
  UpdateConfigModelPolicyBodySwaggerDTO
} from './dto/gemini-config-model.dto'
import {
  CreateGeminiConfigModelBodyDTO,
  UpdateGeminiConfigModelBodyDTO,
  GeminiConfigModelResDTO
} from './dto/gemini-config.zod-dto'
import { SchemaIntrospectService } from './schema-introspect.service'

@Controller('gemini-config')
@ApiBearerAuth()
export class GeminiConfigController {
  constructor(
    private readonly geminiConfigService: GeminiConfigService,
    private readonly schemaIntrospectService: SchemaIntrospectService
  ) {}

  @Get('promt')
  @ZodSerializerDto(PaginationResponseSchema)
  @ApiOperation({ summary: 'Danh sách Gemini Configs (có phân trang + lọc)' })
  @ApiQuery({ type: GeminiConfigListQuerySwaggerDTO })
  list(@Query() query: PaginationQueryDTO, @I18nLang() lang: string) {
    return this.geminiConfigService.list(query, lang)
  }

  // Removed legacy endpoints: findByConfigType and seedDefault (moved/replaced by new architecture)

  @Get('models')
  @ApiOperation({ summary: 'Danh sách Gemini Models (bảng GeminiModel)' })
  @ApiQuery({ type: GeminiModelListQuerySwaggerDTO })
  listModels(@I18nLang() lang: string) {
    return this.geminiConfigService.listModels(lang)
  }

  // Presets
  @Get('presets')
  @ApiOperation({ summary: 'Danh sách presets cấu hình model' })
  listPresets(@I18nLang() lang: string) {
    return this.geminiConfigService.listPresets(lang)
  }

  @Post('presets/seed-default')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Seed các preset mặc định vào DB' })
  seedPresets(@I18nLang() lang: string) {
    return this.geminiConfigService.seedDefaultPresets(lang)
  }

  @Post('models/seed-default')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Seed default Gemini models vào bảng GeminiModel' })
  seedDefaultModels(@I18nLang() lang: string) {
    return this.geminiConfigService.seedDefaultModels(lang)
  }

  // GeminiConfigModel endpoints (static paths first to avoid conflict with ":geminiConfigId")
  @Get('config-models')
  @ZodSerializerDto(PaginationResponseSchema)
  @ApiOperation({
    summary: 'Danh sách Gemini Config Models (GeminiConfigModel) có phân trang + lọc'
  })
  @ApiQuery({ type: GeminiConfigModelListQuerySwaggerDTO })
  listConfigModels(@Query() query: PaginationQueryDTO, @I18nLang() lang: string) {
    return this.geminiConfigService.listConfigModels(query as any, lang)
  }

  @Get('admin/schema')
  @ApiOperation({
    summary: 'Liệt kê tên bảng (đã lọc an toàn) cho Admin cấu hình policy'
  })
  @ApiQuery({ name: 'q', required: false, description: 'Từ khóa tìm kiếm theo tên bảng' })
  getAdminSchema(@Query('q') q?: string) {
    const names = this.schemaIntrospectService.listModels().map((m) => m.name)
    const filtered = q
      ? names.filter((n) => n.toLowerCase().includes(String(q).toLowerCase()))
      : names
    return { statusCode: 200, data: filtered, message: 'GET_SUCCESS' }
  }

  @Get('admin/schema/fields')
  @ApiOperation({
    summary: 'Nhập mảng entity name → trả về danh sách field của từng entity'
  })
  @ApiQuery({
    name: 'entities',
    required: true,
    description: 'Danh sách entity, phân tách bởi dấu phẩy. Ví dụ: User,QuestionBank'
  })
  getAdminSchemaFields(@Query('entities') entities?: string) {
    const models = this.schemaIntrospectService.listModels()
    const nameToFields = new Map<string, string[]>(
      models.map((m) => [m.name, (m.fields || []).map((f: any) => f.name)])
    )
    const requested = (entities || '')
      .split(',')
      .map((s) => s.trim())
      .filter((s) => !!s)

    const data: Record<string, string[]> = {}
    for (const n of requested) {
      if (nameToFields.has(n)) data[n] = nameToFields.get(n) as string[]
    }

    return { statusCode: 200, data, message: 'GET_SUCCESS' }
  }

  @Get('config-models/:id')
  @ApiOperation({ summary: 'Chi tiết Gemini Config Model theo ID' })
  @ApiParam({
    name: 'id',
    type: Number,
    required: true,
    description: 'ID của GeminiConfigModel'
  })
  @ZodSerializerDto(GeminiConfigModelResDTO)
  getConfigModelById(@Param('id') id: number, @I18nLang() lang: string) {
    return this.geminiConfigService.findConfigModelById(Number(id), lang)
  }

  @Post('config-models')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Tạo Gemini Config Model' })
  @ApiBody({ type: CreateGeminiConfigModelSwaggerDTO })
  @ZodSerializerDto(GeminiConfigModelResDTO)
  createConfigModel(
    @Body() body: CreateGeminiConfigModelBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.geminiConfigService.createConfigModel(
      { data: body, createdById: userId },
      lang
    )
  }

  @Put('config-models/:id')
  @ApiOperation({ summary: 'Cập nhật Gemini Config Model' })
  @ApiParam({
    name: 'id',
    type: Number,
    required: true,
    description: 'ID của GeminiConfigModel'
  })
  @ApiBody({ type: UpdateGeminiConfigModelSwaggerDTO })
  @ZodSerializerDto(GeminiConfigModelResDTO)
  updateConfigModel(
    @Param('id') id: number,
    @Body() body: UpdateGeminiConfigModelBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.geminiConfigService.updateConfigModel(
      { id: Number(id), data: body, updatedById: userId },
      lang
    )
  }

  @Patch('config-models/:id/policy')
  @ApiOperation({
    summary: 'Cập nhật policy AI vào extraParams.policy của GeminiConfigModel'
  })
  @ApiParam({ name: 'id', type: Number, required: true })
  @ApiBody({ type: UpdateConfigModelPolicyBodySwaggerDTO })
  setConfigModelPolicy(
    @Param('id') id: number,
    @Body() body: { policy?: any; purpose?: string; entities?: any[] },
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    // Nếu body có "policy" key thì dùng luôn, nếu không thì wrap toàn bộ body thành policy
    const policy = body?.policy || (body?.purpose || body?.entities ? body : {})
    return this.geminiConfigService.updateConfigModelPolicy(
      { id: Number(id), policy, updatedById: userId },
      lang
    )
  }

  @Patch('config-models/:id/preset')
  @ApiOperation({
    summary: 'Áp dụng preset tham số model (temperature/topP/topK) vào GeminiConfigModel'
  })
  @ApiParam({ name: 'id', type: Number, required: true })
  @ApiBody({ type: ApplyPresetBodySwaggerDTO })
  applyPreset(
    @Param('id') id: number,
    @Body() body: { presetKey: string },
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.geminiConfigService.applyPresetToConfigModel(
      { id: Number(id), presetKey: body?.presetKey, updatedById: userId },
      lang
    )
  }

  @Delete('config-models/:id')
  @ApiOperation({ summary: 'Xoá mềm Gemini Config Model' })
  @ApiParam({
    name: 'id',
    type: Number,
    required: true,
    description: 'ID của GeminiConfigModel'
  })
  deleteConfigModel(
    @Param('id') id: number,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.geminiConfigService.deleteConfigModel(
      { id: Number(id), deletedById: userId },
      lang
    )
  }

  // Base GeminiConfig endpoints (dynamic path placed AFTER static routes)
  @Get('promt/:geminiConfigId')
  @ApiOperation({ summary: 'Chi tiết Gemini Config theo ID' })
  @ApiParam({
    name: 'geminiConfigId',
    type: Number,
    required: true,
    description: 'ID của GeminiConfig',
    example: 1
  })
  @ZodSerializerDto(GetGeminiConfigResDTO)
  findById(@Param() params: GetParamsGeminiConfigDTO, @I18nLang() lang: string) {
    return this.geminiConfigService.findById(params.geminiConfigId, lang)
  }

  @Post('promt')
  @ZodSerializerDto(CreateGeminiConfigResDTO)
  @ApiBody({ type: CreateGeminiConfigSwaggerDTO })
  create(
    @Body() body: CreateGeminiConfigBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.geminiConfigService.create(
      {
        data: body,
        createdById: userId
      },
      lang
    )
  }

  @Put('promt/:geminiConfigId')
  @ZodSerializerDto(UpdateGeminiConfigResDTO)
  @ApiParam({
    name: 'geminiConfigId',
    type: Number,
    required: true,
    description: 'ID của GeminiConfig',
    example: 1
  })
  @ApiBody({ type: UpdateGeminiConfigSwaggerDTO })
  update(
    @Body() body: UpdateGeminiConfigBodyDTO,
    @Param() params: GetParamsGeminiConfigDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.geminiConfigService.update(
      {
        data: body,
        id: params.geminiConfigId,
        updatedById: userId
      },
      lang
    )
  }

  @Delete('promt/:geminiConfigId')
  @ZodSerializerDto(MessageResDTO)
  @ApiParam({
    name: 'geminiConfigId',
    type: Number,
    required: true,
    description: 'ID của GeminiConfig',
    example: 1
  })
  delete(
    @Param() params: GetParamsGeminiConfigDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.geminiConfigService.delete(
      {
        id: params.geminiConfigId,
        deletedById: userId
      },
      lang
    )
  }
}
