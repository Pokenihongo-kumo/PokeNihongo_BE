import { ResponseMessage } from '@/i18n/response-message'
import { FlashcardMessage } from '@/i18n/message-keys'
import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'
import { MessageResDTO, PaginationResponseDTO } from '@/shared/dtos/response.dto'
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
import {
  CreateFlashcardCardSwaggerDTO,
  CreateFlashcardDeckSwaggerDTO,
  DeleteFlashcardCardsBodySwaggerDTO,
  FlashcardImportCardsBodySwaggerDTO,
  FlashcardReadBodySwaggerDTO,
  FlashcardReviewActionSwaggerDTO,
  FlashcardReviewQuerySwaggerDTO,
  GetFlashcardCardListQuerySwaggerDTO,
  GetFlashcardDeckListQuerySwaggerDTO,
  UpdateFlashcardCardSwaggerDTO,
  UpdateFlashcardDeckSwaggerDTO
} from './dto/flashcard.dto'
import {
  CreateFlashcardCardBody,
  CreateFlashcardCardBodyDTO,
  CreateFlashcardDeckBody,
  CreateFlashcardDeckBodyDTO,
  DeleteFlashcardCardsBodyDTO,
  FlashcardDeckParamsDTO,
  FlashcardReadBodyDTO,
  FlashcardReviewActionBody,
  FlashcardReviewActionBodyDTO,
  FlashcardReviewQuery,
  FlashcardReviewQueryDTO,
  GetFlashcardCardListQuery,
  GetFlashcardCardListQueryDTO,
  GetFlashcardDeckListQueryDTO,
  ImportFlashcardCardsBody,
  ImportFlashcardCardsBodyDTO,
  UpdateFlashcardCardBody,
  UpdateFlashcardCardBodyDTO,
  UpdateFlashcardDeckBody,
  UpdateFlashcardDeckBodyDTO
} from './dto/flashcard.zod-dto'
import { FlashcardService } from './flashcard.service'

@ApiTags('Flashcards')
@ApiBearerAuth()
@Controller('flashcards')
export class FlashcardController {
  constructor(private readonly flashcardService: FlashcardService) {}

  @Post('decks')
  @ApiOperation({ summary: 'Tạo bộ flashcard mới' })
  @ApiResponse({ status: 201, type: MessageResDTO })
  @ApiBody({ type: CreateFlashcardDeckSwaggerDTO })
  @ZodSerializerDto(MessageResDTO)
  @ResponseMessage(FlashcardMessage.CREATE_DECK_SUCCESS)
  async createDeck(
    @Body() body: CreateFlashcardDeckBodyDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.flashcardService.createDeck(userId, body as CreateFlashcardDeckBody)
  }

  @Put('decks/cards')
  @ApiOperation({ summary: 'Cập nhật thông tin thẻ flashcard' })
  @ApiResponse({ status: 200, type: MessageResDTO })
  @ApiBody({ type: UpdateFlashcardCardSwaggerDTO })
  @ZodSerializerDto(MessageResDTO)
  @ResponseMessage(FlashcardMessage.UPDATE_CARD_SUCCESS)
  async updateCard(
    @Body() body: UpdateFlashcardCardBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.flashcardService.updateCard(
      body.deckId,
      body.cardId,
      userId,
      body as UpdateFlashcardCardBody,
      lang
    )
  }

  @Put('read')
  @ApiOperation({ summary: 'Đánh dấu đã đọc thẻ flashcard' })
  @ApiResponse({ status: 200, type: MessageResDTO })
  @ApiBody({ type: FlashcardReadBodySwaggerDTO })
  @ZodSerializerDto(MessageResDTO)
  @ResponseMessage(FlashcardMessage.UPDATE_CARD_SUCCESS)
  async markRead(
    @Body() body: FlashcardReadBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.flashcardService.markRead(
      body.deckId,
      body.cardId,
      body.read,
      userId,
      lang
    )
  }

  @Get('decks')
  @ApiOperation({ summary: 'Lấy danh sách bộ flashcard của người dùng' })
  @ApiResponse({ status: 200, type: PaginationResponseDTO })
  @ApiQuery({ type: GetFlashcardDeckListQuerySwaggerDTO })
  @ZodSerializerDto(PaginationResponseDTO)
  @ResponseMessage(FlashcardMessage.GET_DECK_LIST_SUCCESS)
  async getDecks(
    @Query() query: GetFlashcardDeckListQueryDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.flashcardService.getDecks(userId, query)
  }

  @Get('decks/:deckId')
  @ApiOperation({ summary: 'Lấy chi tiết bộ flashcard (kèm danh sách thẻ)' })
  @ApiResponse({ status: 200, type: MessageResDTO })
  @ZodSerializerDto(MessageResDTO)
  @ResponseMessage(FlashcardMessage.GET_DECK_SUCCESS)
  async getDeckById(
    @Param() { deckId }: FlashcardDeckParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.flashcardService.getDeckById(deckId, userId, lang)
  }

  @Get('decks/:deckId/export')
  @ApiOperation({ summary: 'Xuất dữ liệu bộ flashcard (phục vụ offline cache)' })
  @ApiResponse({ status: 200, type: MessageResDTO })
  @ZodSerializerDto(MessageResDTO)
  @ResponseMessage(FlashcardMessage.EXPORT_DECK_SUCCESS)
  async exportDeck(
    @Param() params: FlashcardDeckParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.flashcardService.exportDeck(params.deckId, userId, lang)
  }

