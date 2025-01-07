import { ContextSide, ContextStorage, ContextsProvider, IReviveContext, IStorageRef, createContextStorageRef } from ".";

export function chunk<T>(arr: T[] = [], size = 1): T[][] {
  if (Array.isArray(arr) && arr.length)
    return [arr.slice(0, size)].concat(chunk(arr.slice(size), size));

  return [];
}

export function assertExists<T>(elem: T): T {
  if (elem !== undefined)
    return elem;

  throw new ReferenceError("Assertion Failed: This element doesn't exist.");
}

export declare type Hook<T> = () => T;

export function debug<T>(t: T): T {
  debugger;

  return console.log(t), t;
}

export function catchErrors<T>(cb: Hook<T>, msg: string = "Execution failed"): T {
  try {
    return cb();
  } catch (e) {
    throw new EvalError(msg);
  }
}

export declare type PartialContext = Partial<Omit<IReviveContext, "init" | "getRegistrationKey"> & {
  /**
   * Initialize the context with the provider.
   */
  init(provider: ContextsProvider, side: ContextSide): void;
}>;

export declare type PlainContext<T extends PartialContext> = (storage: IStorageRef) => T;

export function createPlainContext<T extends PartialContext>(registrationKey: string, contextData: PlainContext<T>): Omit<T, "init"> & IReviveContext {
  const storageRef = createContextStorageRef();
  const data = contextData(storageRef);

  const init = (provider: ContextsProvider, storage: ContextStorage, side: ContextSide) => {
    storageRef(storage);

    data.init?.(provider, side);
  };

  return Object.assign(
    { reset() { } },
    data,
    {
      init,
      getRegistrationKey: () => registrationKey
    }
  );
}
