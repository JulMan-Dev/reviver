import { ContextWrapper, Reviver } from ".";
import { IAbstractData } from "./provider";
import { IRef, IRefOwner, IReviver } from "./types";
import { assertExists, chunk } from "./utils";

export type ContextSide = "plainify" | "revive";

export interface IReviveContext {
  /**
   * Reset the context.
   * Called when the reviver needs plainify or revive, always called before initialization.
   * 
   * The context needs to switch to a neutral state.
   */
  reset(): void;
  /**
   * Initialize the context with the provider, a storage and a side.
   * 
   * The context may switch to a linked state, unique depending of the loaded contexts, the storage and the side.
   */
  init(provider: ContextsProvider, storage: ContextStorage, side: ContextSide): void;
  /**
   * The key to get or remove a context from a manager. It must be unique by design.
   */
  getRegistrationKey(): string;
}

export declare type IStorageRef = ((storage: ContextStorage) => void) & (() => ContextStorage);

/**
 * Initialize a context storage reference.
 * 
 * These references are mutables.
 * 
 * @example ```js
 * const ref = createContextStorageRef();
 * 
 * ref(storage);
 * 
 * ref().set("foo", "bar");
 * console.log(ref().get("foo")); // "bar"
 * ```
 */
export function createContextStorageRef(): IStorageRef {
  let currentStorage: ContextStorage = null;

  return (storage?: ContextStorage) => {
    if (storage)
      return void (currentStorage = storage);

    return currentStorage;
  };
}

/**
 * This context manages the storages for all other contexts.
 * 
 * This context don't use the storage API, but provides it.
 */
export class ContextsStoragesManager implements IReviveContext {
  public storages: ContextStorage[];

  public static readonly KEY = "@storages_manager";

  public constructor(public owner: IRef<ContextsWrapperReviver>) {
  }

  public reset(): void {
    this.storages = [];
  }

  public init(): void {
    this.storages = [];
  }

  public getRegistrationKey(): string {
    return ContextsStoragesManager.KEY;
  }

  public getStorage(context: IReviveContext): ContextStorage {
    return assertExists(this.storages.find(x => x.context.getRegistrationKey() == context.getRegistrationKey()));
  }

  public createStorage(context: IReviveContext): ContextStorage {
    if (this.storages.some(x => x.context.getRegistrationKey() == context.getRegistrationKey()))
      throw new ReferenceError("This context already has a storage.");

    const storage = new ContextStorage(context, this);

    return this.storages.push(storage), storage;
  }

  public reviveStorage(storage: ContextStorage, data: IAbstractData[], reviver: Reviver<any>) {
    const entries = chunk(data, 2) as [string, IAbstractData][];

    for (const [k, v] of entries)
      storage.set(k, reviver.revive(v));
  }

}

export class ContextStorage<T = any> implements Iterable<readonly [string, T]> {
  protected data: Record<string, T>;

  public constructor(
    public context: IReviveContext,
    public storageContext: ContextsStoragesManager
  ) { }

  /**
   * Init the storage.
   * 
   * This method is should always be called, even if native code calls it.
   * 
   * **Note**: This is needed for starting use storage.
   */
  public initStorage() {
    if (!this.data)
      this.data = {};
  }

  /**
   * Put some data into the storage.
   * @param key The key
   * @param data The associed value, ensure the value is correctly handled.
   */
  public set(key: string, data: T) {
    this.data[key] = data;
  }

  /**
   * Check if the provided key has a value asssocied.
   * @param key The key to check.
   * @returns `true` if the key is in use.
   */
  public has(key: string): boolean {
    return key in assertExists(this.data);
  }

  /**
   * Enumerates values and checks if a value is already stored in the storage.
   * @param value The value to check.
   * @returns `true` if the value is associed to a key.
   */
  public hasValue(value: T) {
    return Object.entries(this.data).some(x => x[1] === value);
  }

  /**
   * Get the value associed to the key.
   * @param key The data key.
   * @returns The value associed. Throws an error if not exists.
   */
  public get(key: string): T {
    return assertExists(this.data[key]);
  }

