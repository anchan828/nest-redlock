import { Inject, Module, OnApplicationShutdown } from "@nestjs/common";
import { SimpleRedlockModuleOptions } from "./redlock.interface";
import { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } from "./redlock.module-definition";
import { SimpleRedlockService } from "./redlock.service";

@Module({
  providers: [
    {
      provide: SimpleRedlockService,
      inject: [MODULE_OPTIONS_TOKEN],
      useFactory: (options: SimpleRedlockModuleOptions) => new SimpleRedlockService(options),
    },
  ],
  exports: [SimpleRedlockService],
})
export class SimpleRedlockModule extends ConfigurableModuleClass implements OnApplicationShutdown {
  constructor(@Inject(MODULE_OPTIONS_TOKEN) private readonly options: SimpleRedlockModuleOptions) {
    super();
  }

  public async onApplicationShutdown(): Promise<void> {
    switch (this.options.client.status) {
      case "end":
        break;
      case "ready":
        await this.options.client.quit();
        break;
      default:
        this.options.client.disconnect();
        break;
    }
  }
}
