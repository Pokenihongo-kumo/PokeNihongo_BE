import { ResponseMessage } from '@/i18n/response-message'
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
  constructor(private readonly matchQueueService: MatchQueueService) {}

  @Post()
  @ZodSerializerDto(CreateMatchQueueResDTO)
  @ResponseMessage(MatchQueueMessage.CREATE_SUCCESS)
  async create(@ActiveUser('userId') userId: number, @I18nLang() lang: string) {
    return this.matchQueueService.create(
      {
        createdById: userId
      },
      lang
    )
  }

  @Delete('user')
  @ZodSerializerDto(MessageResDTO)
  @ResponseMessage(MatchQueueMessage.DELETE_SUCCESS)
  async delete(@ActiveUser('userId') userId: number) {
    await this.matchQueueService.delete({
      deletedById: userId
    })
  }
}
