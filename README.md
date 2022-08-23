# @anchan828/nest-redlock

![npm](https://img.shields.io/npm/v/@anchan828/nest-redlock.svg)
![NPM](https://img.shields.io/npm/l/@anchan828/nest-redlock.svg)

This is a [Nest](https://github.com/nestjs/nest) implementation of the redlock algorithm for distributed redis.

This package uses [node-redlock](https://github.com/mike-marcacci/node-redlock).

## Installation

```bash
$ npm i --save @anchan828/nest-redlock ioredis
```

## Quick Start

### 1. Import module

```ts
import { RedisRedlockModule } from "@anchan828/nest-redlock";
import Redis from "ioredis";

@Module({
  imports: [
    RedisRedlockModule.register({
      clients: [new Redis({ host: "localhost" })],
    }),
  ],
})
export class AppModule {}
```

### 2. Add `RedisRedlock` decorator

```ts
import { RedisRedlock } from "@anchan828/nest-redlock";

@Injectable()
export class ExampleService {
  @RedisRedlock("lock-key")
  public async addComment(projectId: number, comment: string): Promise<void> {}
}
```

This is complete. redlock is working correctly!
See [node-redlock](https://github.com/mike-marcacci/node-redlock) for more information on redlock.

## Define complex resources (lock keys)

If you use a constant, it will be locked on all calls. Let's make the range a little smaller.

In this example, only certain projects are now locked.

```ts
import { RedisRedlock } from "@anchan828/nest-redlock";

@Injectable()
export class ExampleService {
  // The arguments define the class object to which the decorator is being added and the method arguments in order.
  @RedisRedlock((target: ExampleService, projectId: number, comment: string) => `projects/${projectId}/comments`)
  public async addComment(projectId: number, comment: string): Promise<void> {}
}
```

Of course, you can lock multiple keys.

```ts
@Injectable()
export class ExampleService {
  @RedisRedlock((target: ExampleService, projectId: number, args: Array<{ commentId: number; comment: string }>) =>
    args.map((arg) => `projects/${projectId}/comments/${arg.commentId}`),
  )
  public async updateComments(projectId: number, args: Array<{ commentId: number; comment: string }>): Promise<void> {}
}
```

## Using Redlock service

If you want to use node-redlock as is, use RedisRedlockService.

```ts
import { RedisRedlockService } from "@anchan828/nest-redlock";

@Injectable()
export class ExampleService {
  constructor(private readonly redlock: RedisRedlockService) {}

  public async addComment(projectId: number, comment: string): Promise<void> {
    await this.redlock.using([`projects/${projectId}/comments`], 5000, (signal) => {
      // Do something...

      if (signal.aborted) {
        throw signal.error;
      }
    });
  }
}
```

## Troubleshooting

### Nest can't resolve dependencies of the XXX. Please make sure that the "@redisRedlockService" property is available in the current context.

This is the error output when using the RedisRedlock decorator without importing the RedisRedlockModule.

```ts
import { RedisRedlockModule } from "@anchan828/nest-redlock";
import Redis from "ioredis";

@Module({
  imports: [
    RedisRedlockModule.register({
      clients: [new Redis({ host: "localhost" })],
    }),
  ],
})
export class AppModule {}
```

## License

[MIT](LICENSE)
