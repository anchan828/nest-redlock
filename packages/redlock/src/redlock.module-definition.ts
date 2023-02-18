import { ConfigurableModuleBuilder } from "@nestjs/common";
import { RedlockModuleOptions } from "./redlock.interface";

export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } =
  new ConfigurableModuleBuilder<RedlockModuleOptions>().build();
