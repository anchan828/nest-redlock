/* eslint-disable @typescript-eslint/no-unused-vars */
import { EventEmitter } from "events";
import { SimpleRedlockAbortSignal, SimpleRedlockSettings } from "./redlock.interface";

export class FakeSimpleRedlockService extends EventEmitter {
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
    const fn = typeof settingsOrRoutine === "function" ? settingsOrRoutine : routine || this.dummyRoutine;
    return fn({ aborted: false } as SimpleRedlockAbortSignal) as Promise<T>;
  }

  private dummyRoutine<T>(): Promise<T> {
    return Promise.resolve() as any;
  }
}
