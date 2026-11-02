import { HttpException, HttpStatus } from '@nestjs/common'
import { VOCABULARY_MESSAGE } from '@/common/constants/message'

export const VocabularyNotFoundException = new HttpException(
  {
    statusCode: HttpStatus.NOT_FOUND,
    message: VOCABULARY_MESSAGE.NOT_FOUND,
    error: 'VOCABULARY_NOT_FOUND'
  },
  HttpStatus.NOT_FOUND
)

export const VocabularyAlreadyExistsException = new HttpException(
  {
    statusCode: HttpStatus.CONFLICT,
    message: VOCABULARY_MESSAGE.ALREADY_EXISTS,
    error: 'VOCABULARY_ALREADY_EXISTS'
  },
  HttpStatus.CONFLICT
)

export const InvalidVocabularyDataException = new HttpException(
  {
    statusCode: HttpStatus.BAD_REQUEST,
    message: VOCABULARY_MESSAGE.INVALID_DATA,
    error: 'INVALID_VOCABULARY_DATA'
  },
  HttpStatus.BAD_REQUEST
)

export const MeaningAlreadyExistsException = new HttpException(
  {
    statusCode: HttpStatus.CONFLICT,
    message: VOCABULARY_MESSAGE.MEANING_ALREADY_EXISTS,
    error: 'MEANING_ALREADY_EXISTS'
  },
  HttpStatus.CONFLICT
)

export const VocabularyJapaneseTextInvalidException = new HttpException(
  {
    statusCode: HttpStatus.BAD_REQUEST,
    message: 'Từ vựng phải là tiếng Nhật thuần (Hiragana/Katakana/Kanji)',
    error: 'INVALID_JAPANESE_TEXT'
  },
  HttpStatus.BAD_REQUEST
)
