import { Inject } from "@nestjs/common";
import { RedlockAbortSignal, Settings } from "@sesamecare-oss/redlock";
import { DEFAULT_DURATION } from "./redlock.constants";
import { RedlockKeyFunction } from "./redlock.interface";
import { RedlockService } from "./redlock.service";

export function Redlock<T extends (...args: any) => any = (...args: any) => any>(
  key: string | string[] | RedlockKeyFunction<T>,
  duration?: number,
  settings: Partial<Settings> = {},
): MethodDecorator {
  const injectRedlockService = Inject(RedlockService);

  return (target: object, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<any>) => {
    const serviceSymbol = "@redlockService";

    injectRedlockService(target, serviceSymbol);

    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      const descriptorThis = this;
      const redlockService = (descriptorThis as any)[serviceSymbol] as RedlockService;

      if (redlockService?.options?.decoratorEnabled !== undefined && !redlockService.options.decoratorEnabled) {
        return await originalMethod.apply(descriptorThis, args);
      }

      const keys = getKeys(key, descriptorThis, args);
      const useDuration = duration || redlockService.options?.duration || DEFAULT_DURATION;

      await redlockService.options?.decoratorHooks?.preLockKeys?.({ keys, duration: useDuration });
      const startTime = Date.now();
      return await redlockService
        .using(keys, useDuration, settings, async (signal: RedlockAbortSignal) => {
          if (signal.aborted) {
            throw signal.error;
          }

          await redlockService.options?.decoratorHooks?.lockedKeys?.({
            keys,
            duration: useDuration,
            elapsedTime: Date.now() - startTime,
          });

          const result = await originalMethod.apply(descriptorThis, args);

          return result;
        })
        .finally(async () => {
          await redlockService.options?.decoratorHooks?.unlockedKeys?.({
            keys,
            duration: useDuration,
            elapsedTime: Date.now() - startTime,
          });
        });
    };
    return descriptor;
  };
}

function getKeys(
  key: string | string[] | RedlockKeyFunction,
  descriptorThis: TypedPropertyDescriptor<any>,
  args: any[],
): string[] {
  const keys = new Set<string>();
  if (typeof key === "string") {
    keys.add(key);
  } else if (Array.isArray(key)) {
    key.forEach((k) => keys.add(k));
  } else if (typeof key === "function") {
    [key(descriptorThis, ...args)].flat().forEach((k) => keys.add(k));
  }
  return Array.from(keys);
}
