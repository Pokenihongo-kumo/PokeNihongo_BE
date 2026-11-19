import { Injectable, Logger } from '@nestjs/common'
import { Queue } from 'bull'

@Injectable()
export class BullQueueService {
  private readonly logger = new Logger(BullQueueService.name)

  async addJob<T>(
    queue: Queue,
    jobName: string,
    data: T,
    options: {
      delay?: number
      attempts?: number
      backoff?: { type: string; delay: number }
      removeOnComplete?: boolean
      removeOnFail?: boolean
    } = {}
  ): Promise<boolean> {
    try {
      if (!(await queue.isReady())) {
        this.logger.warn('Redis queue is not ready, skipping job addition')
        return false
      }
      await queue.add(jobName, data, {
        delay: options.delay,
        attempts: options.attempts || 1,
        backoff: options.backoff,
        removeOnComplete: options.removeOnComplete,
        removeOnFail: options.removeOnFail
      })
      this.logger.log(`Đã thêm tác vụ ${jobName} vào hàng đợi ${queue.name}`)
      return true
    } catch (error) {
      this.logger.error(`Lỗi khi thêm tác vụ ${jobName}: ${error.message}`, error.stack)
      return false
    }
  }
}
