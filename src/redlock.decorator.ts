import { Inject } from "@nestjs/common";
import { RedlockAbortSignal, Settings } from "redlock";
import { DEFAULT_DURATION } from "./redlock.constants";
import { GenerateResourceFunc } from "./redlock.interface";
import { RedlockService } from "./redlock.service";

export function Redlock(
  resource: string | string[] | GenerateResourceFunc,
  duration?: number,
  settings: Partial<Settings> = {},
): MethodDecorator {
  const injectRedlockService = Inject(RedlockService);

  return (target: Object, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<any>) => {
    const serviceSymbol = "@redlockService";

    injectRedlockService(target, serviceSymbol);

    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      const descriptorThis = this;
      const redlockService = (descriptorThis as any)[serviceSymbol] as RedlockService;

      const resources = getResources(resource, descriptorThis, args);

      return await redlockService.using(
        resources,
        duration || redlockService.options?.duration || DEFAULT_DURATION,
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
