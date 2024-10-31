import { SetMetadata } from '@nestjs/common';

export const QUEUE_KEY = 'queue_metadata';
export interface QueueOptions {
  name: string;
  concurrency?: number;
  timeout?: number;
}

export const UseQueue = (options: QueueOptions) =>
  SetMetadata(QUEUE_KEY, options);
