# NestJS Queue Module

A NestJS module that provides queue functionality using `p-queue` for managing concurrency in GraphQL resolvers and other operations.

## Features

- Queue management for concurrent operations
- Decorator-based queue configuration
- Global interceptor for automatic queue handling
- Support for multiple named queues
- Configurable concurrency and timeout settings

## Setup

1. Import the `QueueModule` in your `app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { QueueModule } from './queue/queue.module';

@Module({
  imports: [QueueModule],
  // ... other configurations
})
export class AppModule {}
```

## How It Works

### Architecture Overview

The Queue Module consists of three main components that work together:

1. **QueueService**: Manages the queue instances
2. **UseQueue Decorator**: Marks methods for queue processing
3. **QueueInterceptor**: Intercepts marked methods and processes them through queues

Here's how these components interact:

```
Request Flow:
┌───────────┐    ┌─────────────┐    ┌─────────────┐    ┌──────────┐
│  Request  │ -> │ @UseQueue() │ -> │ Interceptor │ -> │  Queue   │
└───────────┘    └─────────────┘    └─────────────┘    └──────────┘
```

### Component Roles

#### 1. QueueService

```typescript
@Injectable()
export class QueueService {
  private queues: Map<string, PQueue> = new Map();

  getQueue(queueName: string, options?: PQueueOptions): PQueue {
    // Creates or returns existing queue
  }
}
```

- Acts as a singleton queue manager
- Maintains a map of named queues
- Ensures queue instance reuse across the application

#### 2. UseQueue Decorator

```typescript
export const UseQueue = (options: QueueOptions) =>
  SetMetadata(QUEUE_KEY, options);
```

- Marks methods for queue processing
- Stores queue configuration metadata
- Allows declarative queue configuration

#### 3. QueueInterceptor

```typescript
@Injectable()
export class QueueInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    // 1. Reads @UseQueue metadata
    // 2. Gets appropriate queue
    // 3. Adds operation to queue
  }
}
```

- Automatically intercepts decorated methods
- Reads queue configuration from decorator metadata
- Manages the actual queueing process

### Detailed Flow Example

1. When a request hits a decorated resolver:

```typescript
@Query()
@UseQueue({ name: 'users', concurrency: 2 })
async getUsers() {
  return this.userService.findAll();
}
```

2. The following sequence occurs:

```typescript
// 1. Interceptor detects @UseQueue decorator
const queueOptions = this.reflector.get<QueueOptions>(
  QUEUE_KEY,
  context.getHandler(),
);

// 2. Gets or creates queue through QueueService
const queue = this.queueService.getQueue(queueOptions.name, {
  concurrency: queueOptions.concurrency,
});

// 3. Adds operation to queue
queue.add(() => next.handle().toPromise());
```

### Global Interceptor Benefits

The Queue Module uses NestJS's global interceptor pattern:

```typescript
@Global()
@Module({
  providers: [
    QueueService,
    {
      provide: APP_INTERCEPTOR,
      useClass: QueueInterceptor,
    },
  ],
})
export class QueueModule {}
```

Benefits of this approach:

1. **Automatic Interception**

   - No need to manually apply `@UseInterceptors()` decorator
   - Reduces boilerplate code
   - Prevents errors from forgotten interceptors

2. **Code Readability**

   ```typescript
   // Before (without global interceptor)
   @Query()
   @UseQueue({ name: 'users' })
   @UseInterceptors(QueueInterceptor)  // <-- Extra decorator needed
   async getUsers() {}

   // After (with global interceptor)
   @Query()
   @UseQueue({ name: 'users' })  // <-- Cleaner, single responsibility
   async getUsers() {}
   ```

3. **Centralized Queue Management**

   - All queue processing is handled in one place
   - Consistent queue behavior across the application
   - Easier to modify queue behavior globally

4. **Separation of Concerns**
   - Decorators only handle configuration
   - Interceptor handles all queue processing logic
   - Clear division of responsibilities

### Queue Configuration Flow

```
┌───────────────┐
│  @UseQueue()  │
│  Decorator    │
│  - name       │
│  - concurrency│
└───────┬───────┘
        │
        ▼
┌───────────────┐    ┌───────────────┐
│  Interceptor  │ -> │ QueueService  │
│  Reads config │    │ Manages queue │
└───────────────┘    └───────────────┘
```

## Configuration Options

### Queue Decorator Options

The `@UseQueue()` decorator accepts the following options:

```typescript
interface QueueOptions {
  name: string; // Unique identifier for the queue
  concurrency?: number; // Number of concurrent operations (default: 1)
  timeout?: number; // Operation timeout in milliseconds (optional)
}
```

### Queue Provider Options

When getting a queue directly from `QueueService`, you can pass `PQueue` options:

```typescript
interface PQueueOptions {
  concurrency?: number;
  timeout?: number;
  throwOnTimeout?: boolean;
  // ... other p-queue options
}
```

## Example Scenarios

### Rate Limiting API Calls

```typescript
@Resolver()
export class ExternalApiResolver {
  @Query()
  @UseQueue({
    name: 'apiCalls',
    concurrency: 5, // Only 5 concurrent API calls
    timeout: 10000, // 10 second timeout
  })
  async getExternalData() {
    return this.apiService.fetchData();
  }
}
```

### Different Queues for Different Operations

```typescript
@Resolver()
export class MultiQueueResolver {
  @Query()
  @UseQueue({ name: 'highPriority', concurrency: 3 })
  async importantOperation() {
    // High priority operations
  }

  @Query()
  @UseQueue({ name: 'lowPriority', concurrency: 1 })
  async backgroundOperation() {
    // Low priority operations
  }
}
```

## Limitations

- Queue state is not preserved across application restarts
- Queues are in-memory only
- Timeout does not cancel the underlying operation
