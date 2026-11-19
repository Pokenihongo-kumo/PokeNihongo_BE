import { I18nService } from '@/i18n/i18n.service'
import { GachaItemMessage } from '@/i18n/message-keys'
import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'
import { PaginationQueryDTO } from '@/shared/dtos/request.dto'
import { MessageResDTO, PaginationResponseDTO } from '@/shared/dtos/response.dto'
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  HttpCode,
  HttpStatus
} from '@nestjs/common'
import { ZodSerializerDto } from 'nestjs-zod'
import {
  CreateWithListItemBodyDTO,
  CreateWithListItemResDTO,
  GetGachaItemDetailResDTO,
  GetGachaItemParamsDTO,
  GetRamdomAmountGachaItemsBodyDTO,
  GetRandomGachaItemsResDTO,
  UpdateWithListItemBodyDTO,
  UpdateWithListItemResDTO
} from './dto/gacha-item.dto'
import { GachaItemService } from './gacha-item.service'

@Controller('gacha-item')
export class GachaItemController {
  constructor(
    private readonly gachaItemService: GachaItemService,
    private readonly i18nService: I18nService
  ) {}

  @Get()
  @ZodSerializerDto(PaginationResponseDTO)
  async list(@Query() query: PaginationQueryDTO, @I18nLang() lang: string) {
    return {
      message: this.i18nService.translate(GachaItemMessage.GET_LIST_SUCCESS, lang),
      data: await this.gachaItemService.list(query)
    }
  }

  @Get('prepare-pokemons/:gachaBannerId')
  @ZodSerializerDto(PaginationResponseDTO)
  async getListPokemonWithGachaBannerId(
    @Param('gachaBannerId', ParseIntPipe) gachaBannerId: number,
    @Query() query: PaginationQueryDTO,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(GachaItemMessage.GET_LIST_SUCCESS, lang),
      data: await this.gachaItemService.getListPokemonWithGachaBannerId({
        bannerId: gachaBannerId,
        query,
        lang
      })
    }
  }

  @Get('gacha-banner/:gachaBannerId')
  @ZodSerializerDto(PaginationResponseDTO)
  async getListItemsByBannerId(
    @Param('gachaBannerId', ParseIntPipe) gachaBannerId: number,
    @Query() query: PaginationQueryDTO,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(GachaItemMessage.GET_LIST_SUCCESS, lang),
      data: await this.gachaItemService.getListItemsByBannerId({
        bannerId: gachaBannerId,
        query,
        lang
      })
    }
  }

  @Post('random')
  @HttpCode(HttpStatus.OK)
  @ZodSerializerDto(GetRandomGachaItemsResDTO)
  async getRandomListItem(
    @Body() body: GetRamdomAmountGachaItemsBodyDTO,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(GachaItemMessage.GET_LIST_SUCCESS, lang),
      data: await this.gachaItemService.getRandomListItem(body)
    }
  }

  @Get(':gachaItemId')
  @ZodSerializerDto(GetGachaItemDetailResDTO)
  async findById(@Param() params: GetGachaItemParamsDTO, @I18nLang() lang: string) {
    return {
      message: this.i18nService.translate(GachaItemMessage.GET_DETAIL_SUCCESS, lang),
      data: await this.gachaItemService.findById(params.gachaItemId)
    }
  }

  @Post('list')
  @HttpCode(HttpStatus.OK)
  @ZodSerializerDto(CreateWithListItemResDTO)
  async createByList(
    @Body() body: CreateWithListItemBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(GachaItemMessage.CREATE_SUCCESS, lang),
      data: await this.gachaItemService.createByList(userId, body)
    }
  }

  @Put('list')
  @ZodSerializerDto(UpdateWithListItemResDTO)
  async updateByList(
    @Body() body: UpdateWithListItemBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(GachaItemMessage.UPDATE_SUCCESS, lang),
      data: await this.gachaItemService.updateByList(userId, body)
    }
  }

  @Delete(':gachaItemId')
  @ZodSerializerDto(MessageResDTO)
  async delete(@Param() params: GetGachaItemParamsDTO, @I18nLang() lang: string) {
    await this.gachaItemService.delete(params.gachaItemId)
    return {
      message: this.i18nService.translate(GachaItemMessage.DELETE_SUCCESS, lang),
      data: null
    }
  }
}
