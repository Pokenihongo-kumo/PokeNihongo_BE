import { BullAction, BullQueue } from '@/common/constants/bull-action.constant'
import { Process, Processor } from '@nestjs/bull'
import { Job } from 'bull'
import { UserRepo } from './user.repo'

@Processor(BullQueue.USER_DELETION)
export class SharedUserDeletionProcessor {
  constructor(private readonly userRepo: UserRepo) {}

  @Process(BullAction.DELETE_INACTIVE_USER)
  async handleDeletion(job: Job<{ userId: number }>): Promise<void> {
    const { userId } = job.data
    await this.userRepo.deleteIfStillInactive(userId)
  }
}
