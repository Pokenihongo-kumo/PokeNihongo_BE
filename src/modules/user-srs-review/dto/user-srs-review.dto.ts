import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class SrsReviewSwaggerDTO {
  @ApiProperty() id: number
  @ApiProperty() userId: number
  @ApiProperty({ enum: ['VOCABULARY', 'GRAMMAR', 'KANJI', 'TEST', 'EXERCISE'] })
  contentType: string
  @ApiProperty() contentId: number
  @ApiPropertyOptional() message?: string
  @ApiProperty() srsLevel: number
  @ApiProperty() nextReviewDate: Date
  @ApiProperty() incorrectStreak: number
  @ApiProperty() isLeech: boolean
  @ApiProperty() createdAt: Date
  @ApiProperty() updatedAt: Date
}

export class ListSrsQuerySwaggerDTO {
  @ApiPropertyOptional({ enum: ['VOCABULARY', 'GRAMMAR', 'KANJI', 'TEST', 'EXERCISE'] })
  type?: string
  @ApiPropertyOptional({ type: Boolean }) dueOnly?: boolean
}

export class ListSrsTodayQuerySwaggerDTO {
  @ApiPropertyOptional({ type: Number, minimum: 1, default: 1 }) currentPage?: number
  @ApiPropertyOptional({ type: Number, minimum: 1, maximum: 200, default: 20 })
  pageSize?: number
}

export class UpsertSrsReviewSwaggerDTO {
  @ApiProperty({ enum: ['VOCABULARY', 'GRAMMAR', 'KANJI', 'TEST', 'EXERCISE'] })
  contentType!: string
  @ApiProperty() contentId!: number
  @ApiPropertyOptional() message?: string
}

export class ReviewActionSwaggerDTO {
  @ApiProperty({ enum: ['correct', 'incorrect'] }) result!: 'correct' | 'incorrect'
  @ApiPropertyOptional() message?: string
}
