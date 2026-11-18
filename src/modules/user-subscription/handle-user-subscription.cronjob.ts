import { MailService } from '@/3rdService/mail/mail.service'
import { addTimeUTC } from '@/shared/helpers'
import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { UserSubscriptionRepo } from './user-subscription.repo'

@Injectable()
export class HandleUserSubscriptionCronjob {
  private readonly logger = new Logger(HandleUserSubscriptionCronjob.name)

  constructor(
    private readonly userSubscriptionRepo: UserSubscriptionRepo,
    private readonly mailService: MailService
  ) {}

  // Run every hour at minute 0 (e.g., 01:00, 02:00, 03:00, etc.)
  @Cron(CronExpression.EVERY_HOUR, { timeZone: 'UTC' })
  async handleExpiredSubscriptions() {
    const now = addTimeUTC(new Date(), 0)
    this.logger.log(`[UserSubscription Cron] Running at ${now.toISOString()}`)

    try {
      // Find all ACTIVE subscriptions that have expired
      const expiredSubscriptions = await this.userSubscriptionRepo.findExpiredActive(now)

      if (expiredSubscriptions.length === 0) {
        this.logger.log('[UserSubscription Cron] No expired subscriptions found')
        return
      }

      this.logger.log(
        `[UserSubscription Cron] Found ${expiredSubscriptions.length} expired subscription(s), updating to CANCELED`
      )

      // Update all expired subscriptions to CANCELED status
      const updateResult = await this.userSubscriptionRepo.cancelByIds(
        expiredSubscriptions.map((s) => s.id)
      )

      this.logger.log(
        `[UserSubscription Cron] Successfully canceled ${updateResult.count} subscription(s): ${expiredSubscriptions.map((s) => `userId=${s.userId}, id=${s.id}, expiresAt=${s.expiresAt?.toISOString()}`).join(' | ')}`
      )
    } catch (error) {
      this.logger.error(
        '[UserSubscription Cron] Error processing expired subscriptions:',
        error
      )
      throw error
    }
  }

  // Run every day at 08:00 UTC (15:00 Vietnam time)
  @Cron(CronExpression.EVERY_DAY_AT_8AM, { timeZone: 'UTC' })
  async handleExpiringSoonNotifications() {
    const now = addTimeUTC(new Date(), 0)
    this.logger.log(`[UserSubscription Expiring Soon] Running at ${now.toISOString()}`)

    try {
      const daysToCheck = [1, 3, 7] // Check for subscriptions expiring in 1, 3, or 7 days

      for (const days of daysToCheck) {
        const targetDate = addTimeUTC(now, days * 24 * 60 * 60 * 1000) // Add X days in milliseconds
        const startOfTargetDay = new Date(targetDate)
        startOfTargetDay.setUTCHours(0, 0, 0, 0)
        const endOfTargetDay = new Date(targetDate)
        endOfTargetDay.setUTCHours(23, 59, 59, 999)

        this.logger.log(
          `[UserSubscription Expiring Soon] Checking for subscriptions expiring on ${startOfTargetDay.toISOString()} (${days} day${days > 1 ? 's' : ''} from now)`
        )

        // Find ACTIVE subscriptions expiring on the target day
        const expiringSoonSubscriptions =
          await this.userSubscriptionRepo.findActiveExpiringBetween(
            startOfTargetDay,
            endOfTargetDay
          )

        if (expiringSoonSubscriptions.length === 0) {
          this.logger.log(
            `[UserSubscription Expiring Soon] No subscriptions expiring in ${days} day(s)`
          )
          continue
        }

        this.logger.log(
          `[UserSubscription Expiring Soon] Found ${expiringSoonSubscriptions.length} subscription(s) expiring in ${days} day(s), sending reminder emails`
        )

        // Send email notifications
        for (const subscription of expiringSoonSubscriptions) {
          try {
            if (!subscription.user.email) {
              this.logger.warn(
                `[UserSubscription Expiring Soon] User ${subscription.userId} has no email, skipping`
              )
              continue
            }

            await this.mailService.sendSubscriptionExpiringSoonEmail(
              subscription.user.email,
              subscription.user.name || 'Người dùng',
              {
                planName:
                  subscription.subscriptionPlan.subscription.nameTranslations[0]?.value ||
                  subscription.subscriptionPlan.subscription.nameKey ||
                  'Premium',
                expiresAt: subscription.expiresAt!,
                daysLeft: days
              }
            )

            this.logger.log(
              `[UserSubscription Expiring Soon] Sent reminder email to ${subscription.user.email} (userId=${subscription.userId}, expiresAt=${subscription.expiresAt?.toISOString()}, daysLeft=${days})`
            )
          } catch (emailError) {
            this.logger.error(
              `[UserSubscription Expiring Soon] Failed to send email to userId=${subscription.userId}:`,
              emailError
            )
          }
        }
      }

      this.logger.log('[UserSubscription Expiring Soon] Completed successfully')
    } catch (error) {
      this.logger.error('[UserSubscription Expiring Soon] Error:', error)
      throw error
    }
  }
}
