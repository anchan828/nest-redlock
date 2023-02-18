# @anchan828/nest-simple-redlock

![npm](https://img.shields.io/npm/v/@anchan828/nest-simple-redlock.svg)
![NPM](https://img.shields.io/npm/l/@anchan828/nest-simple-redlock.svg)

This is a [Nest](https://github.com/nestjs/nest) implementation of the redlock algorithm for distributed redis locks.

This package uses [node-redlock](https://github.com/mike-marcacci/node-redlock).

## Installation

```bash
$ npm i --save @anchan828/nest-simple-redlock ioredis
```

## Quick Start

### 1. Import module

```ts
import { RedlockModule } from "@anchan828/nest-simple-redlock";
import Redis from "ioredis";

@Module({
  imports: [
    SimpleRedlockModule.register({
      client: new Redis({ host: "localhost" }),
      settings: {
        duration: 5000,
        stopOnError: true,
        expire: 10000,
        retryCount: 100,
        retryDelay: 200,
        retryJitter: 200,
      },
    }),
  ],
})
export class AppModule {}
```

#### Difference between `duration` and `expire`

```
duration < expire // good
duration > expire // bad
```

The duration is the maximum time the redlock wait.
The expire is the expiry time of the key in Redis. The expire is used to automatically delete the lock key after some error occurs, so it is recommended to set a value greater than duration.
If the expire is less than the duration, other processes will start while the locked process is running.

### 2. Add `SimpleRedlock` decorator

```ts
import { SimpleRedlock } from "@anchan828/nest-simple-redlock";

@Injectable()
export class ExampleService {
  @SimpleRedlock("lock-key")
  public async addComment(projectId: number, comment: string): Promise<void> {}
}
```

This is complete. redlock is working correctly!

## Define complex resources (lock keys)

Using constants causes the same lock key to be used for all calls. Let's reduce the scope a bit more.

In this example, only certain projects are now locked.

```ts
import { SimpleRedlock } from "@anchan828/nest-simple-redlock";

@Injectable()
export class ExampleService {
  // The arguments define the class object to which the decorator is being added and the method arguments in order.
  @SimpleRedlock<ExampleService["addComment"]>(
    (target: ExampleService, projectId: number, comment: string) => `projects/${projectId}/comments`,
  )
  public async addComment(projectId: number, comment: string): Promise<void> {}
}
```

Of course, you can lock multiple keys.

```ts
@Injectable()
export class ExampleService {
  @SimpleRedlock<ExampleService["updateComments"]>(
    (target: ExampleService, projectId: number, args: Array<{ commentId: number; comment: string }>) =>
      args.map((arg) => `projects/${projectId}/comments/${arg.commentId}`),
  )
  public async updateComments(projectId: number, args: Array<{ commentId: number; comment: string }>): Promise<void> {}
}
```

## Using SimpleRedlock service

If you want to use node-redlock as is, use RedlockService.

```ts
import { SimpleRedlockService } from "@anchan828/nest-simple-redlock";

@Injectable()
export class ExampleService {
  constructor(private readonly redlock: SimpleRedlockService) {}

  public async addComment(projectId: number, comment: string): Promise<void> {
    await this.redlock.using(
      [`projects/${projectId}/comments`],
      { expire: 1000, retryCount: 10, retryDelay: 200, retryInterval: 200 },
      (signal) => {
        // Do something...

        if (signal.aborted) {
          throw signal.error;
        }
      },
    );
  }
}
```

## Using fake SimpleRedlockService

If you do not want to use Redis in your Unit tests, define the fake class as SimpleRedlockService.

```ts
const app = await Test.createTestingModule({
  providers: [TestService, { provide: SimpleRedlockService, useClass: FakeSimpleRedlockService }],
}).compile();
```

## Troubleshooting

### Nest can't resolve dependencies of the XXX. Please make sure that the "@simpleRedlockService" property is available in the current context.

This is the error output when using the SimpleRedlock decorator without importing the SimpleRedlockModule.

```ts
import { SimpleRedlockModule } from "@anchan828/nest-simple-redlock";
import Redis from "ioredis";

@Module({
  imports: [
    SimpleRedlockModule.register({
      client: new Redis({ host: "localhost" }),
    }),
  ],
})
export class AppModule {}
```

#### What should I do with Unit tests, I don't want to use Redis.

Use `FakeSimpleRedlockService` class. Register FakeSimpleRedlockService with the provider as SimpleRedlockService.

```ts
const app = await Test.createTestingModule({
  providers: [TestService, { provide: SimpleRedlockService, useClass: FakeSimpleRedlockService }],
}).compile();
```

## License

[MIT](LICENSE)
