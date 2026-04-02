import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: (configService: ConfigService) => {
        const url = configService.get<string>('REDIS_URL');
        if (!url) {
          throw new Error('REDIS_URL is not defined');
        }
        return new Redis(url);
      },
      inject: [ConfigService],

    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
