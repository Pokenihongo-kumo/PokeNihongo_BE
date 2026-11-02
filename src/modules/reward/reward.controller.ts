import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { IsPublic } from '@/common/decorators/auth.decorator'
import { AuthenticationGuard } from '@/common/guards/authentication.guard'
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'
import { PaginationQueryDTO } from '@/shared/dtos/request.dto'
import { MessageResDTO } from '@/shared/dtos/response.dto'
import { PaginationResponseSchema } from '@/shared/models/response.model'
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards
} from '@nestjs/common'
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger'
import { ZodSerializerDto } from 'nestjs-zod'
import {
  CreatedRewardBodyInputDTO,
  CreateRewardResDTO,
  GetRewardDetailResDTO,
  GetRewardDetailWithAllLangResDTO,
  GetRewardParamsDTO,
  UpdateRewardBodyInputDTO,
  UpdateRewardResDTO
} from './dto/reward.zod-dto'
import { RewardService } from './reward.service'
import { ConvertRewardsBodyDTO, ConvertRewardsResDTO } from './dto/reward.zod-dto'
import {
  ConvertRewardsSwaggerDTO,
  ConvertRewardsDataSwaggerDTO,
  ConvertRewardsResponseSwaggerDTO
} from './dto/reward.dto'
import { UserRewardSourceType } from '@prisma/client'

@Controller('reward')
@UseGuards(AuthenticationGuard)
@ApiBearerAuth()
export class RewardController {
  constructor(private readonly rewardService: RewardService) {}

  @Get()
  @IsPublic()
  @ZodSerializerDto(PaginationResponseSchema)
  list(@Query() query: PaginationQueryDTO, @I18nLang() lang: string) {
    return this.rewardService.list(query, lang)
  }

  @Post('convert')
  @ApiOperation({ summary: 'Quy đổi reward cho user' })
  @ApiBody({
    type: ConvertRewardsSwaggerDTO,
    description:
      'REWARD_SERVICE , LESSON , DAILY_REQUEST, ATTENDANCE, SEASON_REWARD, ADMIN_ADJUST, OTHER'
  })
  @ApiResponse({
    status: 200,
    description: 'Quy đổi thành công',
    type: ConvertRewardsResponseSwaggerDTO
  })
  @ZodSerializerDto(ConvertRewardsResDTO)
  convertRewards(
    @Body() body: ConvertRewardsBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    const targetUserId = body.userId ?? userId
    return this.rewardService.convertRewards({
      rewardIds: body.rewardIds,
      userId,
      sourceType: body.sourceType ?? UserRewardSourceType.REWARD_SERVICE,
      lang
    })
  }

  @Get('admin')
  @IsPublic()
  @ZodSerializerDto(PaginationResponseSchema)
  getListWithAllLang(@Query() query: PaginationQueryDTO, @I18nLang() lang: string) {
    return this.rewardService.getListWithAllLang(query, lang)
  }

  @Post()
  @ZodSerializerDto(CreateRewardResDTO)
  create(
    @Body() body: CreatedRewardBodyInputDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.rewardService.create(
      {
        data: body,
        createdById: userId
      },
      lang
    )
  }

  @Get('admin/:rewardId')
  @IsPublic()
  @ZodSerializerDto(GetRewardDetailWithAllLangResDTO)
  findByIdWithAllLang(@Param() params: GetRewardParamsDTO, @I18nLang() lang: string) {
    return this.rewardService.findByIdWithAllLang(params.rewardId, lang)
  }

  @Get(':rewardId')
  @IsPublic()
  @ZodSerializerDto(GetRewardDetailResDTO)
  findById(@Param() params: GetRewardParamsDTO, @I18nLang() lang: string) {
    return this.rewardService.findById(params.rewardId, lang)
  }

  @Put(':rewardId')
  @ZodSerializerDto(UpdateRewardResDTO)
  update(
    @Body() body: UpdateRewardBodyInputDTO,
    @Param() params: GetRewardParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.rewardService.update(
      {
        data: body,
        id: params.rewardId,
        updatedById: userId
      },
      lang
    )
  }

  @Delete(':rewardId')
  @ZodSerializerDto(MessageResDTO)
  delete(
    @Param() params: GetRewardParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.rewardService.delete(
      {
        id: params.rewardId,
        deletedById: userId
      },
      lang
    )
  }
}
