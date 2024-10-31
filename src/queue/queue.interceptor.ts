import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { firstValueFrom, Observable } from 'rxjs';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Reflector } from '@nestjs/core';
import { QueueService } from './queue.service.js';
import { QUEUE_KEY, QueueOptions } from './queue.decorator.js';

@Injectable()
export class QueueInterceptor implements NestInterceptor {
  private readonly logger = new Logger(QueueInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly queueService: QueueService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const gqlContext = GqlExecutionContext.create(context);
    const queueOptions = this.reflector.get<QueueOptions>(
      QUEUE_KEY,
      gqlContext.getHandler(),
    );

    if (!queueOptions) {
      return next.handle();
    }

    const queue = this.queueService.getQueue(queueOptions.name, {
      concurrency: queueOptions.concurrency,
    });

    return new Observable((subscriber) => {
      queue
        .add(
          async () => {
            this.logger.debug(
              `Starting execution in queue ${queueOptions.name}`,
            );

            const value = await firstValueFrom(next.handle());

            this.logger.debug(
              `Execution completed in queue ${queueOptions.name}`,
              value,
            );

            subscriber.next(value);
            subscriber.complete();
          },
          { timeout: queueOptions.timeout },
        )
        .catch((err) => subscriber.error(err));
    });
  }
}
