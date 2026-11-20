import { VocabularyMessage as M } from '@/i18n/message-keys'
import { msg, ResponseMessage } from '@/i18n/response-message'
import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { IsPublic } from '@/common/decorators/auth.decorator'
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'
import {
  CreateVocabularyBodyDTO,
  GetVocabularyByIdParamsDTO,
  GetVocabularyListQueryDTO,
  UpdateVocabularyBodyDTO,
  VocabularyListResDTO,
  VocabularyResDTO,
  VocabularyStatisticsResDTO,
  VocabularySearchQueryDTO,
  VocabularySearchResDTO,
  VocabularyDetailResDTO,
  VocabularySearchHistoryQueryDTO,
  VocabularySearchHistoryResDTO
} from '@/modules/vocabulary/dto/vocabulary.zod-dto'
import { VocabularyNotFoundException } from '@/modules/vocabulary/dto/vocabulary.error'
import {
  VocabularyResponseSwaggerDTO,
  VocabularyListResponseSwaggerDTO,
  GetVocabularyListQuerySwaggerDTO,
  UpdateVocabularyMultipartSwaggerDTO,
  VocabularyStatisticsResponseSwaggerDTO,
  ImportVocabularyXlsxSwaggerDTO,
  ImportVocabularyTxtSwaggerDTO,
  VocabularySearchQuerySwaggerDTO,
  VocabularySearchResponseSwaggerDTO,
  VocabularyDetailResponseSwaggerDTO,
  VocabularySearchHistoryQuerySwaggerDTO,
  VocabularySearchHistoryResponseSwaggerDTO
} from '@/modules/vocabulary/dto/vocabulary.dto'
import {
  AddMeaningToVocabularyDTO,
  AddMeaningSwaggerDTO
} from '@/modules/vocabulary/dto/add-meaning.dto'
import {
  CreateVocabularyFullMultipartDTO,
  CreateVocabularyFullMultipartSwaggerDTO,
  CreateVocabularyFullResponseSwaggerDTO,
  CreateVocabularyFullResponseDTO
} from '@/modules/vocabulary/dto/create-vocabulary-full.dto'
import { MessageResDTO } from '@/shared/dtos/response.dto'
import { VOCABULARY_MESSAGE } from '@/common/constants/message'
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseBoolPipe,
  Post,
  Put,
  Query,
  UploadedFile,
  UploadedFiles,
  UseInterceptors
} from '@nestjs/common'
import {
  FileInterceptor,
  FilesInterceptor,
  FileFieldsInterceptor
} from '@nestjs/platform-express'
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
  ApiConsumes
} from '@nestjs/swagger'
import { ZodSerializerDto } from 'nestjs-zod'
import { CloudinaryMultiMulterConfig } from '@/modules/upload/cloudinary/multer.config'
import { VocabularyImportService } from './vocabulary-import.service'
import { VocabularyService } from './vocabulary.service'

@ApiTags('Vocabulary')
@Controller('vocabulary')
export class VocabularyController {
  constructor(
    private readonly vocabularyService: VocabularyService,
    private readonly vocabularyImport: VocabularyImportService
  ) {}

