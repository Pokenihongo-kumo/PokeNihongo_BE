import { I18nService } from '@/i18n/i18n.service'
import { KanjiMessage as M } from '@/i18n/message-keys'
import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { UploadedFile, UseInterceptors } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ApiConsumes } from '@nestjs/swagger'
import {
  GetKanjiByIdParamsDTO,
  GetKanjiListQueryDTO,
  KanjiResDTO,
  KanjiListResDTO,
  KanjiManagementListResDTO
} from './dto/zod/kanji.zod-dto'
import { KanjiWithMeaningsResponseSwaggerDTO } from './dto/kanji-with-meanings.dto'
import {
  CreateKanjiWithMeaningsBodyDTO,
  KanjiWithMeaningsResDTO
} from './dto/zod/kanji-with-meanings.zod-dto'
import {
  UpdateKanjiWithMeaningsSwaggerDTO,
  UpdateKanjiWithMeaningsResponseSwaggerDTO
} from './dto/update-kanji-with-meanings.dto'
import {
  UpdateKanjiWithMeaningsBodyDTO,
  UpdateKanjiWithMeaningsResDTO
} from './dto/zod/update-kanji.zod-dto'
import {
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
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'
import { KanjiService } from './kanji.service'

@ApiTags('Kanji')
@Controller('kanji')
@ApiBearerAuth()
export class KanjiController {
  constructor(
    private readonly kanjiService: KanjiService,
    private readonly i18nService: I18nService
  ) {}

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
  async findAll(@Query() query: GetKanjiListQueryDTO, @I18nLang() lang: string) {
    return {
      message: this.i18nService.translate(M.GET_LIST_SUCCESS, lang),
      data: await this.kanjiService.findMany(query)
    }
  }

  @Get('management')
  @ApiOperation({
    summary: 'Lấy danh sách Kanji cho quản lý',
    description:
      'Lấy danh sách Kanji được format phù hợp cho giao diện quản lý (có tách riêng Onyomi và Kunyomi)'
  })
  @ApiQuery({ type: GetKanjiListQuerySwaggerDTO })
  @ZodSerializerDto(KanjiManagementListResDTO)
  async getKanjiManagementList(
    @Query() query: GetKanjiListQueryDTO,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(M.GET_MANAGEMENT_LIST_SUCCESS, lang),
      data: await this.kanjiService.getKanjiManagementList(query)
    }
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
  async findByCharacter(@Param('character') character: string, @I18nLang() lang: string) {
    return {
      message: this.i18nService.translate(M.GET_SUCCESS, lang),
      data: await this.kanjiService.findByCharacter(character)
    }
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
  async findById(@Param() params: GetKanjiByIdParamsDTO, @I18nLang() lang: string) {
    return {
      message: this.i18nService.translate(M.GET_SUCCESS, lang),
      data: await this.kanjiService.findById(params.id)
    }
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
  async createWithMeanings(
    @Body() body: CreateKanjiWithMeaningsBodyDTO,
    @I18nLang() lang: string,
    @UploadedFile() image?: Express.Multer.File
  ) {
    return {
      message: this.i18nService.translate(M.CREATE_SUCCESS, lang),
      data: await this.kanjiService.createWithMeanings(body, image)
    }
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
  async updateWithMeanings(
    @Param('identifier') identifier: string,
    @Body() body: UpdateKanjiWithMeaningsBodyDTO,
    @I18nLang() lang: string,
    @UploadedFile() image?: Express.Multer.File
  ) {
    return {
      message: this.i18nService.translate(M.UPDATE_SUCCESS, lang),
      data: await this.kanjiService.updateWithMeanings(identifier, body, image)
    }
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
    const data = await this.kanjiService.deleteAllKanjiData()
    // always Vietnamese, as before
    return {
      message: this.i18nService.translate(M.DELETE_ALL_SUCCESS, 'vi', {
        kanji: data.kanjiDeleted,
        readings: data.readingDeleted,
        translations: data.translationDeleted
      }),
      data
    }
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
  async delete(@Param() params: GetKanjiByIdParamsDTO, @I18nLang() lang: string) {
    await this.kanjiService.delete(params.id)
    return { message: this.i18nService.translate(M.DELETE_SUCCESS, lang) }
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
    const { data } = await this.kanjiService.importFromXlsx(
      file,
      language || 'vi',
      userId
    )
    // always Vietnamese, as before
    return {
      message: this.i18nService.translate(M.IMPORT_XLSX_SUCCESS, 'vi', {
        created: data.created.length,
        updated: data.updated.length,
        skipped: data.skipped.length
      }),
      data
    }
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
    const { data } = await this.kanjiService.importFromTxt(file, language || 'en')
    // always Vietnamese, as before
    return {
      message: this.i18nService.translate(M.IMPORT_TXT_SUCCESS, 'vi', {
        language: data.language,
        created: data.created.length,
        updated: data.updated.length,
        skipped: data.skipped.length
      }),
      data
    }
  }
}
