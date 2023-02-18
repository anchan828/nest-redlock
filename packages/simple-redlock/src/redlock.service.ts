import { Inject, Injectable } from "@nestjs/common";
import { createHash, randomUUID } from "crypto";
import { RedisValue } from "ioredis";
import { setTimeout } from "timers/promises";
import { DEFAULT_SETTINGS, SCRIPTS } from "./redlock.constants";
import { SimpleRedlockAbortSignal, SimpleRedlockModuleOptions, SimpleRedlockSettings } from "./redlock.interface";
import { MODULE_OPTIONS_TOKEN } from "./redlock.module-definition";

@Injectable()
export class SimpleRedlockService {
  private readonly scripts: { acquire: { script: string; hash: string }; release: { script: string; hash: string } };

  constructor(@Inject(MODULE_OPTIONS_TOKEN) public readonly options: SimpleRedlockModuleOptions) {
    this.scripts = {
      acquire: {
        script: SCRIPTS.ACQUIRE,
        hash: createHash("sha1").update(SCRIPTS.ACQUIRE).digest("hex"),
      },
      release: {
        script: SCRIPTS.RELEASE,
        hash: createHash("sha1").update(SCRIPTS.RELEASE).digest("hex"),
      },
    };
  }

  public async using<T>(keys: string[], routine: (signal: SimpleRedlockAbortSignal) => Promise<T>): Promise<T>;

  public async using<T>(
    keys: string[],
    settings: Partial<SimpleRedlockSettings>,
    routine: (signal: SimpleRedlockAbortSignal) => Promise<T>,
  ): Promise<T>;

  public async using<T>(
    keys: string[],
    settingsOrRoutine: Partial<SimpleRedlockSettings> | ((signal: SimpleRedlockAbortSignal) => Promise<T>),
    routine?: (signal: SimpleRedlockAbortSignal) => Promise<T>,
  ): Promise<T> {
    let retryTimes = 0;
    const startTime = Date.now();
    const id = randomUUID();

    const settings: Partial<SimpleRedlockSettings> = typeof settingsOrRoutine === "function" ? {} : settingsOrRoutine;

    const fullSettings: SimpleRedlockSettings = {
      duration: DEFAULT_SETTINGS.DURATION,
      expire: DEFAULT_SETTINGS.EXPIRE,
      retryCount: DEFAULT_SETTINGS.RETRY_COUNT,
      retryDelay: DEFAULT_SETTINGS.RETRY_DELAY,
      retryJitter: DEFAULT_SETTINGS.RETRY_JITTER,
      ...this.options.settings,
      ...settings,
    };

    const controller = new AbortController();
    const signal = controller.signal as SimpleRedlockAbortSignal;
    try {
      await this.options?.decoratorHooks?.preLockKeys?.({
        keys,
        settings: fullSettings,
      });

      while (true) {
        if (fullSettings.duration < Date.now() - startTime) {
          throw new Error(`Duration time exceeded.`);
        }

        const locked = await this.tryLock(keys, id, fullSettings);

        if (locked) {
          await this.options?.decoratorHooks?.lockedKeys?.({
            keys,
            settings: fullSettings,
            elapsedTime: Date.now() - startTime,
          });
          break;
        } else {
          await setTimeout(fullSettings.retryDelay + Math.floor(Math.random() * (fullSettings.retryJitter + 1)));

          if (retryTimes >= fullSettings.retryCount) {
            throw new Error(`Maximum number of retries has been exceeded.`);
          }

          retryTimes++;
        }
      }
    } catch (error: unknown) {
      signal.error = error instanceof Error ? error : new Error(`${error}`);
      controller.abort();
    }

    const fn = typeof settingsOrRoutine === "function" ? settingsOrRoutine : routine || this.dummyRoutine;

    return fn(signal).finally(async () => {
      await this.unlock(keys, id);
      await this.options?.decoratorHooks?.unlockedKeys?.({
        keys,
        settings: fullSettings,
        elapsedTime: Date.now() - startTime,
      });
    });
  }

  /**
   * Returns true if the lock is successful
   *
   * @memberof SimpleRedlockService
   */
  private async tryLock(keys: string[], id: string, settings: SimpleRedlockSettings): Promise<boolean> {
    if (keys.length === 0) {
      return true;
    }

    const args: Array<RedisValue> = [...keys, id, settings.expire];
    let result = 0;
    try {
      result = (await this.options.client.evalsha(this.scripts.acquire.hash, keys.length, args as any)) as number;
    } catch {
      await this.options.client.script("LOAD", this.scripts.acquire.script);
      result = (await this.options.client.eval(this.scripts.acquire.script, keys.length, args as any)) as number;
    }
    return result !== 0;
  }

  private async unlock(keys: string[], id: string): Promise<void> {
    if (keys.length === 0) {
      return;
    }

    const args: Array<RedisValue> = [...keys, id];
    try {
      await this.options.client.evalsha(this.scripts.release.hash, keys.length, args as any);
    } catch {
      await this.options.client.script("LOAD", this.scripts.release.script);
      await this.options.client.eval(this.scripts.release.script, keys.length, args as any);
    }
  }

  private dummyRoutine<T>(): Promise<T> {
    return Promise.resolve() as any;
  }
}
