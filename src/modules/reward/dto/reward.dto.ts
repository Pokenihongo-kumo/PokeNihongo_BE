import { ApiProperty } from '@nestjs/swagger'
import { UserRewardSourceType } from '@prisma/client'

export class ConvertRewardsSwaggerDTO {
  @ApiProperty({
    type: [Number],
    example: [1, 2, 3],
    description: 'Danh sách rewardId cần quy đổi'
  })
  rewardIds: number[]
  @ApiProperty({
    example: 'REWARD_SERVICE',
    description: 'Nguồn thưởng',
    enum: [
      'REWARD_SERVICE',
      'LESSON',
      'DAILY_REQUEST',
      'ATTENDANCE',
      'SEASON_REWARD',
      'ADMIN_ADJUST',
      'OTHER'
    ],
    required: false
  })
  sourceType?: UserRewardSourceType
}

export class ConvertRewardsDataSwaggerDTO {
  @ApiProperty({
    required: false,
    nullable: true,
    description: 'Kết quả cộng EXP',
    type: Object
  })
  exp?: any

  @ApiProperty({
    required: false,
    nullable: true,
    description: 'Kết quả cộng poke coins',
    type: Object
  })
  pokeCoins?: any

  @ApiProperty({
    required: false,
    nullable: true,
    description: 'Kết quả cộng sparkles',
    type: Object
  })
  sparkles?: any

  @ApiProperty({
    type: [Object],
    description: 'Danh sách xử lý pokemon reward',
    required: false
  })
  pokemons?: any[]
}

export class ConvertRewardsResponseSwaggerDTO {
  @ApiProperty({ example: 200, description: 'HTTP status code' })
  statusCode: number

  @ApiProperty({ type: ConvertRewardsDataSwaggerDTO })
  data: ConvertRewardsDataSwaggerDTO

  @ApiProperty({ example: 'Convert rewards successfully', description: 'Thông báo' })
  message: string
}
