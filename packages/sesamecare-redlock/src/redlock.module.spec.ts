import { Global, Module } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import Redis from "ioredis";
import { RedlockModule } from "./redlock.module";
import { RedlockService } from "./redlock.service";

describe("RedlockModule", () => {
  let client: Redis;

  beforeEach(async () => {
    client = new Redis({ host: "localhost", port: 6380 });
    await client.flushdb();
  });

  describe("register", () => {
    it("should compile", async () => {
      const app = await Test.createTestingModule({
        imports: [
          RedlockModule.register({
            clients: [client],
            duration: 1000,
          }),
        ],
      }).compile();
      expect(app).toBeDefined();
      expect(app.get(RedlockService)).toBeDefined();
      await app.close();
    });
  });

  describe("registerAsync", () => {
    it("should compile", async () => {
      const app = await Test.createTestingModule({
        imports: [
          RedlockModule.registerAsync({
            useFactory: () => ({
              clients: [client],
              duration: 1000,
            }),
          }),
        ],
      }).compile();
      expect(app).toBeDefined();
      expect(app.get(RedlockService)).toBeDefined();
      await app.close();
    });
  });

  describe("use global scope", () => {
    it("should compile", async () => {
      @Global()
      @Module({
        imports: [
          RedlockModule.register({
            clients: [client],
            duration: 1000,
          }),
        ],
      })
      class AppModule {}

      const app = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();
      expect(app).toBeDefined();
      expect(app.get(RedlockService)).toBeDefined();
      await app.close();
    });
  });
});
