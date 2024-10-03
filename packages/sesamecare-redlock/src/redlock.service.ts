import { Inject, Injectable } from "@nestjs/common";
import { Redlock } from "@sesamecare-oss/redlock";
import { RedlockModuleOptions } from "./redlock.interface";
import { MODULE_OPTIONS_TOKEN } from "./redlock.module-definition";

@Injectable()
export class RedlockService extends Redlock {
  constructor(@Inject(MODULE_OPTIONS_TOKEN) public readonly options: RedlockModuleOptions) {
    super(options.clients, options.settings);
  }
}
