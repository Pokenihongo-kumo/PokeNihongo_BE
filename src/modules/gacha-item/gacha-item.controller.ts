import { ResponseMessage } from '@/i18n/response-message'
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
  constructor(private readonly gachaItemService: GachaItemService) {}

  @Get()
  @ZodSerializerDto(PaginationResponseDTO)
  @ResponseMessage(GachaItemMessage.GET_LIST_SUCCESS)
  async list(@Query() query: PaginationQueryDTO) {
    return this.gachaItemService.list(query)
  }

  @Get('prepare-pokemons/:gachaBannerId')
  @ZodSerializerDto(PaginationResponseDTO)
  @ResponseMessage(GachaItemMessage.GET_LIST_SUCCESS)
  async getListPokemonWithGachaBannerId(
    @Param('gachaBannerId', ParseIntPipe) gachaBannerId: number,
    @Query() query: PaginationQueryDTO,
    @I18nLang() lang: string
  ) {
    return this.gachaItemService.getListPokemonWithGachaBannerId({
      bannerId: gachaBannerId,
      query,
      lang
    })
  }

  @Get('gacha-banner/:gachaBannerId')
  @ZodSerializerDto(PaginationResponseDTO)
  @ResponseMessage(GachaItemMessage.GET_LIST_SUCCESS)
  async getListItemsByBannerId(
    @Param('gachaBannerId', ParseIntPipe) gachaBannerId: number,
    @Query() query: PaginationQueryDTO,
    @I18nLang() lang: string
  ) {
    return this.gachaItemService.getListItemsByBannerId({
      bannerId: gachaBannerId,
      query,
      lang
    })
  }

  @Post('random')
  @HttpCode(HttpStatus.OK)
  @ZodSerializerDto(GetRandomGachaItemsResDTO)
  @ResponseMessage(GachaItemMessage.GET_LIST_SUCCESS)
  async getRandomListItem(@Body() body: GetRamdomAmountGachaItemsBodyDTO) {
    return this.gachaItemService.getRandomListItem(body)
  }

  @Get(':gachaItemId')
  @ZodSerializerDto(GetGachaItemDetailResDTO)
  @ResponseMessage(GachaItemMessage.GET_DETAIL_SUCCESS)
  async findById(@Param() params: GetGachaItemParamsDTO) {
    return this.gachaItemService.findById(params.gachaItemId)
  }

  @Post('list')
  @HttpCode(HttpStatus.OK)
  @ZodSerializerDto(CreateWithListItemResDTO)
  @ResponseMessage(GachaItemMessage.CREATE_SUCCESS)
  async createByList(
    @Body() body: CreateWithListItemBodyDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.gachaItemService.createByList(userId, body)
  }

  @Put('list')
  @ZodSerializerDto(UpdateWithListItemResDTO)
  @ResponseMessage(GachaItemMessage.UPDATE_SUCCESS)
  async updateByList(
    @Body() body: UpdateWithListItemBodyDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.gachaItemService.updateByList(userId, body)
  }

  @Delete(':gachaItemId')
  @ZodSerializerDto(MessageResDTO)
  @ResponseMessage(GachaItemMessage.DELETE_SUCCESS)
  async delete(@Param() params: GetGachaItemParamsDTO) {
    await this.gachaItemService.delete(params.gachaItemId)
  }
}
