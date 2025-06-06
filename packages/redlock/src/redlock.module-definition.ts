import { ConfigurableModuleBuilder } from "@nestjs/common";
import { RedlockModuleOptions } from "./redlock.interface";

export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } = new ConfigurableModuleBuilder<RedlockModuleOptions>()
  .setExtras(
    {
      /**
       * Indicates whether the Module instance should be global.
       * @default false
       */
      isGlobal: false,
    },
    (definition, extras) => ({
      ...definition,
      global: extras.isGlobal,
    }),
  )
  .build();
