import { LanguagesModule } from '@/modules/languages/languages.module'
import { WebsocketsModule } from '@/websockets/websockets.module'
import { Module } from '@nestjs/common'
import { NotificationController } from './notification.controller'
import { NotificationRepo } from './notification.repo'
import { NotificationService } from './notification.service'

// Notifications (formerly SharedNotificationService in SharedModule): the
// service pushes them on the /user socket through UserGateway (B6d)
@Module({
  imports: [LanguagesModule, WebsocketsModule],
  controllers: [NotificationController],
  providers: [NotificationService, NotificationRepo],
  exports: [NotificationService]
})
export class NotificationModule {}
