/*eslint no-async-promise-executor: "off"*/
import { Test } from "@nestjs/testing";
import Redis from "ioredis";
import { setTimeout } from "timers/promises";
import { Redlock } from "./redlock.decorator";
import { RedlockModule } from "./redlock.module";

// Custom metadata keys for testing
const CUSTOM_METADATA_KEY = Symbol("custom_metadata");
const ROUTE_METADATA_KEY = "path";

// Mock decorator to simulate NestJS decorators behavior
function CustomDecorator(value: string): MethodDecorator {
  return (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata(CUSTOM_METADATA_KEY, value, descriptor.value);
    return descriptor;
  };
}

function RouteDecorator(path: string): MethodDecorator {
  return (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata(ROUTE_METADATA_KEY, path, descriptor.value);
    return descriptor;
  };
}

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

  describe("Metadata Preservation", () => {
    it("should preserve metadata when applied after other decorators", async () => {
      class TestService {
        @Redlock("test-metadata-1")
        @CustomDecorator("custom-value")
        @RouteDecorator("/api/test")
        public async testMethodWithMetadata(): Promise<string> {
          return "success";
        }

        @CustomDecorator("another-value")
        @Redlock("test-metadata-2")
        @RouteDecorator("/api/another")
        public async anotherTestMethod(): Promise<string> {
          return "another-success";
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

      // Test that the method works correctly
      await expect(service.testMethodWithMetadata()).resolves.toBe("success");
      await expect(service.anotherTestMethod()).resolves.toBe("another-success");

      // Test that metadata is preserved
      const testMethodDescriptor = Object.getOwnPropertyDescriptor(TestService.prototype, "testMethodWithMetadata");
      const anotherMethodDescriptor = Object.getOwnPropertyDescriptor(TestService.prototype, "anotherTestMethod");

      expect(testMethodDescriptor).toBeDefined();
      expect(anotherMethodDescriptor).toBeDefined();

      // Check that metadata is correctly preserved
      const customMetadata1 = Reflect.getMetadata(CUSTOM_METADATA_KEY, testMethodDescriptor!.value);
      const routeMetadata1 = Reflect.getMetadata(ROUTE_METADATA_KEY, testMethodDescriptor!.value);

      const customMetadata2 = Reflect.getMetadata(CUSTOM_METADATA_KEY, anotherMethodDescriptor!.value);
      const routeMetadata2 = Reflect.getMetadata(ROUTE_METADATA_KEY, anotherMethodDescriptor!.value);

      expect(customMetadata1).toBe("custom-value");
      expect(routeMetadata1).toBe("/api/test");
      expect(customMetadata2).toBe("another-value");
      expect(routeMetadata2).toBe("/api/another");

      await app.close();
    });

    it("should preserve metadata when decorator is disabled", async () => {
      class TestService {
        @Redlock("test-disabled")
        @CustomDecorator("disabled-value")
        public async testDisabledMethod(): Promise<string> {
          return "disabled-success";
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

      // Test that the method works correctly when disabled
      await expect(service.testDisabledMethod()).resolves.toBe("disabled-success");

      // Test that metadata is still preserved
      const methodDescriptor = Object.getOwnPropertyDescriptor(TestService.prototype, "testDisabledMethod");
      expect(methodDescriptor).toBeDefined();

      const customMetadata = Reflect.getMetadata(CUSTOM_METADATA_KEY, methodDescriptor!.value);
      expect(customMetadata).toBe("disabled-value");

      await app.close();
    });

    it("should handle methods without existing metadata", async () => {
      class TestService {
        @Redlock("test-no-metadata")
        public async testMethodNoMetadata(): Promise<string> {
          return "no-metadata-success";
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

      // Test that the method works correctly
      await expect(service.testMethodNoMetadata()).resolves.toBe("no-metadata-success");

      // Test that no errors occur when there's no metadata to copy
      const methodDescriptor = Object.getOwnPropertyDescriptor(TestService.prototype, "testMethodNoMetadata");
      expect(methodDescriptor).toBeDefined();
      expect(methodDescriptor!.value).toBeInstanceOf(Function);

      await app.close();
    });

    it("should preserve all metadata keys", async () => {
      const FIRST_KEY = Symbol("first");
      const SECOND_KEY = Symbol("second");
      const STRING_KEY = "string_key";

      function MultipleMetadataDecorator(): MethodDecorator {
        return (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
          Reflect.defineMetadata(FIRST_KEY, "first-value", descriptor.value);
          Reflect.defineMetadata(SECOND_KEY, { nested: "object" }, descriptor.value);
          Reflect.defineMetadata(STRING_KEY, ["array", "value"], descriptor.value);
          return descriptor;
        };
      }

      class TestService {
        @Redlock("test-multiple-metadata")
        @MultipleMetadataDecorator()
        public async testMultipleMetadata(): Promise<string> {
          return "multiple-success";
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
      await expect(service.testMultipleMetadata()).resolves.toBe("multiple-success");

      const methodDescriptor = Object.getOwnPropertyDescriptor(TestService.prototype, "testMultipleMetadata");
      expect(methodDescriptor).toBeDefined();

      const firstValue = Reflect.getMetadata(FIRST_KEY, methodDescriptor!.value);
      const secondValue = Reflect.getMetadata(SECOND_KEY, methodDescriptor!.value);
      const stringValue = Reflect.getMetadata(STRING_KEY, methodDescriptor!.value);

      expect(firstValue).toBe("first-value");
      expect(secondValue).toEqual({ nested: "object" });
      expect(stringValue).toEqual(["array", "value"]);

      await app.close();
    });
  });
});
