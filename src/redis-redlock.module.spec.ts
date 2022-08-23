import { Test } from "@nestjs/testing";
import Redis from "ioredis";
import { RedisRedlockModule } from "./redis-redlock.module";
import { RedisRedlockService } from "./redis-redlock.service";

describe("RedisRedlockModule", () => {
  let client: Redis;

  beforeEach(async () => {
    client = new Redis({ host: "localhost" });
    await client.flushdb();
  });

  describe("register", () => {
    it("should compile", async () => {
      const app = await Test.createTestingModule({
        imports: [
          RedisRedlockModule.register({
            clients: [client],
            duration: 1000,
          }),
        ],
      }).compile();
      expect(app).toBeDefined();
      expect(app.get(RedisRedlockService)).toBeDefined();
      await app.close();
    });
  });

  describe("registerAsync", () => {
    it("should compile", async () => {
      const app = await Test.createTestingModule({
        imports: [
          RedisRedlockModule.registerAsync({
            useFactory: () => ({
              clients: [client],
              duration: 1000,
            }),
          }),
        ],
      }).compile();
      expect(app).toBeDefined();
      expect(app.get(RedisRedlockService)).toBeDefined();
      await app.close();
    });
  });
});
