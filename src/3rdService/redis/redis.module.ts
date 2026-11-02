import { Global, Inject, Module, OnModuleDestroy } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { Redis } from 'ioredis'

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: async (configService: ConfigService) => {
        const redisUri = configService.get<string>('REDIS_URI')
        if (!redisUri) {
          throw new Error('REDIS_URI is not defined in environment variables')
        }
        const client = new Redis(redisUri, {
          maxRetriesPerRequest: 3,
          retryStrategy: (times) => Math.min(times * 50, 2000),
          connectTimeout: 30000
        })
        client.on('error', (err) => console.error('Redis Client Error:', err))
        client.on('connect', () => console.log('Connected to Redis'))
        try {
          await client.ping()
          global.REDIS_CLIENT = client
          return client
        } catch (error) {
          throw new Error(`Redis connection failed: ${error.message}`)
        }
      },
      inject: [ConfigService]
    }
  ],
  exports: ['REDIS_CLIENT']
})
export class RedisModule implements OnModuleDestroy {
  constructor(@Inject('REDIS_CLIENT') private readonly redisClient: Redis) {}

  // Đóng kết nối khi app tắt (app.close()/shutdown), tránh giữ tiến trình sống
  async onModuleDestroy() {
    await this.redisClient.quit()
  }
}
