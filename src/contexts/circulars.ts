import { ContextWrapper, Reviver } from "..";
import { ContextStorage, ContextsProvider, IReviveContext, createContextStorageRef } from "../contexts";
import { IReviver } from "../types";

export type CircularWrap = { [x: symbol]: string, [x: string]: any };

/**
 * The context class that store objects to avoid objects repetitions.
 * 
 * **This context cannot detect circular structures or same objects it-self, you have to do it yourself.**
 */
export class CircularContext implements IReviveContext {
  public static KEY = "circular";

  public storage = createContextStorageRef();
  public values: [string, any][] = [];

  /**
   * Get ready the object for the context usage.
   * 
   * **This call is needed for correct use of the contexts API.**
   */
  public static wrapContext<T>(object: T): ContextWrapper<T> {
    return {
      [Reviver.CONTEXT_WRAP_KEY]: CircularContext.KEY,
      value: object
    }
  }

  public reset(): void {
  }

  public init(provider: ContextsProvider, storage: ContextStorage): void {
    this.storage(storage);

    storage.initStorage();
  }

  public getRegistrationKey(): string {
    return CircularContext.KEY;
  }

  public containsWrap(value: any, oldPath: string = "@"): false | [true, string] {
    if (typeof value != "object")
      return false;

    if (typeof value[Symbol.for(CircularContext.KEY + "_key")] != 'undefined')
      return [true, oldPath];

    for (const i in value) {
      const result = this.containsWrap(value[i], oldPath + "." + i);

      if (result != false)
        return result;
    }

    return false;
  }

  /**
   * Store value in context and replace it by a weak reference,
   * like a memory pointer.
   */
  public wrapValue(value: any): CircularWrap {
    const result = this.containsWrap(value);

    if (result != false)
      throw new RangeError("Wrapped value cannot contains other wrapper values (found at " + result[1] + ")");

    if (this.storage().hasValue(value))
      return { [Symbol.for(CircularContext.KEY + "_key")]: this.storage().getKey(value) };

    let key = this.storage().add(value);

    return { [Symbol.for(CircularContext.KEY + "_key")]: key };
  }

  public unwrapValue<T = any>(wrap: CircularWrap): T {
    if (wrap[Symbol.for(CircularContext.KEY + "_key")] == 'undefined')
      throw new TypeError("Given value is not a circular wrap");

    return this.storage().get(wrap[Symbol.for(CircularContext.KEY + "_key")]);
  }

  public getValue(key: string): any {
    if (this.storage().has(key))
      return this.storage().get(key);
  }

}

export class CircularWrapReviver implements IReviver<any, [string]> {
  public canApplyTo(element: any): element is any {
    return typeof element[Symbol.for(CircularContext.KEY + "_key")] != 'undefined';
  }

  public getId(): string {
    return CircularContext.KEY + "_wrap";
  }

  public getArguments(element: any): [string] {
    return [element[Symbol.for(CircularContext.KEY + "_key")]];
  }

  public revive(args: [string], contexts: ContextsProvider) {
    const context = contexts.useContext<CircularContext>(CircularContext.KEY);

    return context.getValue(args[0]);
  }

}
