/*eslint no-async-promise-executor: "off"*/
import { Test } from "@nestjs/testing";
import Redis from "ioredis";
import { setTimeout } from "timers/promises";
import { Redlock } from "./redlock.decorator";
import { RedlockModule } from "./redlock.module";

describe("Redlock", () => {
  let client: Redis;

  beforeEach(async () => {
    client = new Redis({ host: "localhost" });
  });

  it("should throw error - RedlockModule not imported", async () => {
    class TestService {
      @Redlock("test")
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      public async testMethod(): Promise<void> {}
    }

    await expect(
      Test.createTestingModule({
        providers: [TestService],
        exports: [TestService],
      }).compile(),
    ).rejects.toThrowError("Nest can't resolve dependencies of the TestService.");
    await client.quit();
  });

  it("should do nothing - disabled", async () => {
    const messages: string[] = [];

    class TestService {
      @Redlock("test1")
      public async testMethod1(): Promise<number> {
        await setTimeout(500);
        return messages.push("testMethod1");
      }

      @Redlock("test1")
      public async testMethod2(): Promise<number> {
        return messages.push("testMethod2");
      }

      @Redlock("test2")
      public async testMethod3(): Promise<number> {
        return messages.push("testMethod3");
      }
    }

    const app = await Test.createTestingModule({
      imports: [
        RedlockModule.register({
          clients: [client],
          decoratorEnabled: false,
        }),
      ],
      providers: [TestService],
      exports: [TestService],
    }).compile();

    const service = app.get(TestService);

    await expect(
      Promise.all([
        service.testMethod1(),
        new Promise<number>(async (resolve) => {
          // Always ensure that testMethod1 is called first.
          await setTimeout(100);
          resolve(await service.testMethod2());
        }),
        new Promise<number>(async (resolve) => {
          // Always ensure that testMethod2 is called second.
          await setTimeout(200);
          resolve(await service.testMethod3());
        }),
      ]),
    ).resolves.toEqual([3, 1, 2]);

    expect(messages).toEqual(["testMethod2", "testMethod3", "testMethod1"]);

    await app.close();
  });

  it("should added messages in the correct order - single key", async () => {
    const messages: string[] = [];

    class TestService {
      @Redlock("test1")
      public async testMethod1(): Promise<number> {
        await setTimeout(500);
        return messages.push("testMethod1");
      }

      @Redlock("test1")
      public async testMethod2(): Promise<number> {
        return messages.push("testMethod2");
      }

      @Redlock("test2")
      public async testMethod3(): Promise<number> {
        return messages.push("testMethod3");
      }
    }

    const app = await Test.createTestingModule({
      imports: [
        RedlockModule.register({
          clients: [client],
        }),
      ],
      providers: [TestService],
      exports: [TestService],
    }).compile();

    const service = app.get(TestService);

    await expect(
      Promise.all([
        service.testMethod1(),
        new Promise<number>(async (resolve) => {
          // Always ensure that testMethod1 is called first.
          await setTimeout(100);
          resolve(await service.testMethod2());
        }),
        new Promise<number>(async (resolve) => {
          // Always ensure that testMethod2 is called second.
          await setTimeout(200);
          resolve(await service.testMethod3());
        }),
      ]),
    ).resolves.toEqual([2, 3, 1]);

    expect(messages).toEqual(["testMethod3", "testMethod1", "testMethod2"]);

    await app.close();
  });

  it("should added messages in the correct order - multiple key", async () => {
    const messages: Array<{ id: number; text: string }> = [];

    class TestService {
      @Redlock<TestService["testMethod"]>((target: TestService, args: Array<{ id: number; text: string }>) =>
        args.map((arg) => `keys/${arg.id}`),
      )
      public async testMethod(args: Array<{ id: number; text: string }>, delay = 0): Promise<number> {
        await setTimeout(delay);
        return messages.push(...args);
      }
    }

    const app = await Test.createTestingModule({
      imports: [
        RedlockModule.register({
          clients: [client],
        }),
      ],
      providers: [TestService],
      exports: [TestService],
    }).compile();

    const service = app.get(TestService);

    await expect(
      Promise.all([
        service.testMethod(
          [
            { id: 1, text: "text1" },
            { id: 2, text: "text2" },
          ],
          1000,
        ),
        new Promise<number>(async (resolve) => {
          await setTimeout(100);
          resolve(
            await service.testMethod([
              { id: 1, text: "text3" },
              { id: 2, text: "text4" },
            ]),
          );
        }),
        new Promise<number>(async (resolve) => {
          await setTimeout(200);
          resolve(
            await service.testMethod([
              { id: 3, text: "text5" },
              { id: 4, text: "text6" },
            ]),
          );
        }),
      ]),
    ).resolves.toEqual([4, 6, 2]);

    expect(messages).toEqual([
      { id: 3, text: "text5" },
      { id: 4, text: "text6" },
      { id: 1, text: "text1" },
      { id: 2, text: "text2" },
      { id: 1, text: "text3" },
      { id: 2, text: "text4" },
    ]);

    await app.close();
  });

  it("should call hooks", async () => {
    const messages: string[] = [];

    class TestService {
      @Redlock("test1")
      public async testMethod1(): Promise<number> {
        await setTimeout(500);
        return messages.push("testMethod1");
      }

      @Redlock("test2")
      public async testMethod2(): Promise<number> {
        return messages.push("testMethod2");
      }

      @Redlock("test3")
      public async testMethod3(): Promise<number> {
        return messages.push("testMethod3");
      }
    }

    const lockedKeysHook = jest.fn();
    const preLockKeysHook = jest.fn();
    const unlockedKeysHook = jest.fn();

    const app = await Test.createTestingModule({
      imports: [
        RedlockModule.register({
          clients: [client],
          decoratorHooks: {
            lockedKeys: lockedKeysHook,
            preLockKeys: preLockKeysHook,
            unlockedKeys: unlockedKeysHook,
          },
        }),
      ],
      providers: [TestService],
      exports: [TestService],
    }).compile();

    const service = app.get(TestService);

    await expect(
      Promise.all([
        service.testMethod1(),
        service.testMethod1(),
        new Promise<number>(async (resolve) => {
          // Always ensure that testMethod1 is called first.
          await setTimeout(100);
          resolve(await service.testMethod2());
        }),
        new Promise<number>(async (resolve) => {
          // Always ensure that testMethod2 is called second.
          await setTimeout(200);
          resolve(await service.testMethod3());
        }),
      ]),
    ).resolves.toEqual([3, 4, 1, 2]);

    expect(messages).toEqual(["testMethod2", "testMethod3", "testMethod1", "testMethod1"]);

    expect(preLockKeysHook.mock.calls).toEqual([
      [{ duration: 5000, keys: ["test1"] }],
      [{ duration: 5000, keys: ["test1"] }],
      [{ duration: 5000, keys: ["test2"] }],
      [{ duration: 5000, keys: ["test3"] }],
    ]);

    expect(lockedKeysHook.mock.calls).toEqual([
      [{ duration: 5000, elapsedTime: expect.any(Number), keys: ["test1"] }],
      [{ duration: 5000, elapsedTime: expect.any(Number), keys: ["test2"] }],
      [{ duration: 5000, elapsedTime: expect.any(Number), keys: ["test3"] }],
      [{ duration: 5000, elapsedTime: expect.any(Number), keys: ["test1"] }],
    ]);

    expect(unlockedKeysHook.mock.calls).toEqual([
      [{ duration: 5000, elapsedTime: expect.any(Number), keys: ["test2"] }],
      [{ duration: 5000, elapsedTime: expect.any(Number), keys: ["test3"] }],
      [{ duration: 5000, elapsedTime: expect.any(Number), keys: ["test1"] }],
      [{ duration: 5000, elapsedTime: expect.any(Number), keys: ["test1"] }],
    ]);

    await app.close();
  });
});
