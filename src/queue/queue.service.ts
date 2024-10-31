import { Inject, Injectable } from '@nestjs/common';
import { P_QUEUE_MAP } from './p-queue-map.provider.js';
import PQueue from 'p-queue';

@Injectable()
export class QueueService {
  constructor(
    @Inject(P_QUEUE_MAP)
    private readonly queues: Map<string, PQueue>,
  ) {}

  getQueue(
    queueName: string,
    options?: ConstructorParameters<typeof PQueue>[0],
  ): PQueue {
    if (!this.queues.has(queueName)) {
      this.queues.set(queueName, new PQueue(options));
    }

    return this.queues.get(queueName);
  }
}
