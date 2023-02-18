import { Inject } from "@nestjs/common";
import { SimpleRedlockAbortSignal, SimpleRedlockKeyFunction, SimpleRedlockSettings } from "./redlock.interface";
import { SimpleRedlockService } from "./redlock.service";

export function SimpleRedlock<T extends (...args: any) => any = (...args: any) => any>(
  key: string | string[] | SimpleRedlockKeyFunction<T>,
  settings: Partial<SimpleRedlockSettings> = {},
): MethodDecorator {
  const injectSimpleRedlockService = Inject(SimpleRedlockService);

  return (target: Object, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<any>) => {
    const serviceSymbol = "@simpleRedlockService";

    injectSimpleRedlockService(target, serviceSymbol);

    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      const descriptorThis = this;
      const redlockService = (descriptorThis as any)[serviceSymbol] as SimpleRedlockService;

      if (redlockService?.options?.decoratorEnabled !== undefined && !redlockService.options.decoratorEnabled) {
        return await originalMethod.apply(descriptorThis, args);
      }

      const keys = getKeys(key, descriptorThis, args);

      return await redlockService.using(keys, settings, async (signal: SimpleRedlockAbortSignal) => {
        if (signal.aborted) {
          throw signal.error;
        }

        return await originalMethod.apply(descriptorThis, args);
      });
    };
    return descriptor;
  };
}

function getKeys(
  key: string | string[] | SimpleRedlockKeyFunction,
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
