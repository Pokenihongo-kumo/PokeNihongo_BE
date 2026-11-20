import { ApiPropertyOptional } from '@nestjs/swagger'

export class PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Trang hiện tại', default: 1, minimum: 1 })
  currentPage?: number

  @ApiPropertyOptional({ description: 'Số bản ghi trên trang', default: 15, minimum: 1 })
  pageSize?: number

  @ApiPropertyOptional({ description: 'Từ khóa tìm kiếm' })
  qs?: string
}
