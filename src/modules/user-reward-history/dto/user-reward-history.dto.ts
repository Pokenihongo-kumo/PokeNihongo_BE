import { ApiProperty } from '@nestjs/swagger'

export class RewardInfoSwaggerDTO {
  @ApiProperty({ example: 1, description: 'ID của reward' })
  id: number

  @ApiProperty({
    example: 'Đăng nhập hàng ngày',
    description: 'Tên reward đã được dịch theo ngôn ngữ từ header (Accept-Language)',
    required: false
  })
  name?: string | null

  @ApiProperty({ example: 'LESSON', description: 'Loại reward' })
  rewardType: string

  @ApiProperty({ example: 50, description: 'Giá trị reward' })
  rewardItem: number

  @ApiProperty({
    example: 'EXP',
    description: 'Reward target',
    enum: ['EXP', 'POKEMON', 'POKE_COINS', 'SPARKLES']
  })
  rewardTarget: string
}

export class UserRewardHistorySwaggerDTO {
  @ApiProperty({ example: 1, description: 'ID của lịch sử nhận thưởng' })
  id: number

  @ApiProperty({ example: 1, description: 'ID của user' })
  userId: number

  @ApiProperty({ example: 10, description: 'ID của reward', required: false })
  rewardId?: number | null

  @ApiProperty({
    example: 'EXP',
    description: 'Reward target snapshot',
    enum: ['EXP', 'POKEMON', 'POKE_COINS', 'SPARKLES'],
    required: false
  })
  rewardTargetSnapshot?: string | null

  @ApiProperty({ example: 100, description: 'Số lượng thưởng', required: false })
  amount?: number | null

  @ApiProperty({
    example: 'DAILY_REQUEST',
    description: 'Nguồn thưởng',
    enum: [
      'REWARD_SERVICE',
      'LESSON',
      'EXERCISE',
      'DAILY_REQUEST',
      'ATTENDANCE',
      'SEASON_REWARD',
      'ADMIN_ADJUST',
      'OTHER',
      'ACHIEVEMENT_REWARD'
    ]
  })
  sourceType: string

  @ApiProperty({
    example: 5,
    description: 'ID nguồn thưởng (vd dailyRequestId)',
    required: false
  })
  sourceId?: number | null

  @ApiProperty({
    example: 'Hoàn thành daily nhiệm vụ',
    description: 'Ghi chú',
    required: false
  })
  note?: string | null

  @ApiProperty({
    example: { streakLength: 7 },
    description: 'Dữ liệu bổ sung (JSON)',
    required: false,
    type: Object
  })
  meta?: Record<string, any> | null

  @ApiProperty({
    example: '2025-01-01T00:00:00.000Z',
    description: 'Thời gian nhận thưởng'
  })
  createdAt: Date

  @ApiProperty({ type: RewardInfoSwaggerDTO, required: false })
  reward?: RewardInfoSwaggerDTO
}

export class CreateUserRewardHistorySwaggerDTO {
  @ApiProperty({ example: 1, description: 'ID người dùng' })
  userId: number

  @ApiProperty({ example: 10, description: 'ID reward', required: false })
  rewardId?: number

  @ApiProperty({
    example: 'EXP',
    description: 'Reward target snapshot',
    enum: ['EXP', 'POKEMON', 'POKE_COINS', 'SPARKLES'],
    required: false
  })
  rewardTargetSnapshot?: string

  @ApiProperty({ example: 50, description: 'Số lượng thưởng', required: false })
  amount?: number

  @ApiProperty({
    example: 'DAILY_REQUEST',
    description: 'Nguồn thưởng',
    enum: [
      'REWARD_SERVICE',
      'LESSON',
      'EXERCISE',
      'DAILY_REQUEST',
      'ATTENDANCE',
      'SEASON_REWARD',
      'ADMIN_ADJUST',
      'OTHER',
      'ACHIEVEMENT_REWARD'
    ]
  })
  sourceType: string

  @ApiProperty({ example: 3, description: 'ID nguồn thưởng', required: false })
  sourceId?: number

  @ApiProperty({
    example: 'Thưởng hoàn thành streak 7 ngày',
    description: 'Ghi chú',
    required: false
  })
  note?: string

  @ApiProperty({
    example: { streakLength: 7 },
    description: 'Dữ liệu bổ sung (JSON)',
    required: false,
    type: Object
  })
  meta?: Record<string, any>
}

export class UpdateUserRewardHistorySwaggerDTO {
  @ApiProperty({ example: 10, description: 'ID reward', required: false })
  rewardId?: number

  @ApiProperty({
    example: 'EXP',
    description: 'Reward target snapshot',
    enum: ['EXP', 'POKEMON', 'POKE_COINS', 'SPARKLES'],
    required: false
  })
  rewardTargetSnapshot?: string

  @ApiProperty({ example: 75, description: 'Số lượng thưởng', required: false })
  amount?: number | null

