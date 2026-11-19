import { I18nService } from '@/i18n/i18n.service'
import { RewardMessage } from '@/i18n/message-keys'
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
  UseGuards,
  HttpCode,
  HttpStatus
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
  constructor(
    private readonly rewardService: RewardService,
    private readonly i18nService: I18nService
  ) {}

  @Get()
  @IsPublic()
  @ZodSerializerDto(PaginationResponseSchema)
  async list(@Query() query: PaginationQueryDTO, @I18nLang() lang: string) {
    return {
      message: this.i18nService.translate(RewardMessage.GET_LIST_SUCCESS, lang),
      data: await this.rewardService.list(query, lang)
    }
  }

  @Post('convert')
  @HttpCode(HttpStatus.OK)
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
  async convertRewards(
    @Body() body: ConvertRewardsBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    const targetUserId = body.userId ?? userId
    return {
      message: 'Convert rewards successfully',
      data: await this.rewardService.convertRewards({
        rewardIds: body.rewardIds,
        userId,
        sourceType: body.sourceType ?? UserRewardSourceType.REWARD_SERVICE
      })
    }
  }

  @Get('admin')
  @IsPublic()
  @ZodSerializerDto(PaginationResponseSchema)
  async getListWithAllLang(@Query() query: PaginationQueryDTO, @I18nLang() lang: string) {
    return {
      message: this.i18nService.translate(RewardMessage.GET_LIST_SUCCESS, lang),
      data: await this.rewardService.getListWithAllLang(query, lang)
    }
  }

  @Post()
  @ZodSerializerDto(CreateRewardResDTO)
  async create(
    @Body() body: CreatedRewardBodyInputDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(RewardMessage.CREATE_SUCCESS, lang),
      data: await this.rewardService.create({
        data: body,
        createdById: userId
      })
    }
  }

  @Get('admin/:rewardId')
  @IsPublic()
  @ZodSerializerDto(GetRewardDetailWithAllLangResDTO)
  async findByIdWithAllLang(
    @Param() params: GetRewardParamsDTO,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(RewardMessage.GET_SUCCESS, lang),
      data: await this.rewardService.findByIdWithAllLang(params.rewardId, lang)
    }
  }

  @Get(':rewardId')
  @IsPublic()
  @ZodSerializerDto(GetRewardDetailResDTO)
  async findById(@Param() params: GetRewardParamsDTO, @I18nLang() lang: string) {
    return {
      message: this.i18nService.translate(RewardMessage.GET_SUCCESS, lang),
      data: await this.rewardService.findById(params.rewardId, lang)
    }
  }

  @Put(':rewardId')
  @ZodSerializerDto(UpdateRewardResDTO)
  async update(
    @Body() body: UpdateRewardBodyInputDTO,
    @Param() params: GetRewardParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(RewardMessage.UPDATE_SUCCESS, lang),
      data: await this.rewardService.update({
        data: body,
        id: params.rewardId,
        updatedById: userId
      })
    }
  }

  @Delete(':rewardId')
  @ZodSerializerDto(MessageResDTO)
  async delete(
    @Param() params: GetRewardParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    await this.rewardService.delete({
      id: params.rewardId,
      deletedById: userId
    })
    return {
      message: this.i18nService.translate(RewardMessage.DELETE_SUCCESS, lang),
      data: null
    }
  }
}
