import { HttpException, HttpStatus } from '@nestjs/common'
import { TEST_SET_QUESTIONBANK_MESSAGE } from '@/common/constants/message'

export const TestSetQuestionBankNotFoundException = new HttpException(
  {
    statusCode: HttpStatus.NOT_FOUND,
    message: TEST_SET_QUESTIONBANK_MESSAGE.NOT_FOUND,
    error: 'TESTSET_QUESTIONBANK_NOT_FOUND'
  },
  HttpStatus.NOT_FOUND
)

export const TestSetQuestionBankAlreadyExistsException = new HttpException(
  {
    statusCode: HttpStatus.CONFLICT,
    message: TEST_SET_QUESTIONBANK_MESSAGE.ALREADY_EXISTS,
    error: 'TESTSET_QUESTIONBANK_ALREADY_EXISTS'
  },
  HttpStatus.CONFLICT
)

export const InvalidTestSetQuestionBankDataException = new HttpException(
  {
    statusCode: HttpStatus.BAD_REQUEST,
    message: TEST_SET_QUESTIONBANK_MESSAGE.INVALID_DATA,
    error: 'INVALID_TESTSET_QUESTIONBANK_DATA'
  },
  HttpStatus.BAD_REQUEST
)

export const TestSetQuestionBankTypeIncompatibleException = new HttpException(
  {
    statusCode: HttpStatus.BAD_REQUEST,
    message: TEST_SET_QUESTIONBANK_MESSAGE.TYPE_INCOMPATIBLE,
    error: 'TESTSET_QUESTIONBANK_TYPE_INCOMPATIBLE'
  },
  HttpStatus.BAD_REQUEST
)

export const TestSetNotFoundException = new HttpException(
  {
    statusCode: HttpStatus.NOT_FOUND,
    message: 'Không tìm thấy TestSet',
    error: 'TESTSET_NOT_FOUND'
  },
  HttpStatus.NOT_FOUND
)

export const QuestionBankNotFoundException = new HttpException(
  {
    statusCode: HttpStatus.NOT_FOUND,
    message: 'Không tìm thấy QuestionBank',
    error: 'QUESTIONBANK_NOT_FOUND'
  },
  HttpStatus.NOT_FOUND
)