  /**
   * Get the key associed to the value.
   * @param key The value.
   * @returns The key associed. Throws an error if not exists.
   */
  public getKey(value: T) {
    return assertExists(Object.entries(this.data).find(x => x[1] === value))[0];
  }

  /**
   * This method generate a unique sized key.
   * 
   * This method doesn't use any cryptographics methods (`Math.random`).
   * 
   * @example ```js
   * generateKey() // "1qwYwiWdM8" (many more)
   * generateKey(40) // "YmoTuRu4HtPxUIsHZ6yCIxqMex23ekoLmoNbqYx2" (many more)
   * ```
   */
  public generateKey(keySize: number = 10) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    const key = () => Array.from({ length: keySize })
      .map(() => characters.charAt(Math.floor(Math.random() * characters.length)))
      .join('');

    for (var currentKey = key(); currentKey in this.data; currentKey = key()) { }

    return currentKey;
  }

  /**
   * Add value the data.
   * 
   * It's create a sized key using `generateKey` and returns it.
   */
  public add(value: T, keySize = 10) {
    const key = this.generateKey(keySize);

    return this.set(key, value), key;
  }

  /**
   * Remove a key from the storage, dropping the value associed.
   * @param key The key to remove.
   */
  public remove(key: string) {
    delete this.data[key];
  }

  /**
   * Erase the storage, as first initialization.
   */
  public clear() {
    this.data = {};
  }

  public *keys() {
    for (const k in this.data)
      yield k;
  }

  public *values() {
    for (const v of Object.values(this.data))
      yield v;
  }

  public *entries() {
    for (const k of this.keys())
      yield [k, this.data[k]] as const;
  }

  public [Symbol.iterator]() {
    return this.entries();
  }
}

/**
 * This class manages all contexts.
 */
export class ContextsProvider {
  public contexts: IReviveContext[] = [];

  public constructor(public readonly reviver: Reviver<any>) { }

  /**
   * Register new context into the manager.
   */
  public registerContext(context: IReviveContext): this {
    const key = context.getRegistrationKey();

    for (const c of this.contexts)
      if (c.getRegistrationKey() == key)
        throw new ReferenceError("Cannot register context because an other has the same registration key. Consider changing.");

    this.contexts.push(context);

    return this;
  }

  /**
   * Try getting context.
   * 
   * Throws an error if the context is not registred.
   */
  public useContext<C extends IReviveContext>(key: string): C {
    for (const c of this.contexts)
      if (c.getRegistrationKey() == key)
        return c as C

    throw new ReferenceError("This context is not registered.");
  }

  /**
   * Remove context from manager. Don't fail if not registered.
   */
  public removeContext(key: string): this {
    this.contexts = this.contexts.filter(c => c.getRegistrationKey() != key);

    return this;
  }

  /**
   * Checks if a context is registred with a registration key.
   * @param key The context's key
   * @returns `true` if a context matchs the key
   */
  public hasContext(key: string): boolean {
    return this.contexts.some(x => x.getRegistrationKey() == key);
  }
}

/**
 * The reviver is designed to plainify all storages, used in contexts API.
 * 
 * This reviver cannot revive storages.
 */
export class ContextStorageReviver implements IReviver<ContextStorage, any[]> {
  public canApplyTo(element: any): boolean | object {
    return element instanceof ContextStorage;
  }

  public getId(): string {
    return "@storage";
  }

  public getArguments(element: ContextStorage, contexts: ContextsProvider, reviver: Reviver<any>): any[] {
    return [...element.entries()].flat();
  }

  public revive(args: any[], contexts: ContextsProvider, reviver: Reviver<any>): ContextStorage {
    throw new Error("Contexts storages cannot be revived outside of a \"ContextsWrapperReviver\".");
  }

}

export class ContextsWrapperReviver<O = any> implements IReviver<ContextWrapper<O>, [O, ...string[]]>, IRefOwner<any, ContextWrapper<any>> {
  public storages: ContextsStoragesManager;

