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
  constructor(private readonly attendenceConfigRepo: AttendenceConfigRepo) {}

  async list(pagination: PaginationQuery) {
    const data = await this.attendenceConfigRepo.list(pagination)
    return data
  }

  async findById(id: number) {
    const attendenceConfig = await this.attendenceConfigRepo.findById(id)
    if (!attendenceConfig) {
      throw new NotFoundRecordException()
    }
    return attendenceConfig
  }

  async create({
    data,
    createdById
  }: {
    data: CreateAttendanceConfigBody
    createdById: number
  }) {
    try {
      const attendenceConfig = await this.attendenceConfigRepo.create({
        createdById,
        data
      })
      return attendenceConfig
    } catch (error) {
      if (isUniqueConstraintPrismaError(error)) {
        throw new AttendenceConfigAlreadyExistsException()
      }
      throw error
    }
  }

  async update({
    id,
    data,
    updatedById
  }: {
    id: number
    data: UpdateAttendanceConfigBody
    updatedById: number
  }) {
    try {
      const updatedAttendenceConfig = await this.attendenceConfigRepo.update({
        id,
        updatedById,
        data
      })
      return updatedAttendenceConfig
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

  async delete({ id, deletedById }: { id: number; deletedById: number }) {
    try {
      await this.attendenceConfigRepo.delete({
        id,
        deletedById
      })
      return
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
