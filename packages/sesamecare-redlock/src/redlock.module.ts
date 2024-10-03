import { Inject, Module, OnApplicationShutdown } from "@nestjs/common";
import { RedlockModuleOptions } from "./redlock.interface";
import { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } from "./redlock.module-definition";
import { RedlockService } from "./redlock.service";

@Module({
  providers: [
    {
      provide: RedlockService,
      inject: [MODULE_OPTIONS_TOKEN],
      useFactory: (options: RedlockModuleOptions) => new RedlockService(options),
    },
  ],
  exports: [RedlockService],
})
export class RedlockModule extends ConfigurableModuleClass implements OnApplicationShutdown {
  constructor(@Inject(MODULE_OPTIONS_TOKEN) private readonly options: RedlockModuleOptions) {
    super();
  }

  public async onApplicationShutdown(): Promise<void> {
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
