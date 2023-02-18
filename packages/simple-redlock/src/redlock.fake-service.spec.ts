import { Test } from "@nestjs/testing";
import { SimpleRedlock } from "./redlock.decorator";
import { FakeSimpleRedlockService } from "./redlock.fake-service";
import { SimpleRedlockService } from "./redlock.service";

describe("FakeRedlockService", () => {
  it("should set fake for unit testing", async () => {
    class TestService {
      @SimpleRedlock("test")
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      public async testMethod(): Promise<void> {}
    }

    const app = await Test.createTestingModule({
      providers: [TestService, { provide: SimpleRedlockService, useClass: FakeSimpleRedlockService }],
      exports: [SimpleRedlockService],
    }).compile();

    expect(app).toBeDefined();

    const service = app.get(SimpleRedlockService);

    {
      // using
      await expect(
        service.using([], async () => {
          return "ok";
        }),
      ).resolves.toEqual("ok");

      await expect(
        service.using([], { duration: 1000 }, async () => {
          return "ok";
        }),
      ).resolves.toEqual("ok");

      await expect(service["dummyRoutine"]()).resolves.toBeUndefined();
    }
  });
});
