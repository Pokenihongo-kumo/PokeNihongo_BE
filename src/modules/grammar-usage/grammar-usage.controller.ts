import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags
} from '@nestjs/swagger'
import { ZodSerializerDto } from 'nestjs-zod'
import { AuthenticationGuard } from '@/common/guards/authentication.guard'
import { UseGuards } from '@nestjs/common'
import { GrammarUsageService } from './grammar-usage.service'
import {
  CreateGrammarUsageBodyDTO,
  UpdateGrammarUsageBodyDTO,
  GetGrammarUsageByIdParamsDTO,
  GetGrammarUsageListQueryDTO
} from './dto/grammar-usage.zod-dto'
import {
  GrammarUsageResponseSwaggerDTO,
  GrammarUsageWithGrammarResponseSwaggerDTO,
  GrammarUsageListResponseSwaggerDTO,
  CreateGrammarUsageSwaggerDTO,
  UpdateGrammarUsageSwaggerDTO,
  GetGrammarUsageListQuerySwaggerDTO
} from './dto/grammar-usage.dto'
import { MessageResDTO } from '@/shared/dtos/response.dto'
import {
  GrammarUsageWithGrammarResponseDTO,
  GrammarUsageListResponseDTO
} from './dto/grammar-usage.response.dto'

@ApiTags('Grammar Usage')
@Controller('grammar-usages')
@UseGuards(AuthenticationGuard)
@ApiBearerAuth()
export class GrammarUsageController {
  constructor(private readonly grammarUsageService: GrammarUsageService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Tạo cách sử dụng ngữ pháp mới' })
  @ApiBody({ type: CreateGrammarUsageSwaggerDTO })
  @ApiResponse({
    status: 201,
    description: 'Tạo cách sử dụng ngữ pháp thành công',
    type: GrammarUsageWithGrammarResponseSwaggerDTO
  })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy ngữ pháp' })
  @ApiResponse({ status: 409, description: 'Cách sử dụng ngữ pháp đã tồn tại' })
  @ZodSerializerDto(GrammarUsageWithGrammarResponseDTO)
  async createGrammarUsage(@Body() body: CreateGrammarUsageBodyDTO) {
    return await this.grammarUsageService.createGrammarUsage(body)
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách cách sử dụng ngữ pháp' })
  @ApiQuery({ type: GetGrammarUsageListQuerySwaggerDTO })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách cách sử dụng ngữ pháp thành công',
    type: GrammarUsageListResponseSwaggerDTO
  })
  @ZodSerializerDto(GrammarUsageListResponseDTO)
  async getGrammarUsageList(@Query() query: GetGrammarUsageListQueryDTO) {
    return await this.grammarUsageService.getGrammarUsageList(query)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin cách sử dụng ngữ pháp theo ID' })
  @ApiResponse({
    status: 200,
    description: 'Lấy thông tin cách sử dụng ngữ pháp thành công',
    type: GrammarUsageWithGrammarResponseSwaggerDTO
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy cách sử dụng ngữ pháp' })
  @ZodSerializerDto(GrammarUsageWithGrammarResponseDTO)
  async getGrammarUsageById(@Param() params: GetGrammarUsageByIdParamsDTO) {
    return await this.grammarUsageService.getGrammarUsageById(params)
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật cách sử dụng ngữ pháp' })
  @ApiBody({ type: UpdateGrammarUsageSwaggerDTO })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật cách sử dụng ngữ pháp thành công',
    type: GrammarUsageWithGrammarResponseSwaggerDTO
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy cách sử dụng ngữ pháp' })
  @ApiResponse({ status: 409, description: 'Cách sử dụng ngữ pháp đã tồn tại' })
  @ZodSerializerDto(GrammarUsageWithGrammarResponseDTO)
  async updateGrammarUsage(
    @Param() params: GetGrammarUsageByIdParamsDTO,
    @Body() body: UpdateGrammarUsageBodyDTO
  ) {
    return await this.grammarUsageService.updateGrammarUsage(params.id, body)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xóa cách sử dụng ngữ pháp' })
  @ApiResponse({ status: 204, description: 'Xóa cách sử dụng ngữ pháp thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy cách sử dụng ngữ pháp' })
  @ZodSerializerDto(MessageResDTO)
  async deleteGrammarUsage(@Param() params: GetGrammarUsageByIdParamsDTO) {
    return await this.grammarUsageService.deleteGrammarUsage(params.id)
  }
}
