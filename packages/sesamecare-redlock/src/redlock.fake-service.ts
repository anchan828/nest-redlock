/* eslint-disable @typescript-eslint/no-unused-vars */
import { ExecutionResult, Lock, RedlockAbortSignal, Settings } from "@sesamecare-oss/redlock";
import { EventEmitter } from "events";

export class FakeRedlockService extends EventEmitter {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public async quit(): Promise<void> {}

  public async acquire(keys: string[], duration: number, settings?: Partial<Settings> | undefined): Promise<Lock> {
    return createLockFake();
  }

  public async release(lock: Lock, settings?: Partial<Settings> | undefined): Promise<ExecutionResult> {
    return { attempts: [], start: Date.now() };
  }

  public async extend(existing: Lock, duration: number, settings?: Partial<Settings> | undefined): Promise<Lock> {
    return createLockFake();
  }

  public async using<T>(
    keys: string[],
    duration: number,
    settings: Partial<Settings>,
    routine?: ((signal: RedlockAbortSignal) => Promise<T>) | undefined,
  ): Promise<T>;

  public async using<T>(
    keys: string[],
    duration: number,
    routine: (signal: RedlockAbortSignal) => Promise<T>,
  ): Promise<T>;

  public async using<T = any>(
    keys: unknown,
    duration: unknown,
    settingsOrRoutine: unknown,
    routine?: (signal: RedlockAbortSignal) => Promise<T>,
  ): Promise<any> {
    const routineFunc = typeof settingsOrRoutine === "function" ? settingsOrRoutine : routine;
    return await routineFunc?.({ aborted: false } as RedlockAbortSignal);
  }
}

function createLockFake(): Lock {
  let lock: Lock;

  // eslint-disable-next-line prefer-const
  lock = {
    release: async (): Promise<ExecutionResult> => ({ attempts: [], start: Date.now() }),
    extend: async (duration: number): Promise<Lock> => lock,
  } as Lock;

  return lock;
}
