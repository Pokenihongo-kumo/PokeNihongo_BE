import { maskEmail } from '@/common/utils/mask'
import { MailSender } from '@/infrastructure/integrations/mail/mail-sender.port'
import { MailUnavailableException } from '@/infrastructure/integrations/mail/mail-unavailable.error'
import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common'
import { randomUUID } from 'crypto'
import { Redis } from 'ioredis'
import {
  CONSUME_IF_CODE,
  DELETE_IF_UNCHANGED,
  OtpPurpose,
  otpKey,
  toStoredOtp
} from './otp-value'

// One-time codes (integration-ports plan I1: business logic back in auth;
// moved from MailService unchanged). Codes live in Redis under
// otp:{purpose}:{email} for 5 minutes, are consumed in one atomic step, and a
// code whose mail failed is dropped unless a newer send replaced it (A1 T1,
// D-auth §1). Sending goes through the MailSender port.
@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name)

  constructor(
    private readonly mailSender: MailSender,
    @Inject('REDIS_CLIENT') private readonly redisClient: Redis
  ) {}

  private async sendOtpMail(
    to: string,
    otp: string,
    template: string,
    content: string,
    body: string
  ): Promise<void> {
    const subject = 'Hãy xác thực ' + otp
    const link = 'http://127.0.0.1:4000/auth/verified-email/' + to
    await this.mailSender.send({
      to,
      subject,
      template,
      context: { otp, content, body, link }
    })
  }

  async generateAndSendOtp(
    email: string,
    purpose: OtpPurpose,
    template: string,
    content: string,
    body: string
  ): Promise<void> {
    const otp = Math.floor(100000 + Math.random() * 900000).toString() // Tạo OTP 6 chữ số
    // Replaces the previous code, valid 5 minutes
    const stored = toStoredOtp(otp, randomUUID())
    const key = otpKey(purpose, email)
    await this.redisClient.set(key, stored, 'EX', 300)
    try {
      await this.sendOtpMail(email, otp, template, content, body)
    } catch {
      // Nobody received this code: drop it, unless a newer send has replaced it
      await this.redisClient.eval(DELETE_IF_UNCHANGED, 1, key, stored)
      throw new MailUnavailableException()
    }
    // Never log the code itself
    this.logger.log(`OTP sent to ${maskEmail(email)}`)
  }

  /**
   * True once for the right code: the code is deleted in the same atomic step,
   * so it cannot be used twice. A code stored under the email alone (sent
   * before OTPs were kept per purpose) is still accepted until it expires
   * (5 minutes after the deploy that introduced purposes).
   */
  async consumeOtp(email: string, purpose: OtpPurpose, code: string): Promise<boolean> {
    if (await this.redisClient.eval(CONSUME_IF_CODE, 1, otpKey(purpose, email), code)) {
      return true
    }
    // TODO(ADR D-auth): drop this legacy fallback once deployed for 5 minutes
    return (await this.redisClient.eval(CONSUME_IF_CODE, 1, email, code)) === 1
  }

  async verifyOtpStrict(
    email: string,
    otp: string,
    purpose: OtpPurpose
  ): Promise<boolean> {
    if (await this.consumeOtp(email, purpose, otp)) {
      this.logger.log(`OTP verified and deleted for ${maskEmail(email)}`)
      return true
    }
    this.logger.error(`Failed to verify OTP for ${maskEmail(email)}`)
    throw new BadRequestException('Mã OTP không hợp lệ hoặc đã hết hạn')
  }
}
