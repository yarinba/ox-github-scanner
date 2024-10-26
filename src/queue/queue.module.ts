import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { PQueueMapProvider } from './p-queue-map.provider.js';
import { QueueInterceptor } from './queue.interceptor.js';
import { QueueService } from './queue.service.js';

@Module({
  providers: [
    PQueueMapProvider,
    QueueService,
    {
      provide: APP_INTERCEPTOR,
      useClass: QueueInterceptor,
    },
  ],
})
export class QueueModule {}
