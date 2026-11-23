import { createZodDto } from 'nestjs-zod'
import { PaginationQuerySchema } from '@/shared/models/request.model'

export class PaginationQueryDTO extends createZodDto(PaginationQuerySchema) {}
