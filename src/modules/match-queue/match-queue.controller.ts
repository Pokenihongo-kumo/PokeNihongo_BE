import { I18nService } from '@/i18n/i18n.service'
import { MatchQueueMessage } from '@/i18n/message-keys'
import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'
import { MessageResDTO } from '@/shared/dtos/response.dto'
import { Controller, Delete, Post } from '@nestjs/common'
import { ZodSerializerDto } from 'nestjs-zod'
import { CreateMatchQueueResDTO } from './dto/match-queue.zod-dto'
import { MatchQueueService } from './match-queue.service'

@Controller('match-queue')
export class MatchQueueController {
  constructor(
    private readonly matchQueueService: MatchQueueService,
    private readonly i18nService: I18nService
  ) {}

  @Post()
  @ZodSerializerDto(CreateMatchQueueResDTO)
  async create(@ActiveUser('userId') userId: number, @I18nLang() lang: string) {
    return {
      message: this.i18nService.translate(MatchQueueMessage.CREATE_SUCCESS, lang),
      data: await this.matchQueueService.create(
        {
          createdById: userId
        },
        lang
      )
    }
  }

  @Delete('user')
  @ZodSerializerDto(MessageResDTO)
  async delete(@ActiveUser('userId') userId: number, @I18nLang() lang: string) {
    await this.matchQueueService.delete({
      deletedById: userId
    })
    return {
      message: this.i18nService.translate(MatchQueueMessage.DELETE_SUCCESS, lang),
      data: null
    }
  }
}
