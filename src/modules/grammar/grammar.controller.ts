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
import { GrammarService } from './grammar.service'
import {
  CreateGrammarBodyDTO,
  UpdateGrammarBodyDTO,
  CreateGrammarBasicBodyDTO,
  GetGrammarByIdParamsDTO,
  GetGrammarListQueryDTO
} from './dto/grammar.zod-dto'
import {
  GrammarResponseSwaggerDTO,
  GrammarListResponseSwaggerDTO,
  CreateGrammarSwaggerDTO,
  UpdateGrammarSwaggerDTO,
  GetGrammarListQuerySwaggerDTO
} from './dto/grammar.dto'
import { MessageResDTO } from '@/shared/dtos/response.dto'
import { GrammarResponseDTO, GrammarListResponseDTO } from './dto/grammar.response.dto'

@ApiTags('Grammar')
@Controller('grammars')
@UseGuards(AuthenticationGuard)
@ApiBearerAuth()
export class GrammarController {
  constructor(private readonly grammarService: GrammarService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Tạo ngữ pháp mới với usage và translations' })
  @ApiResponse({
    status: 201,
    description: 'Tạo ngữ pháp thành công',
    type: GrammarResponseSwaggerDTO
  })
  @ApiBody({ type: CreateGrammarSwaggerDTO })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 409, description: 'Ngữ pháp đã tồn tại' })
  @ZodSerializerDto(GrammarResponseDTO)
  async createGrammar(@Body() body: CreateGrammarBodyDTO) {
    return await this.grammarService.createGrammar(body)
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách ngữ pháp với phân trang và tìm kiếm' })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách ngữ pháp thành công',
    type: GrammarListResponseSwaggerDTO
  })
  @ApiQuery({ type: GetGrammarListQuerySwaggerDTO })
  async getGrammarList(@Query() query: GetGrammarListQueryDTO) {
    return await this.grammarService.getGrammarList(query)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin ngữ pháp theo ID' })
  @ApiResponse({
    status: 200,
    description: 'Lấy thông tin ngữ pháp thành công',
    type: GrammarResponseSwaggerDTO
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy ngữ pháp' })
  async getGrammarById(@Param('id') id: string) {
    return await this.grammarService.getGrammarById(Number(id))
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật ngữ pháp' })
  @ApiBody({ type: UpdateGrammarSwaggerDTO })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật ngữ pháp thành công',
    type: GrammarResponseSwaggerDTO
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy ngữ pháp' })
  @ApiResponse({ status: 409, description: 'Cấu trúc ngữ pháp đã tồn tại' })
  async updateGrammar(
    @Param() params: GetGrammarByIdParamsDTO,
    @Body() body: UpdateGrammarBodyDTO
  ) {
    return await this.grammarService.updateGrammar(params.id, body)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xóa ngữ pháp' })
  @ApiResponse({ status: 204, description: 'Xóa ngữ pháp thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy ngữ pháp' })
  @ZodSerializerDto(MessageResDTO)
  async deleteGrammar(@Param() params: GetGrammarByIdParamsDTO) {
    return await this.grammarService.deleteGrammar(params.id)
  }
}
