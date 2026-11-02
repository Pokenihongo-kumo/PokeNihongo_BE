import { BullModule } from '@nestjs/bull'
import { DynamicModule, Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { RedisModule } from '../redis/redis.module'
import { BullQueueService } from './bull-queue.service'
import { assertTestQueueIsolation, parseRedisUrl } from './queue-config'

@Module({})
export class BullQueueModule {
  static forRoot(): DynamicModule {
    return {
      module: BullQueueModule,
      imports: [RedisModule],
      providers: [BullQueueService],
      exports: [BullQueueService],
      global: true
    }
  }

  static registerQueue(
    queueName: string,
    options: any = {},
    useMatchRedis: boolean = false
  ): DynamicModule {
    return {
      module: BullQueueModule,
      global: true,
      imports: [
        RedisModule,
        BullModule.registerQueueAsync({
          name: queueName,
          imports: [RedisModule],
          inject: [ConfigService],
          useFactory: async (configService: ConfigService) => {
            let redisUri: string | undefined
            if (useMatchRedis) {
              redisUri =
                configService.get<string>('REDIS_MATCH_URI') ||
                configService.get<string>('REDIS_URI')
            } else {
              redisUri = configService.get<string>('REDIS_URI')
            }

            if (!redisUri) {
              throw new Error('REDIS_URI is not defined')
            }

            // host/port/username/password/db từ URL; rediss: bật TLS
            // (AWS Redis public thường bắt buộc TLS)
            const connection = parseRedisUrl(redisUri)

            const queueOptions = {
              redis: {
                ...connection,

                // Cấu hình mạng
                keepAlive: 10000,
                maxRetriesPerRequest: null,
                retryStrategy: (times: number) => Math.min(times * 50, 2000),
                connectTimeout: 20000
              },

              // Prefix tách job giữa các môi trường (Local/VPS/test)
              prefix: configService.get<string>('QUEUE_PREFIX') || 'bull_production',

              settings: {
                stalledInterval: 60000, // Tăng lên 60s cho mạng chậm
                maxStalledCount: 3,
                lockDuration: 60000, // Tăng lên 60s
                drainDelay: 20 // Tăng nhẹ lên 20ms để đỡ spam CPU
              },
              ...options
            }

            // Kiểm tra sau khi merge options vì caller có thể ghi đè redis/prefix
            assertTestQueueIsolation(queueName, queueOptions)

            return queueOptions
          }
        })
      ],
      exports: [BullModule]
    }
  }
}
