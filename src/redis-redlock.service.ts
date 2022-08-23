import { Inject, Injectable } from "@nestjs/common";
import Redlock from "redlock";
import { RedisRedlockModuleOptions } from "./redis-redlock.interface";
import { MODULE_OPTIONS_TOKEN } from "./redis-redlock.module-definition";

@Injectable()
export class RedisRedlockService extends Redlock {
  constructor(@Inject(MODULE_OPTIONS_TOKEN) public readonly options: RedisRedlockModuleOptions) {
    super(options.clients, options.settings, options.scripts);
  }
}
