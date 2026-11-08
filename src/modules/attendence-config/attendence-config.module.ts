import { Module } from '@nestjs/common'
import { AttendenceConfigController } from './attendence-config.controller'
import { AttendenceConfigRepo } from './attendence-config.repo'
import { AttendenceConfigService } from './attendence-config.service'

@Module({
  controllers: [AttendenceConfigController],
  providers: [AttendenceConfigService, AttendenceConfigRepo],
  exports: [AttendenceConfigService, AttendenceConfigRepo]
})
export class AttendenceConfigModule {}
