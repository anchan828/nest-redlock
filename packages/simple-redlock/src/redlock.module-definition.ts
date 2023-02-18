import { ConfigurableModuleBuilder } from "@nestjs/common";
import { SimpleRedlockModuleOptions } from "./redlock.interface";

export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } =
  new ConfigurableModuleBuilder<SimpleRedlockModuleOptions>().build();
