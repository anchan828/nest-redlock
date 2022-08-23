import { Inject, Module, OnModuleDestroy } from "@nestjs/common";
import { RedisRedlockModuleOptions } from "./redis-redlock.interface";
import { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } from "./redis-redlock.module-definition";
import { RedisRedlockService } from "./redis-redlock.service";

@Module({
  providers: [
    {
      provide: RedisRedlockService,
      inject: [MODULE_OPTIONS_TOKEN],
      useFactory: (options: RedisRedlockModuleOptions) => new RedisRedlockService(options),
    },
  ],
  exports: [RedisRedlockService],
})
export class RedisRedlockModule extends ConfigurableModuleClass implements OnModuleDestroy {
  constructor(@Inject(MODULE_OPTIONS_TOKEN) private readonly options: RedisRedlockModuleOptions) {
    super();
  }

  public async onModuleDestroy(): Promise<void> {
    for (const client of this.options.clients) {
      switch (client.status) {
        case "end":
          continue;
        case "ready":
          await client.quit();
          break;
        default:
          client.disconnect();
          break;
      }
    }
  }
}