  @Put('by-word/:wordJp')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'imageUrl', maxCount: 1 },
        { name: 'audioUrl', maxCount: 1 }
      ],
      CloudinaryMultiMulterConfig
    )
  )
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Cập nhật từ vựng theo wordJp với upload files',
    description:
      'Cập nhật từ vựng bằng wordJp. Nếu không upload audioUrl và regenerateAudio=true → Tự động gen audio mới bằng TTS.'
  })
  @ApiConsumes('multipart/form-data')
  @ApiQuery({
    name: 'regenerateAudio',
    required: false,
    type: Boolean,
    description: 'Set true để tự động gen lại audio bằng TTS (nếu không upload audioUrl)'
  })
  @ApiBody({
    type: UpdateVocabularyMultipartSwaggerDTO,
    description: 'Form data với reading, imageUrl và audioUrl (optional)'
  })
  @ZodSerializerDto(VocabularyResDTO)
  @ResponseMessage(M.UPDATE_SUCCESS)
  async updateByWordJp(
    @Param('wordJp') wordJp: string,
    @Body() body: UpdateVocabularyMultipartSwaggerDTO,
    @UploadedFiles()
    files?: { imageUrl?: Express.Multer.File[]; audioUrl?: Express.Multer.File[] },
    // A query value is a string: without the pipe "false" was truthy and every
    // update without an audio file regenerated the audio with TTS
    @Query('regenerateAudio', new ParseBoolPipe({ optional: true }))
    regenerateAudio?: boolean,
    @ActiveUser('userId') userId?: number
  ) {
    const imageFile = files?.imageUrl?.[0]
    const audioFile = files?.audioUrl?.[0]

    // Tìm vocabulary theo wordJp
    const vocabulary = await this.vocabularyService.findByWordJp(wordJp)
    if (!vocabulary) {
      throw new VocabularyNotFoundException()
    }

    const updateData: any = {}
    if (body.wordJp) updateData.wordJp = body.wordJp
    if (body.reading) updateData.reading = body.reading

    return this.vocabularyService.update(
      vocabulary.id,
      updateData,
      imageFile,
      audioFile,
      regenerateAudio
    )
  }

  @Post('import')
  @UseInterceptors(FilesInterceptor('files'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Import từ vựng từ file Excel (.xlsx)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: ImportVocabularyXlsxSwaggerDTO as any })
  @ApiQuery({
    name: 'language',
    required: false,
    description: 'Mã ngôn ngữ cho nghĩa trong file (ví dụ: vi, en)',
    example: 'vi'
  })
  @ApiQuery({
    name: 'updateLevelN',
    required: false,
    description: 'Cho phép cập nhật levelN nếu file có giá trị mới (default: false)',
    example: false,
    type: Boolean
  })
  @ApiQuery({
    name: 'levelN',
    required: false,
    description: 'Áp dụng levelN cho tất cả từ trong file (tạo mới hoặc cập nhật)',
    example: 5,
    type: Number
  })
  @ApiResponse({ status: 201, description: 'Import thành công' })
  async importVocabulary(
    @UploadedFiles() files: Express.Multer.File[],
    @ActiveUser('userId') userId?: number,
    @Query('language') language?: string,
    @Query('updateLevelN') updateLevelN?: string,
    @Query('levelN') levelN?: string
  ) {
    const parsedLevelN =
      levelN !== undefined && levelN !== null && levelN !== ''
        ? Number(levelN)
        : undefined
    const allowUpdateLevelN =
      parsedLevelN !== undefined || updateLevelN === 'true' || updateLevelN === '1'
    const data = await this.vocabularyImport.importFromXlsxFiles(
      files,
      userId,
      language,
      allowUpdateLevelN,
      parsedLevelN
    )
    return {
      message: msg(M.IMPORT_XLSX_SUCCESS, {
        created: data.created.length,
        skipped: data.skipped.length
      }),
      data
    }
  }

  @Post('import-txt')
  @UseInterceptors(FileInterceptor('file'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Import từ vựng từ file TXT (tab-separated)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: ImportVocabularyTxtSwaggerDTO as any })
  @ApiQuery({
    name: 'language',
    required: false,
    description: 'Mã ngôn ngữ cho nghĩa và ví dụ (mặc định: vi)',
    example: 'vi'
  })
  @ApiResponse({ status: 201, description: 'Import TXT thành công' })
  async importVocabularyTxt(
    @UploadedFile() file: Express.Multer.File,
    @ActiveUser('userId') userId?: number,
    @Query('language') language?: string
  ) {
    const data = await this.vocabularyImport.importFromTxt(file, userId, language)
    return {
      message: msg(M.IMPORT_TXT_SUCCESS, {
        created: data.created.length,
        skipped: data.skipped.length
      }),
      data
    }
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy danh sách từ vựng với phân trang và tìm kiếm' })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách từ vựng thành công',
    type: VocabularyListResponseSwaggerDTO
  })
  @ApiQuery({ type: GetVocabularyListQuerySwaggerDTO })
  @ZodSerializerDto(VocabularyListResDTO)
  @ResponseMessage(M.GET_LIST_SUCCESS)
  findAll(@Query() query: GetVocabularyListQueryDTO, @I18nLang() lang: string) {
    return this.vocabularyService.findAll(query, lang)
  }

  @Get('search')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Tìm kiếm từ vựng theo từ khóa',
    description:
      'Tìm kiếm từ vựng và trả về wordJp, reading, meaning (theo ngôn ngữ header). Tự động lưu lịch sử tìm kiếm nếu user đã đăng nhập.'
  })
  @ApiQuery({ type: VocabularySearchQuerySwaggerDTO })
  @ZodSerializerDto(VocabularySearchResDTO)
  @ResponseMessage(M.GET_LIST_SUCCESS)
  search(
    @Query() query: VocabularySearchQueryDTO,
    @I18nLang() lang: string,
    @ActiveUser('userId') userId?: number
  ) {
    return this.vocabularyService.search(
      query.keyword,
      lang,
      query.currentPage,
      query.pageSize,
      userId
    )
  }

  @Get('search/:id')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Lấy thông tin chi tiết từ vựng theo ID (cho search)',
    description:
      'Lấy thông tin chi tiết từ vựng bao gồm: wordJp, reading, audioUrl, imageUrl, wordType, meanings (với translations), và related words (các từ vựng có chứa wordJp này). Tự động lưu lịch sử tìm kiếm nếu user đã đăng nhập.'
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy thông tin từ vựng thành công',
    type: VocabularyDetailResponseSwaggerDTO
  })
  @ZodSerializerDto(VocabularyDetailResDTO)
  @ResponseMessage(M.GET_SUCCESS)
  findOneBySearch(
    @Param() params: GetVocabularyByIdParamsDTO,
    @I18nLang() lang: string,
    @ActiveUser('userId') userId?: number
  ) {
    return this.vocabularyService.findOneDetail(params.id, lang, userId)
  }

  @Get('search-history')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Lấy lịch sử tìm kiếm từ vựng của user',
    description:
      'Lấy danh sách lịch sử tìm kiếm từ vựng của user đã đăng nhập, bao gồm từ khóa tìm kiếm và thông tin từ vựng (nếu có)'
  })
  @ApiQuery({ type: VocabularySearchHistoryQuerySwaggerDTO })
  @ApiResponse({
    status: 200,
    description: 'Lấy lịch sử tìm kiếm thành công',
    type: VocabularySearchHistoryResponseSwaggerDTO
  })
  @ZodSerializerDto(VocabularySearchHistoryResDTO)
  @ResponseMessage(M.GET_LIST_SUCCESS)
  getSearchHistory(
    @Query() query: VocabularySearchHistoryQueryDTO,
    @I18nLang() lang: string,
    @ActiveUser('userId') userId: number
  ) {
    return this.vocabularyService.getSearchHistory(
      userId,
      query.currentPage,
      query.pageSize,
      lang
    )
  }

  @Get('statistics')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy thống kê từ vựng tổng hợp' })
  @ApiResponse({
    status: 200,
    description: 'Lấy thống kê từ vựng thành công',
    type: VocabularyStatisticsResponseSwaggerDTO
  })
  @ZodSerializerDto(VocabularyStatisticsResDTO)
  @ResponseMessage(M.GET_STATS_SUCCESS)
  getStatistics() {
    return this.vocabularyService.getStatistics()
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy thông tin từ vựng theo ID' })
  @ApiResponse({
    status: 200,
    description: 'Lấy thông tin từ vựng thành công',
    type: VocabularyResponseSwaggerDTO
  })
  @ZodSerializerDto(VocabularyResDTO)
  @ResponseMessage(M.GET_SUCCESS)
  findOne(@Param() params: GetVocabularyByIdParamsDTO, @I18nLang() lang: string) {
    return this.vocabularyService.findOne(params.id, lang)
  }

  @Delete(':id')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xóa từ vựng theo ID' })
  @ApiResponse({
    status: 200,
    description: 'Xóa từ vựng thành công',
    type: VocabularyResponseSwaggerDTO
  })
  @ZodSerializerDto(VocabularyResDTO)
  @ResponseMessage(M.DELETE_SUCCESS)
  remove(@Param() params: GetVocabularyByIdParamsDTO) {
    return this.vocabularyService.remove(params.id)
  }

  @Post('add-meaning')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Thêm nghĩa mới cho từ vựng đã tồn tại',
    description: 'Thêm một nghĩa mới (meaning) cho từ vựng đã có trong hệ thống'
  })
  @ApiBody({
    type: AddMeaningSwaggerDTO,
    description: 'Dữ liệu nghĩa mới cần thêm'
  })
  @ApiResponse({
    status: 201,
    description: 'Thêm nghĩa mới thành công'
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy từ vựng'
  })
  @ResponseMessage(M.MEANING_ADDED)
  addMeaning(@Body() body: AddMeaningToVocabularyDTO) {
    const { vocabularyId, ...meaningData } = body
    return this.vocabularyService.addMeaningToExistingVocabulary(
      vocabularyId,
      meaningData
    )
  }

  @Post('full')
  @ApiBearerAuth()
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'audioFile', maxCount: 1 },
      { name: 'imageFile', maxCount: 1 }
    ])
  )
  @ApiOperation({
    summary: 'Tạo từ vựng hoàn chỉnh với translations',
    description:
      'Tạo vocabulary với file upload (audio/image optional). Tự động: gen audio nếu không có → upload files → phát hiện Kanji → tạo meaning → tạo translations. Nếu từ đã tồn tại, chỉ thêm nghĩa mới.'
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    type: CreateVocabularyFullMultipartSwaggerDTO,
    description: 'Form data với audio/image files'
  })
  async createFull(
    @Body() body: CreateVocabularyFullMultipartDTO,
    @UploadedFiles()
    files: { audioFile?: Express.Multer.File[]; imageFile?: Express.Multer.File[] },
    @ActiveUser('userId') userId?: number
  ) {
    const audioFile = files?.audioFile?.[0]
    const imageFile = files?.imageFile?.[0]

    // Convert multipart data to standard format
    const data = {
      word_jp: body.word_jp,
      reading: body.reading,
      level_n: body.level_n,
      word_type_id: body.word_type_id,
      translations: body.translations as any // Already parsed by Zod transform
    }

    const result = await this.vocabularyService.createFullVocabularyWithFiles(
      data,
      audioFile,
      imageFile,
      userId
    )
    // an existing word only gets the new meaning
    return {
      data: result.data,
      message: msg(result.meaningAdded ? M.ADD_MEANING_SUCCESS : M.CREATE_FULL_SUCCESS)
    }
  }

  //#endregion

  //#region Create Multiple Sample Vocabularies
  @Post('create-sample-vocabularies')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Tạo nhiều từ vựng mẫu với dữ liệu mặc định',
    description: 'Tạo một bộ từ vựng tiếng Nhật cơ bản với nghĩa tiếng Việt và tiếng Anh'
  })
  @ApiResponse({
    status: 201,
    description: 'Tạo từ vựng mẫu thành công',
    type: VocabularyListResponseSwaggerDTO
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu không hợp lệ'
  })
  @ZodSerializerDto(VocabularyListResDTO)
  async createSampleVocabularies(@ActiveUser('userId') userId: number | undefined) {
    const { data } = await this.vocabularyImport.createSampleVocabularies(userId)
    return {
      message: msg(M.CREATE_SAMPLE_SUCCESS, { count: data.results.length }),
      data
    }
  }
  //#endregion
}