  @Put('decks/:deckId')
  @ApiOperation({ summary: 'Cập nhật thông tin bộ flashcard' })
  @ApiResponse({ status: 200, type: MessageResDTO })
  @ApiBody({ type: UpdateFlashcardDeckSwaggerDTO })
  @ZodSerializerDto(MessageResDTO)
  @ResponseMessage(FlashcardMessage.UPDATE_DECK_SUCCESS)
  async updateDeck(
    @Param() { deckId }: FlashcardDeckParamsDTO,
    @Body() body: UpdateFlashcardDeckBodyDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.flashcardService.updateDeck(
      deckId,
      userId,
      body as UpdateFlashcardDeckBody
    )
  }

  @Delete('decks/cards')
  @ApiOperation({ summary: 'Xóa cứng nhiều thẻ flashcard' })
  @ApiBody({ type: DeleteFlashcardCardsBodySwaggerDTO })
  @ApiResponse({ status: 200, type: MessageResDTO })
  @ZodSerializerDto(MessageResDTO)
  @ResponseMessage(FlashcardMessage.DELETE_CARD_SUCCESS)
  async deleteCards(
    @Body() body: DeleteFlashcardCardsBodyDTO,
    @ActiveUser('userId') userId: number
  ) {
    await this.flashcardService.deleteCards(body.deckId, body.cardIds, userId)
  }

  // The app's delete deck (src/services/flashcard deleteDeck): soft delete
  @Delete('decks/:deckId')
  @ApiOperation({ summary: 'Xóa bộ flashcard' })
  @ApiResponse({ status: 200, type: MessageResDTO })
  @ZodSerializerDto(MessageResDTO)
  @ResponseMessage(FlashcardMessage.DELETE_DECK_SUCCESS)
  async deleteDeck(
    @Param() { deckId }: FlashcardDeckParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    await this.flashcardService.deleteDeck(deckId, userId)
  }

  @Get('decks/:deckId/cards')
  @ApiOperation({ summary: 'Lấy danh sách thẻ trong bộ flashcard' })
  @ApiResponse({ status: 200, type: PaginationResponseDTO })
  @ApiQuery({ type: GetFlashcardCardListQuerySwaggerDTO })
  @ZodSerializerDto(PaginationResponseDTO)
  @ResponseMessage(FlashcardMessage.GET_DECK_SUCCESS)
  async getDeckCards(
    @Param() { deckId }: FlashcardDeckParamsDTO,
    @Query() query: GetFlashcardCardListQueryDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.flashcardService.getDeckCards(
      deckId,
      userId,
      query as GetFlashcardCardListQuery,
      lang
    )
  }

  @Post('decks/:deckId/cards')
  @ApiOperation({ summary: 'Thêm một thẻ mới vào bộ flashcard' })
  @ApiResponse({ status: 201, type: MessageResDTO })
  @ApiBody({ type: CreateFlashcardCardSwaggerDTO })
  @ZodSerializerDto(MessageResDTO)
  @ResponseMessage(FlashcardMessage.CREATE_CARD_SUCCESS)
  async createCard(
    @Param() { deckId }: FlashcardDeckParamsDTO,
    @Body() body: CreateFlashcardCardBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.flashcardService.createCard(
      deckId,
      userId,
      body as CreateFlashcardCardBody,
      lang
    )
  }

  @Post('decks/:deckId/cards/import')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Import nhiều thẻ từ Vocabulary/Kanji/Grammar vào bộ flashcard'
  })
  @ApiResponse({ status: 200, type: MessageResDTO })
  @ApiBody({ type: FlashcardImportCardsBodySwaggerDTO })
  @ZodSerializerDto(MessageResDTO)
  @ResponseMessage(FlashcardMessage.IMPORT_CARD_SUCCESS)
  async importCards(
    @Param() params: FlashcardDeckParamsDTO,
    @Body() body: ImportFlashcardCardsBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.flashcardService.importCards(
      params.deckId,
      userId,
      body as ImportFlashcardCardsBody,
      lang
    )
  }

  @Get('decks/:deckId/review')
  @ApiOperation({ summary: 'Lấy danh sách thẻ đến hạn ôn tập (SRS)' })
  @ApiResponse({ status: 200, type: PaginationResponseDTO })
  @ApiQuery({ type: FlashcardReviewQuerySwaggerDTO })
  @ZodSerializerDto(PaginationResponseDTO)
  @ResponseMessage(FlashcardMessage.GET_REVIEW_LIST_SUCCESS)
  async getReviewCards(
    @Param() params: FlashcardDeckParamsDTO,
    @Query() query: FlashcardReviewQueryDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.flashcardService.getReviewCards(
      params.deckId,
      userId,
      query as FlashcardReviewQuery,
      lang
    )
  }

  @Post('review')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Ghi nhận kết quả ôn tập của một thẻ flashcard' })
  @ApiResponse({ status: 200, type: MessageResDTO })
  @ApiBody({ type: FlashcardReviewActionSwaggerDTO })
  @ZodSerializerDto(MessageResDTO)
  @ResponseMessage(FlashcardMessage.REVIEW_CARD_SUCCESS)
  async reviewCard(
    @Body() body: FlashcardReviewActionBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.flashcardService.reviewCard(
      body.deckId,
      body.cardId,
      userId,
      body as FlashcardReviewActionBody,
      lang
    )
  }
}
