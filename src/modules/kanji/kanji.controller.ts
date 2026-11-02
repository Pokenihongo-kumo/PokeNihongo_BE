import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { UploadedFile, UseInterceptors } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ApiConsumes } from '@nestjs/swagger'
import {
  CreateKanjiBodyDTO,
  UpdateKanjiBodyDTO,
  GetKanjiByIdParamsDTO,
  GetKanjiListQueryDTO,
  KanjiResponseDTO,
  KanjiListResponseDTO,
  KanjiResDTO,
  KanjiListResDTO,
  KanjiManagementListResDTO
} from './dto/zod/kanji.zod-dto'
import {
  CreateKanjiWithMeaningsSwaggerDTO,
  KanjiWithMeaningsResponseSwaggerDTO
} from './dto/kanji-with-meanings.dto'
import {
  CreateKanjiWithMeaningsBodyDTO,
  KanjiWithMeaningsResDTO
} from './dto/zod/kanji-with-meanings.zod-dto'
import {
  UpdateKanjiWithMeaningsBodyType,
  UpdateKanjiWithMeaningsResponseType,
  UpdateKanjiWithMeaningsSwaggerDTO,
  UpdateKanjiWithMeaningsResponseSwaggerDTO
} from './dto/update-kanji-with-meanings.dto'
import {
  UpdateKanjiWithMeaningsBodyDTO,
  UpdateKanjiWithMeaningsResDTO
} from './dto/zod/update-kanji.zod-dto'
import {
  CreateKanjiSwaggerDTO,
  UpdateKanjiSwaggerDTO,
  KanjiSwaggerResponseDTO,
  KanjiListSwaggerResponseDTO,
  GetKanjiListQuerySwaggerDTO,
  ImportKanjiSwaggerDTO
} from './dto/kanji.dto'
import { MessageResDTO } from '@/shared/dtos/response.dto'
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
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags
} from '@nestjs/swagger'
import { ZodSerializerDto } from 'nestjs-zod'
import { KanjiService } from './kanji.service'

@ApiTags('Kanji')
@Controller('kanji')
@ApiBearerAuth()
export class KanjiController {
  constructor(private readonly kanjiService: KanjiService) {}

  @Get()
  @ApiOperation({
    summary: 'Lấy danh sách Kanji với phân trang và tìm kiếm',
    description: 'Lấy danh sách tất cả Kanji với phân trang và tìm kiếm'
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách Kanji thành công',
    type: KanjiListSwaggerResponseDTO
  })
  @ApiQuery({ type: GetKanjiListQuerySwaggerDTO })
  @ZodSerializerDto(KanjiListResDTO)
  findAll(@Query() query: GetKanjiListQueryDTO) {
    return this.kanjiService.findMany(query)
  }