  @ApiProperty({
    example: 'REWARD_SERVICE',
    description: 'Nguồn thưởng',
    enum: [
      'REWARD_SERVICE',
      'LESSON',
      'EXERCISE',
      'DAILY_REQUEST',
      'ATTENDANCE',
      'SEASON_REWARD',
      'ADMIN_ADJUST',
      'OTHER',
      'ACHIEVEMENT_REWARD'
    ],
    required: false
  })
  sourceType?: string

  @ApiProperty({ example: 5, description: 'ID nguồn thưởng', required: false })
  sourceId?: number | null

  @ApiProperty({
    example: 'Điều chỉnh lại số lượng',
    description: 'Ghi chú',
    required: false
  })
  note?: string | null

  @ApiProperty({
    example: { adjustment: true },
    description: 'Dữ liệu bổ sung (JSON)',
    required: false,
    type: Object
  })
  meta?: Record<string, any> | null
}

export class UserRewardHistoryResponseSwaggerDTO {
  @ApiProperty({
    type: UserRewardHistorySwaggerDTO,
    description: 'Thông tin lịch sử nhận thưởng'
  })
  data: UserRewardHistorySwaggerDTO

  @ApiProperty({
    example: 'Lấy lịch sử nhận thưởng thành công',
    description: 'Thông báo'
  })
  message: string
}

export class UserRewardHistoryListResponseSwaggerDTO {
  @ApiProperty({ example: 200, description: 'Mã trạng thái' })
  statusCode: number

  @ApiProperty({
    description: 'Danh sách lịch sử nhận thưởng',
    properties: {
      results: {
        type: 'array',
        items: { $ref: '#/components/schemas/UserRewardHistorySwaggerDTO' }
      },
      pagination: {
        type: 'object',
        properties: {
          current: { type: 'number', example: 1 },
          pageSize: { type: 'number', example: 10 },
          totalPage: { type: 'number', example: 5 },
          totalItem: { type: 'number', example: 50 }
        }
      }
    }
  })
  data: {
    results: UserRewardHistorySwaggerDTO[]
    pagination: {
      current: number
      pageSize: number
      totalPage: number
      totalItem: number
    }
  }

  @ApiProperty({
    example: 'Lấy danh sách lịch sử nhận thưởng thành công',
    description: 'Thông báo'
  })
  message: string
}

export class GetUserRewardHistoryListQuerySwaggerDTO {
  @ApiProperty({ example: 1, description: 'Trang hiện tại', required: false })
  currentPage?: number

  @ApiProperty({ example: 10, description: 'Số bản ghi mỗi trang', required: false })
  pageSize?: number

  @ApiProperty({ example: 1, description: 'ID người dùng', required: false })
  userId?: number

  @ApiProperty({ example: 10, description: 'ID reward', required: false })
  rewardId?: number

  @ApiProperty({
    example: 'DAILY_REQUEST',
    description: 'Nguồn thưởng',
    enum: [
      'REWARD_SERVICE',
      'LESSON',
      'EXERCISE',
      'DAILY_REQUEST',
      'ATTENDANCE',
      'SEASON_REWARD',
      'ADMIN_ADJUST',
      'OTHER',
      'ACHIEVEMENT_REWARD'
    ],
    required: false
  })
  sourceType?: string

  @ApiProperty({
    example: 'EXP',
    description: 'Reward target snapshot',
    enum: ['EXP', 'POKEMON', 'POKE_COINS', 'SPARKLES'],
    required: false
  })
  rewardTargetSnapshot?: string

  @ApiProperty({
    example: '2025-01-01',
    description: 'Ngày bắt đầu (ISO string)',
    required: false
  })
  dateFrom?: string

  @ApiProperty({
    example: '2025-01-31',
    description: 'Ngày kết thúc (ISO string)',
    required: false
  })
  dateTo?: string
}

export class GetMyRewardHistoryQuerySwaggerDTO {
  @ApiProperty({ example: 1, description: 'Trang hiện tại', required: false })
  currentPage?: number

  @ApiProperty({ example: 10, description: 'Số bản ghi mỗi trang', required: false })
  pageSize?: number

  @ApiProperty({
    example: 'DAILY_REQUEST',
    description: 'Nguồn thưởng',
    enum: [
      'REWARD_SERVICE',
      'LESSON',
      'EXERCISE',
      'DAILY_REQUEST',
      'ATTENDANCE',
      'SEASON_REWARD',
      'ADMIN_ADJUST',
      'OTHER',
      'ACHIEVEMENT_REWARD'
    ],
    required: false
  })
  sourceType?: string

  @ApiProperty({
    example: 'EXP',
    description: 'Reward target snapshot',
    enum: ['EXP', 'POKEMON', 'POKE_COINS', 'SPARKLES'],
    required: false
  })
  rewardTargetSnapshot?: string

  @ApiProperty({
    example: '2025-01-01',
    description: 'Ngày bắt đầu (ISO string)',
    required: false
  })
  dateFrom?: string

  @ApiProperty({
    example: '2025-01-31',
    description: 'Ngày kết thúc (ISO string)',
    required: false
  })
  dateTo?: string
}
