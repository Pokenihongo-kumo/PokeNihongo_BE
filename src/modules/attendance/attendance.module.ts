import { UserCoreModule } from '@/modules/user/user-core.module'
import { Module } from '@nestjs/common'
import { AttendenceConfigModule } from '../attendence-config/attendence-config.module'
import { LanguagesModule } from '../languages/languages.module'
import { TranslationModule } from '../translation/translation.module'
import { UserDailyRequestModule } from '../user-daily-request/user-daily-request.module'
import { WalletTransactionModule } from '../wallet-transaction/wallet-transaction.module'
import { WalletModule } from '../wallet/wallet.module'
import { AttendanceController } from './attendance.controller'
import { AttendanceService } from './attendance.service'
import { AttendanceRepo } from './attendence.repo'

@Module({
  imports: [
    UserCoreModule,
    AttendenceConfigModule,
    LanguagesModule,
    TranslationModule,
    UserDailyRequestModule,
    WalletModule,
    WalletTransactionModule
  ],
  controllers: [AttendanceController],
  providers: [AttendanceService, AttendanceRepo]
})
export class AttendanceModule {}
