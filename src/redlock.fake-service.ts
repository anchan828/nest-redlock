/* eslint-disable @typescript-eslint/no-unused-vars */
import { EventEmitter } from "events";
import { ExecutionResult, Lock, RedlockAbortSignal, Settings } from "redlock";

export class FakeRedlockService extends EventEmitter {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public async quit(): Promise<void> {}

  public async acquire(resources: string[], duration: number, settings?: Partial<Settings> | undefined): Promise<Lock> {
    return createLockFake();
  }

  public async release(lock: Lock, settings?: Partial<Settings> | undefined): Promise<ExecutionResult> {
    return { attempts: [] };
  }

  public async extend(existing: Lock, duration: number, settings?: Partial<Settings> | undefined): Promise<Lock> {
    return createLockFake();
  }

  public async using<T>(
    resources: string[],
    duration: number,
    settings: Partial<Settings>,
    routine?: ((signal: RedlockAbortSignal) => Promise<T>) | undefined,
  ): Promise<T>;

  public async using<T>(
    resources: string[],
    duration: number,
    routine: (signal: RedlockAbortSignal) => Promise<T>,
  ): Promise<T>;

  public async using<T = any>(
    resources: unknown,
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
    release: async (): Promise<ExecutionResult> => ({ attempts: [] }),
    extend: async (duration: number): Promise<Lock> => lock,
  } as Lock;

  return lock;
}
