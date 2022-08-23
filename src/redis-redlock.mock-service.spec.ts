import { Test } from "@nestjs/testing";
import { RedisRedlock } from "./redis-redlock.decorator";
import { MockRedisRedlockService } from "./redis-redlock.mock-service";
import { RedisRedlockService } from "./redis-redlock.service";

describe("MockRedisRedlockService", () => {
  it("should set mock for unit testing", async () => {
    class TestService {
      @RedisRedlock("test")
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      public async testMethod(): Promise<void> {}
    }

    const app = await Test.createTestingModule({
      providers: [TestService, { provide: RedisRedlockService, useClass: MockRedisRedlockService }],
      exports: [RedisRedlockService],
    }).compile();

    expect(app).toBeDefined();

    const service = app.get(RedisRedlockService);

    {
      // quit
      await service.quit();
    }

    {
      // acquire
      let lock = await service.acquire(["a"], 5000);
      // Do something...

      // Extend the lock. Note that this returns a new `Lock` instance.
      lock = await lock.extend(5000);

      // Do something else...

      // Release the lock.
      await lock.release();
    }

    {
      // release
      const lock = await service.acquire(["a"], 5000);
      await service.release(lock);
    }

    {
      // extend
      const lock = await service.acquire(["a"], 5000);
      await lock.extend(5000);
    }

    {
      // using
      await expect(
        service.using([], 1000, async () => {
          return "ok";
        }),
      ).resolves.toEqual("ok");

      await expect(
        service.using([], 1000, {}, async () => {
          return "ok";
        }),
      ).resolves.toEqual("ok");
    }
  });
});
