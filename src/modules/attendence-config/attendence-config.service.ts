import { I18nService } from '@/i18n/i18n.service'
import { AttendenceConfigMessage } from '@/i18n/message-keys'
import { NotFoundRecordException } from '@/shared/error'
import { PaginationQuery } from '@/shared/models/request.model'
import {
  isNotFoundPrismaError,
  isUniqueConstraintPrismaError
} from '@/shared/utils/prisma-errors'
import { HttpStatus, Injectable } from '@nestjs/common'
import { AttendenceConfigRepo } from './attendence-config.repo'
import { AttendenceConfigAlreadyExistsException } from './dto/attendence-config.error'
import {
  CreateAttendanceConfigBody,
  UpdateAttendanceConfigBody
} from './dto/attendence-config.zod-dto'

@Injectable()
export class AttendenceConfigService {
  constructor(
    private readonly attendenceConfigRepo: AttendenceConfigRepo,
    private readonly i18nService: I18nService
  ) {}

  async list(pagination: PaginationQuery, lang: string = 'vi') {
    const data = await this.attendenceConfigRepo.list(pagination)
    return {
      statusCode: HttpStatus.OK,
      data,
      message: this.i18nService.translate(AttendenceConfigMessage.GET_LIST_SUCCESS, lang)
    }
  }

  async findById(id: number, lang: string = 'vi') {
    const attendenceConfig = await this.attendenceConfigRepo.findById(id)
    if (!attendenceConfig) {
      throw new NotFoundRecordException()
    }
    return {
      statusCode: HttpStatus.OK,
      data: attendenceConfig,
      message: this.i18nService.translate(AttendenceConfigMessage.GET_SUCCESS, lang)
    }
  }

  async create(
    {
      data,
      createdById
    }: {
      data: CreateAttendanceConfigBody
      createdById: number
    },
    lang: string = 'vi'
  ) {
    try {
      const attendenceConfig = await this.attendenceConfigRepo.create({
        createdById,
        data
      })
      return {
        statusCode: HttpStatus.CREATED,
        data: attendenceConfig,
        message: this.i18nService.translate(AttendenceConfigMessage.CREATE_SUCCESS, lang)
      }
    } catch (error) {
      if (isUniqueConstraintPrismaError(error)) {
        throw new AttendenceConfigAlreadyExistsException()
      }
      throw error
    }
  }

  async update(
    {
      id,
      data,
      updatedById
    }: {
      id: number
      data: UpdateAttendanceConfigBody
      updatedById: number
    },
    lang: string = 'vi'
  ) {
    try {
      const updatedAttendenceConfig = await this.attendenceConfigRepo.update({
        id,
        updatedById,
        data
      })
      return {
        statusCode: HttpStatus.OK,
        data: updatedAttendenceConfig,
        message: this.i18nService.translate(AttendenceConfigMessage.UPDATE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      if (isUniqueConstraintPrismaError(error)) {
        throw new AttendenceConfigAlreadyExistsException()
      }
      throw error
    }
  }

  async delete(
    { id, deletedById }: { id: number; deletedById: number },
    lang: string = 'vi'
  ) {
    try {
      await this.attendenceConfigRepo.delete({
        id,
        deletedById
      })
      return {
        statusCode: HttpStatus.OK,
        data: null,
        message: this.i18nService.translate(AttendenceConfigMessage.DELETE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }

  // ---- For other modules (module-boundary plan B8) ----
  // Same arguments and results as the repo methods.

  findByDateOfWeek(...args: Parameters<AttendenceConfigRepo['findByDateOfWeek']>) {
    return this.attendenceConfigRepo.findByDateOfWeek(...args)
  }
}
