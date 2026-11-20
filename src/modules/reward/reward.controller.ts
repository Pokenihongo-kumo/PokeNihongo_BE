import { ResponseMessage } from '@/i18n/response-message'
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
  constructor(private readonly rewardService: RewardService) {}

  @Get()
  @IsPublic()
  @ZodSerializerDto(PaginationResponseSchema)
  @ResponseMessage(RewardMessage.GET_LIST_SUCCESS)
  async list(@Query() query: PaginationQueryDTO, @I18nLang() lang: string) {
    return this.rewardService.list(query, lang)
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
  @ResponseMessage(RewardMessage.CONVERT_SUCCESS)
  async convertRewards(
    @Body() body: ConvertRewardsBodyDTO,
    @ActiveUser('userId') userId: number
  ) {
    const targetUserId = body.userId ?? userId
    return this.rewardService.convertRewards({
      rewardIds: body.rewardIds,
      userId,
      sourceType: body.sourceType ?? UserRewardSourceType.REWARD_SERVICE
    })
  }

  @Get('admin')
  @IsPublic()
  @ZodSerializerDto(PaginationResponseSchema)
  @ResponseMessage(RewardMessage.GET_LIST_SUCCESS)
  async getListWithAllLang(@Query() query: PaginationQueryDTO, @I18nLang() lang: string) {
    return this.rewardService.getListWithAllLang(query, lang)
  }

  @Post()
  @ZodSerializerDto(CreateRewardResDTO)
  @ResponseMessage(RewardMessage.CREATE_SUCCESS)
  async create(
    @Body() body: CreatedRewardBodyInputDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.rewardService.create({
      data: body,
      createdById: userId
    })
  }

  @Get('admin/:rewardId')
  @IsPublic()
  @ZodSerializerDto(GetRewardDetailWithAllLangResDTO)
  @ResponseMessage(RewardMessage.GET_SUCCESS)
  async findByIdWithAllLang(
    @Param() params: GetRewardParamsDTO,
    @I18nLang() lang: string
  ) {
    return this.rewardService.findByIdWithAllLang(params.rewardId, lang)
  }

  @Get(':rewardId')
  @IsPublic()
  @ZodSerializerDto(GetRewardDetailResDTO)
  @ResponseMessage(RewardMessage.GET_SUCCESS)
  async findById(@Param() params: GetRewardParamsDTO, @I18nLang() lang: string) {
    return this.rewardService.findById(params.rewardId, lang)
  }

  @Put(':rewardId')
  @ZodSerializerDto(UpdateRewardResDTO)
  @ResponseMessage(RewardMessage.UPDATE_SUCCESS)
  async update(
    @Body() body: UpdateRewardBodyInputDTO,
    @Param() params: GetRewardParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.rewardService.update({
      data: body,
      id: params.rewardId,
      updatedById: userId
    })
  }

  @Delete(':rewardId')
  @ZodSerializerDto(MessageResDTO)
  @ResponseMessage(RewardMessage.DELETE_SUCCESS)
  async delete(
    @Param() params: GetRewardParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    await this.rewardService.delete({
      id: params.rewardId,
      deletedById: userId
    })
  }
}
