import type { Provider } from '@nestjs/common';
import PQueue from 'p-queue';

export const P_QUEUE_MAP = 'P_QUEUE_MAP';

export const PQueueMapProvider: Provider = {
  provide: P_QUEUE_MAP,
  useFactory: () => new Map<string, PQueue>(),
};
