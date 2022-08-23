import { ConfigurableModuleBuilder } from "@nestjs/common";
import { RedisRedlockModuleOptions } from "./redis-redlock.interface";

export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } =
  new ConfigurableModuleBuilder<RedisRedlockModuleOptions>().build();
