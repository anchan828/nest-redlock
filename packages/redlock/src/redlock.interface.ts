import Redis, { Cluster } from "ioredis";
import { Settings } from "redlock";

export type PreLockedKeysHookArgs = { keys: string[]; duration: number };
export type LockedKeysHookArgs = { keys: string[]; duration: number; elapsedTime: number };
export type UnlockedKeysHookArgs = { keys: string[]; duration: number; elapsedTime: number };

export type RedlockModuleOptions = {
  clients: Iterable<Redis | Cluster>;

  /**
   * Default: true
   * Used only with @Redlock decorator.
   */
  decoratorEnabled?: boolean;

  settings?: Partial<Settings>;
  scripts?: {
    readonly acquireScript?: string | ((script: string) => string);
    readonly extendScript?: string | ((script: string) => string);
    readonly releaseScript?: string | ((script: string) => string);
  };
  /**
   * Hooks called when using @Redlock decorator.
   */
  decoratorHooks?: {
    /**
     * Called before redlock.using
     */
    readonly preLockKeys?: (args: PreLockedKeysHookArgs) => void | Promise<void>;
    /**
     * Called first when the redlock.using callback is invoked.
     */
    readonly lockedKeys?: (args: LockedKeysHookArgs) => void | Promise<void>;
    /**
     * Called after when the redlock.using callback is finished.
     */
    readonly unlockedKeys?: (args: UnlockedKeysHookArgs) => void | Promise<void>;
  };

  /**
   * Default duratiuon to use with Redlock decorator
   *
   * @type {number}
   */
  duration?: number;
};

export type RedlockKeyFunction<T extends (...args: any) => any = (...args: any) => any> = (
  target: any,
  ...args: Parameters<T>
) => string[] | string;
