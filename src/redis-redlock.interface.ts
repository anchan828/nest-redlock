import Redis, { Cluster } from "ioredis";
import { Settings } from "redlock";

export type RedisRedlockModuleOptions = {
  clients: Iterable<Redis | Cluster>;
  settings?: Partial<Settings>;
  scripts?: {
    readonly acquireScript?: string | ((script: string) => string);
    readonly extendScript?: string | ((script: string) => string);
    readonly releaseScript?: string | ((script: string) => string);
  };

  /**
   * Default duratiuon to use with RedisRedlock decorator
   *
   * @type {number}
   */
  duration?: number;
};

export type GenerateResourceFunc = (target: any, ...args: any[]) => string | string[];