  public constructor(private ref: IRef<ContextsWrapperReviver>, private contexts: IReviveContext[], public keyName: string = "wrapper") {
    ref.set(this);

    this.storages = new ContextsStoragesManager(ref);
  }

  public attachObjectFromRef(object: any): ContextWrapper<any> {
    return {
      [Reviver.CONTEXT_WRAP_KEY]: this.getId(),
      value: object,
    }
  }

  public canApplyTo(element: any) {
    const isOk = (
      typeof element == "object" &&
      "value" in element &&
      Reviver.CONTEXT_WRAP_KEY in element &&
      typeof element[Reviver.CONTEXT_WRAP_KEY] == "string"
    );

    if (isOk && element[Reviver.CONTEXT_WRAP_KEY] == this.getId())
      return true;

    if (isOk && !this.contexts.some(x => element[Reviver.CONTEXT_WRAP_KEY] == x.getRegistrationKey())) {
      console.warn(`"ContextsWrapperReviver" detected a context wrapper that is not configured to detect: "${element[Reviver.CONTEXT_WRAP_KEY]}".`);
      console.warn("Consider adding corresponding context to the native wrapper. Ignoring this one...");
    }

    return false;
  }

  public getId(): string {
    return `@${this.keyName}`;
  }

  public getArguments(element: ContextWrapper<O>, contexts: ContextsProvider, reviver: Reviver<any>): [O, ...any[]] {
    if (!contexts.hasContext(ContextsStoragesManager.KEY))
      contexts.registerContext(this.storages);

    this.storages.reset();
    this.storages.init();

    for (const ctx of this.contexts)
      if (!contexts.hasContext(ctx.getRegistrationKey())) {
        contexts.registerContext(ctx);

        const storage = this.storages.createStorage(ctx);

        ctx.reset();
        ctx.init(contexts, storage, "plainify");
      }

    return [
      element.value,
      ...this.contexts.map(x => [
        x.getRegistrationKey(),
        this.storages.getStorage(x)
      ]).flat()
    ];
  }

  public revive([obj]: any, contexts: ContextsProvider, reviver: Reviver<any>): any {
    if (!contexts.hasContext(ContextsStoragesManager.KEY))
      contexts.registerContext(this.storages);

    return obj;
  }

  public beforeRevive([obj, ...previousKeys]: IAbstractData[], contexts: ContextsProvider, reviver: Reviver<any>): IAbstractData[] {
    if (!contexts.hasContext(ContextsStoragesManager.KEY))
      contexts.registerContext(this.storages);

    this.storages.reset();
    this.storages.init();

    for (const ctx of this.contexts) {
      const key = ctx.getRegistrationKey();

      if (!previousKeys.includes(key)) {
        console.warn(`Contexts warning: "${key}" context wasn't serialized before but provided now, ignoring...`);

        continue;
      }

      if (!contexts.hasContext(key)) {
        const storage = previousKeys[previousKeys.findIndex(x => x == key) + 1];
        const realStorage = this.storages.createStorage(ctx);

        realStorage.initStorage();

        this.storages.reviveStorage(realStorage, (storage as any[]).slice(1), reviver);

        contexts.registerContext(ctx);

        ctx.reset();
        ctx.init(contexts, realStorage, "revive");
      }
    }

    return [obj];
  }

}

/**
 * This converts seemlessly contexts into revivers, not really but needed for correct use of Contexts API (storages and more).
 * @param ref The reference to create a wrapped value.
 * @param contexts The contexts in includes. Included contexts will receive a reserved storage will be loaded.
 * @param keyName The key used to reviver the wrapper, this value cannot be modified in production.
 * @returns 
 */
export function ContextsReviver(ref: IRef<ContextsWrapperReviver>, contexts: IReviveContext[], keyName: string = "wrapper") {
  return [new ContextStorageReviver(), new ContextsWrapperReviver(ref, contexts, keyName)] as const;
};
