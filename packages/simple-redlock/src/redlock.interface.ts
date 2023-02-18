import Redis from "ioredis";

export type PreLockedKeysHookArgs = { keys: string[]; settings: SimpleRedlockSettings };
export type LockedKeysHookArgs = { keys: string[]; settings: SimpleRedlockSettings; elapsedTime: number };
export type UnlockedKeysHookArgs = { keys: string[]; settings: SimpleRedlockSettings; elapsedTime: number };

export type SimpleRedlockAbortSignal = AbortSignal & {
  error?: Error;
};

export type SimpleRedlockSettings = {
  /**
   * Default duratiuon in milliseconds. Default is 5000
   *
   * @type {number}
   */
  duration: number;

  /**
   * Expire to the lock key in milliseconds. Default is 10000
   *
   * @type {number}
   */
  expire: number;

  /**
   * Number of times to check that the lock is disengaged. Default is Number.MAX_SAFE_INTEGER
   *
   * @type {number}
   */
  retryCount: number;

  /**
   * Delay to retry when failed in milliseconds. Default is 100.
   *
   * @type {number}
   */
  retryDelay: number;

  /**
   * Maximum time added randomly on retries in milliseconds. Default is 10.
   *
   * @type {number}
   */
  retryJitter: number;
};

export type SimpleRedlockModuleOptions = {
  client: Redis;

  /**
   * Default: true
   * Used only with @SimpleRedlock decorator.
   */
  decoratorEnabled?: boolean;

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

  settings?: Partial<SimpleRedlockSettings>;
};

export type SimpleRedlockKeyFunction<T extends (...args: any) => any = (...args: any) => any> = (
  target: any,
  ...args: Parameters<T>
) => string[] | string;
