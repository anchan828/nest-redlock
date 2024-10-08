/*eslint no-async-promise-executor: "off"*/
import { Injectable } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import Redis from "ioredis";
import { setTimeout } from "timers/promises";
import { RedlockModule } from "./redlock.module";
import { RedlockService } from "./redlock.service";

describe("RedlockService", () => {
  let client: Redis;

  beforeEach(async () => {
    client = new Redis({ host: "localhost", port: 6380 });
    await client.flushdb();
  });

  it("should added messages in the correct order - single key", async () => {
    const messages: string[] = [];

    @Injectable()
    class TestService {
      constructor(private readonly redlock: RedlockService) {}

      public async testMethod1(): Promise<number> {
        return await this.redlock.using(["test1"], 5000, async () => {
          await setTimeout(500);
          return messages.push("testMethod1");
        });
      }

      public async testMethod2(): Promise<number> {
        return await this.redlock.using(["test1"], 5000, async () => {
          return messages.push("testMethod2");
        });
      }

      public async testMethod3(): Promise<number> {
        return await this.redlock.using(["test2"], 5000, async () => {
          return messages.push("testMethod3");
        });
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

    @Injectable()
    class TestService {
      constructor(private readonly redlock: RedlockService) {}

      public async testMethod(args: Array<{ id: number; text: string }>, delay = 0): Promise<number> {
        return await this.redlock.using(
          args.map((arg) => `keys/${arg.id}`),
          5000,
          async () => {
            await setTimeout(delay);
            return messages.push(...args);
          },
        );
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
});
