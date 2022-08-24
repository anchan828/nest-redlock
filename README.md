# @anchan828/nest-redlock

![npm](https://img.shields.io/npm/v/@anchan828/nest-redlock.svg)
![NPM](https://img.shields.io/npm/l/@anchan828/nest-redlock.svg)

This is a [Nest](https://github.com/nestjs/nest) implementation of the redlock algorithm for distributed redis locks.

This package uses [node-redlock](https://github.com/mike-marcacci/node-redlock).

## Installation

```bash
$ npm i --save @anchan828/nest-redlock ioredis
```

## Quick Start

### 1. Import module

```ts
import { RedlockModule } from "@anchan828/nest-redlock";
import Redis from "ioredis";

@Module({
  imports: [
    RedlockModule.register({
      // See https://github.com/mike-marcacci/node-redlock#configuration
      clients: [new Redis({ host: "localhost" })],
      settings: {
        driftFactor: 0.01,
        retryCount: 10,
        retryDelay: 200,
        retryJitter: 200,
        automaticExtensionThreshold: 500,
      },
      // Default duratiuon to use with Redlock decorator
      duration: 1000,
    }),
  ],
})
export class AppModule {}
```

### 2. Add `Redlock` decorator

```ts
import { Redlock } from "@anchan828/nest-redlock";

@Injectable()
export class ExampleService {
  @Redlock("lock-key")
  public async addComment(projectId: number, comment: string): Promise<void> {}
}
```

This is complete. redlock is working correctly!
See [node-redlock](https://github.com/mike-marcacci/node-redlock) for more information on redlock.

## Define complex resources (lock keys)

Using constants causes the same lock key to be used for all calls. Let's reduce the range a bit more.

In this example, only certain projects are now locked.

```ts
import { Redlock } from "@anchan828/nest-redlock";

@Injectable()
export class ExampleService {
  // The arguments define the class object to which the decorator is being added and the method arguments in order.
  @Redlock((target: ExampleService, projectId: number, comment: string) => `projects/${projectId}/comments`)
  public async addComment(projectId: number, comment: string): Promise<void> {}
}
```

Of course, you can lock multiple keys.

```ts
@Injectable()
export class ExampleService {
  @Redlock((target: ExampleService, projectId: number, args: Array<{ commentId: number; comment: string }>) =>
    args.map((arg) => `projects/${projectId}/comments/${arg.commentId}`),
  )
  public async updateComments(projectId: number, args: Array<{ commentId: number; comment: string }>): Promise<void> {}
}
```

## Using Redlock service

If you want to use node-redlock as is, use RedlockService.

```ts
import { RedlockService } from "@anchan828/nest-redlock";

@Injectable()
export class ExampleService {
  constructor(private readonly redlock: RedlockService) {}

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

## Using the RedlockService mock

If you do not want to use Redis in your Unit tests, define the mock class as RedlockService.

```ts
const app = await Test.createTestingModule({
  providers: [TestService, { provide: RedlockService, useClass: MockRedlockService }],
}).compile();
```

## Troubleshooting

### Nest can't resolve dependencies of the XXX. Please make sure that the "@redlockService" property is available in the current context.

This is the error output when using the Redlock decorator without importing the RedlockModule.

```ts
import { RedlockModule } from "@anchan828/nest-redlock";
import Redis from "ioredis";

@Module({
  imports: [
    RedlockModule.register({
      clients: [new Redis({ host: "localhost" })],
    }),
  ],
})
export class AppModule {}
```

#### What should I do with Unit tests, I don't want to use Redis.

Use `MockRedlockService` class. Register MockRedlockService with the provider as RedlockService.

```ts
const app = await Test.createTestingModule({
  providers: [TestService, { provide: RedlockService, useClass: MockRedlockService }],
}).compile();
```

## License

[MIT](LICENSE)
