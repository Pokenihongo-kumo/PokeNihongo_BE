import { HttpException, HttpStatus } from '@nestjs/common'
import { VOCABULARY_MESSAGE } from '@/common/constants/message'

export const KanjiNotFoundException = new HttpException(
  {
    statusCode: HttpStatus.NOT_FOUND,
    message: 'Kanji không tồn tại',
    error: 'KANJI_NOT_FOUND'
  },
  HttpStatus.NOT_FOUND
)

export const KanjiAlreadyExistsException = new HttpException(
  {
    statusCode: HttpStatus.CONFLICT,
    message: 'Kanji đã tồn tại',
    error: 'KANJI_ALREADY_EXISTS'
  },
  HttpStatus.CONFLICT
)

export const InvalidKanjiDataException = new HttpException(
  {
    statusCode: HttpStatus.BAD_REQUEST,
    message: 'Dữ liệu Kanji không hợp lệ',
    error: 'INVALID_KANJI_DATA'
  },
  HttpStatus.BAD_REQUEST
)

export const KanjiCharacterInvalidException = new HttpException(
  {
    statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
    message:
      'Phải là một ký tự Kanji (Hán tự) duy nhất. Không chấp nhận ký tự Latin hoặc số',
    error: 'KANJI_CHARACTER_INVALID'
  },
  HttpStatus.UNPROCESSABLE_ENTITY
)

export const MeaningAlreadyExistsException = new HttpException(
  {
    statusCode: HttpStatus.CONFLICT,
    message: VOCABULARY_MESSAGE.MEANING_ALREADY_EXISTS,
    error: 'MEANING_ALREADY_EXISTS'
  },
  HttpStatus.CONFLICT
)