  @Get('management')
  @ApiOperation({
    summary: 'Lấy danh sách Kanji cho quản lý',
    description:
      'Lấy danh sách Kanji được format phù hợp cho giao diện quản lý (có tách riêng Onyomi và Kunyomi)'
  })
  @ApiQuery({ type: GetKanjiListQuerySwaggerDTO })
  @ZodSerializerDto(KanjiManagementListResDTO)
  getKanjiManagementList(@Query() query: GetKanjiListQueryDTO) {
    return this.kanjiService.getKanjiManagementList(query)
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Lấy thống kê Kanji',
    description: 'Lấy thống kê tổng quan về Kanji'
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy thống kê thành công'
  })
  getStats() {
    return this.kanjiService.getStats()
  }

  @Get('character/:character')
  @ApiOperation({
    summary: 'Lấy Kanji theo ký tự',
    description: 'Lấy thông tin Kanji theo ký tự cụ thể'
  })
  @ApiParam({
    name: 'character',
    description: 'Ký tự Kanji',
    example: '日'
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy Kanji thành công',
    type: KanjiSwaggerResponseDTO
  })
  @ZodSerializerDto(KanjiResDTO)
  findByCharacter(@Param('character') character: string) {
    return this.kanjiService.findByCharacter(character)
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Lấy Kanji theo ID',
    description: 'Lấy thông tin chi tiết của một Kanji'
  })
  @ApiParam({
    name: 'id',
    description: 'ID của Kanji',
    example: 1
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy Kanji thành công',
    type: KanjiSwaggerResponseDTO
  })
  @ZodSerializerDto(KanjiResDTO)
  findById(@Param() params: GetKanjiByIdParamsDTO) {
    return this.kanjiService.findById(params.id)
  }

  @Post('with-meanings')
  @UseInterceptors(FileInterceptor('image'))
  @ApiOperation({
    summary: 'Tạo Kanji mới cùng với nghĩa và translations',
    description:
      'Tạo một Kanji mới cùng với các nghĩa và translations trong nhiều ngôn ngữ trong một lần gọi API. Có thể upload hình ảnh cùng lúc.'
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        character: { type: 'string', example: '森', description: 'Ký tự Kanji' },
        strokeCount: {
          type: 'string',
          example: '12',
          description: 'Số nét vẽ (có thể là số hoặc string)'
        },
        jlptLevel: { type: 'string', example: '5', description: 'Cấp độ JLPT (1-5)' },
        image: {
          type: 'string',
          format: 'binary',
          description: 'Hình ảnh của Kanji (JPG, PNG, GIF, WebP)'
        },
        readings: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              readingType: { type: 'string', example: 'onyomi' },
              reading: { type: 'string', example: 'しん' }
            }
          },
          description: 'Danh sách cách đọc của Kanji'
        },
        meanings: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              translations: {
                type: 'object',
                example: { vi: 'rừng', en: 'forest' },
                description: 'Translations theo ngôn ngữ (vi, en)'
              }
            }
          },
          description: 'Danh sách nghĩa của Kanji với translations'
        }
      }
    }
  })
  @ApiResponse({
    status: 201,
    description: 'Tạo Kanji cùng với nghĩa thành công',
    type: KanjiWithMeaningsResponseSwaggerDTO
  })
  @ZodSerializerDto(KanjiWithMeaningsResDTO)
  createWithMeanings(
    @Body() body: CreateKanjiWithMeaningsBodyDTO,
    @UploadedFile() image?: Express.Multer.File
  ) {
    return this.kanjiService.createWithMeanings(body, image)
  }

  @Put(':identifier/with-meanings')
  @UseInterceptors(FileInterceptor('image'))
  @ApiOperation({
    summary: 'Cập nhật Kanji cùng với nghĩa và translations',
    description:
      'Cập nhật thông tin Kanji cùng với các nghĩa và translations trong nhiều ngôn ngữ trong một lần gọi API. Có thể sử dụng ID (số) hoặc Character (chữ Kanji) để cập nhập'
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    type: UpdateKanjiWithMeaningsSwaggerDTO,
    description: 'Dữ liệu cập nhật Kanji cùng với danh sách nghĩa và translations'
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật Kanji cùng với nghĩa thành công',
    type: UpdateKanjiWithMeaningsResponseSwaggerDTO
  })
  @ZodSerializerDto(UpdateKanjiWithMeaningsResDTO)
  updateWithMeanings(
    @Param('identifier') identifier: string,
    @Body() body: UpdateKanjiWithMeaningsBodyDTO,
    @UploadedFile() image?: Express.Multer.File
  ) {
    return this.kanjiService.updateWithMeanings(identifier, body, image)
  }

  @Delete('all')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Xóa toàn bộ dữ liệu Kanji và những thứ liên quan',
    description:
      'Xóa tất cả Kanji, cách đọc Kanji, liên kết từ vựng-Kanji, và các bản dịch liên quan. Thao tác này không thể hoàn tác!'
  })
  @ApiResponse({
    status: 200,
    description: 'Xóa toàn bộ dữ liệu Kanji thành công',
    type: MessageResDTO
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Cần đăng nhập'
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Không có quyền thực hiện thao tác này'
  })
  async deleteAllKanjiData() {
    return this.kanjiService.deleteAllKanjiData()
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Xóa Kanji',
    description: 'Xóa một Kanji khỏi hệ thống'
  })
  @ApiParam({
    name: 'id',
    description: 'ID của Kanji',
    example: 1
  })
  @ApiResponse({
    status: 200,
    description: 'Xóa Kanji thành công'
  })
  @HttpCode(HttpStatus.OK)
  delete(@Param() params: GetKanjiByIdParamsDTO) {
    return this.kanjiService.delete(params.id)
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Import Kanji từ file Excel (.xlsx)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: ImportKanjiSwaggerDTO })
  @ApiResponse({ status: 201, description: 'Import Kanji thành công' })
  async importKanji(
    @UploadedFile() file: Express.Multer.File,
    @Body('language') language?: string,
    @ActiveUser('userId') userId?: number
  ) {
    return this.kanjiService.importFromXlsx(file, language || 'vi', userId)
  }

  @Post('import-txt')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Import Kanji từ file TXT (tab-separated)',
    description:
      'Import Kanji từ file TXT với cấu trúc tab-separated: kanji	mean	detail	kun	on	jlpt	strokes. Cập nhật thông tin thiếu cho Kanji đã tồn tại (strokeCount, jlptLevel).'
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: ImportKanjiSwaggerDTO })
  @ApiResponse({
    status: 201,
    description: 'Import Kanji từ TXT thành công'
  })
  async importKanjiFromTxt(
    @UploadedFile() file: Express.Multer.File,
    @Body('language') language?: string
  ) {
    return this.kanjiService.importFromTxt(file, language || 'en')
  }
}
