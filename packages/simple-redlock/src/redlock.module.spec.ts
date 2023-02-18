import { Test } from "@nestjs/testing";
import Redis from "ioredis";
import { SimpleRedlockModule } from "./redlock.module";
import { SimpleRedlockService } from "./redlock.service";

describe("RedlockModule", () => {
  let client: Redis;

  beforeEach(async () => {
    client = new Redis({ host: "localhost", db: 1 });
    await client.flushdb();
  });

  describe("register", () => {
    it("should compile", async () => {
      const app = await Test.createTestingModule({
        imports: [
          SimpleRedlockModule.register({
            client,
          }),
        ],
      }).compile();
      expect(app).toBeDefined();
      expect(app.get(SimpleRedlockService)).toBeDefined();
      await app.close();
    });
  });

  describe("registerAsync", () => {
    it("should compile", async () => {
      const app = await Test.createTestingModule({
        imports: [
          SimpleRedlockModule.registerAsync({
            useFactory: () => ({
              client,
            }),
          }),
        ],
      }).compile();
      expect(app).toBeDefined();
      expect(app.get(SimpleRedlockService)).toBeDefined();
      await app.close();
    });
  });
});
