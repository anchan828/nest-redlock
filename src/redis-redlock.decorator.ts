import { Inject } from "@nestjs/common";
import { RedlockAbortSignal, Settings } from "redlock";
import { GenerateResourceFunc } from "./redis-redlock.interface";
import { RedisRedlockService } from "./redis-redlock.service";

export function RedisRedlock(
  resource: string | string[] | GenerateResourceFunc,
  duration?: number,
  settings: Partial<Settings> = {},
): MethodDecorator {
  const injectRedisRedlockService = Inject(RedisRedlockService);

  return (target: Object, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<any>) => {
    const serviceSymbol = "@redisRedlockService";

    injectRedisRedlockService(target, serviceSymbol);

    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      const descriptorThis = this;
      const redisRedlockService = (descriptorThis as any)[serviceSymbol] as RedisRedlockService;

      const resources = getResources(resource, descriptorThis, args);

      return await redisRedlockService.using(
        resources,
        duration || redisRedlockService.options?.duration || 5000,
        settings,
        async (signal: RedlockAbortSignal) => {
          const result = await originalMethod.apply(descriptorThis, args);

          if (signal.aborted) {
            throw signal.error;
          }

          return result;
        },
      );
    };
    return descriptor;
  };
}

function getResources(
  resource: string | string[] | GenerateResourceFunc,
  descriptorThis: TypedPropertyDescriptor<any>,
  args: any[],
): string[] {
  if (typeof resource === "string") {
    return [resource];
  } else if (Array.isArray(resource)) {
    return resource;
  } else if (typeof resource === "function") {
    return [resource(descriptorThis, ...args)].flat();
  }

  return [];
}
