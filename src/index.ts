import { ContextStorageReviver, ContextsProvider, ContextsWrapperReviver } from "./contexts";
import { CircularContext } from "./contexts/circulars";
import { JsonDataProvider } from "./lang/json";
import { productionKey, isProduction, cached } from "./production";
import { IAbstractData, IDataProvider } from "./provider";
import { ArrayReviver, BigIntReviver, DateReviver, IDefaultReviver, RawObjectReviver, RegExpReviver, SetReviver, SymbolReviver, TypedArrayReviver, URLReviver } from "./revivers";
import { IReviver, TYPED_ARRAYS } from "./types";

export * as contexts from "./contexts/index";
export * as providers from "./lang/index";

export * from "./types";
export * from "./revivers";
export * from "./production";
export * from "./contexts";
export * from "./provider";
export * from "./utils";

/**
 * This contains all default revivers used.
 * 
 * Avoid adding revivers here, otherwise revivers must be added before instance a `Reviver`.
 */
export const DEFAULT_REVIVERS: (IReviver<any> & IDefaultReviver)[] = [
  new BigIntReviver(),
  new SymbolReviver(),
  new DateReviver(),
  new URLReviver(),
  new TypedArrayReviver(),
  new ArrayReviver(),
  new SetReviver(),
  new RegExpReviver(),
  new RawObjectReviver()
];

/**
 * Production env changes
 * 
 * Running in production changes ids of things, in order to reduce sizes.
 */
if (isProduction()) {
  const reviversKeys = productionKey();
  DEFAULT_REVIVERS.forEach(x => x.keyName = reviversKeys());

  const typedArrayKeys = productionKey();
  for (let entry of Object.entries(TYPED_ARRAYS)) {
    TYPED_ARRAYS[typedArrayKeys(false)] = entry[1];
    delete TYPED_ARRAYS[entry[0]];
  }

  ContextStorageReviver.prototype.getId = cached(reviversKeys());
  ContextsWrapperReviver.prototype.getId = cached(reviversKeys());

  CircularContext.KEY = "0";
}

/**
 * The context wrapper object identifier.
 */
export type ContextWrapper<T> = {
  [Reviver.CONTEXT_WRAP_KEY]: string;
  value: T;
}

/**
 * `Reviver` can stringify entire class and regenerate then with a reviver.
 */
export class Reviver<D = string> {
  private allRevivers: IReviver<any>[];

  /**
   * This key convert an object to an global context wrapper.
   * 
   * This key is used by `ContextsWrapperReviver` natively.
   * 
   * @example [Reviver.CONTEXT_WRAP_KEY]: "hello-world-context"
   */
  public static readonly CONTEXT_WRAP_KEY: unique symbol = Symbol.for("reviver.context.wrapper");
  /**
   * This key make the object ignored by `plainify()` or `revive()` (less used).
   * 
   * @example [Reviver.IGNORE]: true
   */
  public static readonly IGNORE: unique symbol = Symbol.for("reviver.ignore");

  /**
   * Can only be used in `getArguments` or `beforeRevive` (less used).
   * 
   * Make the object ignored by `plainify` and `revive`. May sure the object to be
   * parsable before.
   * 
   * Should only be used by special objects, like contexts wrappers.
   */
  public static raw<T>(value: T): T {
    return Object.assign(value, { [Reviver.IGNORE]: true });
  }

  /**
   * `Reviver` can stringify entire class and regenerate then with a reviver.
   * 
   * You can pass customs revivers if you need to stringify custom objects.
   * 
   * @example export class CustomReviver implements IReviver<{ foo: string }, [string]> {
   * public canApplyTo(element: any): element is { foo: string } {
   *   return typeof element.foo == "string";
   * }
   * public getId(): string {
   *     return "foo-bar";
   * }
   * public getArguments(element: { foo: string }): [string] {
   *     return [element.foo];
   * }
   * public revive(args: [string]): { foo: string } {
   *     return { foo: args[0] };
   * }
   * }
   * 
   * const json = new Reviver([ new CustomReviver() ], new JsonDataProvider());
   * 
   * const str = json.stringify({ foo: 'bar' }); // -> '["foo-bar","bar"]'
   * 
   * const obj = json.parse(str); // -> { foo: 'bar' }
   */
  public constructor(
    /**
     * Read-only property.
     * 
     * **Note**: Custom revivers can override default revivers.
     */
    public readonly revivers?: IReviver<any, any[]>[],
    /**
     * Set the provider of the reviver. Output strings or buffer and parser will use this provider.
     * 
     * @default new JsonDataProvider()
     */
    public readonly provider?: IDataProvider<D>
  ) {
    this.allRevivers = [...revivers ?? [], ...DEFAULT_REVIVERS];
    this.provider ??= new JsonDataProvider() as any;
  }

  /**
   * Convert entity into abstract data (provider) using given revivers.
   * 
   * Can be parsed using all same revivers.
   * 
   * @example stringify({ foo: "bar" }); // -> '["object","foo","bar"]'
   */
  public stringify<T = any>(obj: T): D {
    return this.provider.stringify(this.plainify(obj));
  }

  /**
   * Convert entity into JSON-like value using given revivers.
   * 
   * @example plainify([1, "2", 3n]); // -> [ "array", 1, "2", [ "bigint", "3" ] ]
   */
  public plainify<T = any, R extends IAbstractData = IAbstractData>(obj: T, contexts?: ContextsProvider): R {
    if (!contexts) contexts = new ContextsProvider(this);

    if (obj == null || typeof obj == 'undefined')
      return null;

    if (typeof obj == 'boolean' || typeof obj == 'string' || typeof obj == 'number')
      return obj as any;

    if (obj[Reviver.IGNORE] === true) {
      delete obj[Reviver.IGNORE];

      return obj as any;
    }

    for (const reviver of this.allRevivers) {
      const can = reviver.canApplyTo(obj);

      if (typeof can != "boolean")
        return this.plainify(can);

      if (can) {
        const args = reviver.getArguments(obj as never, contexts, this);

        return [reviver.getId(), ...args.map(x => this.plainify(x, contexts))] as any;
      }
    }

    throw Object.assign(new ReferenceError(`No reviver for "${obj}", cannot continue.`), { element: obj });
  }

  /**
   * Parse the data (using provider) and convert it into revived entity.
   * 
   * @example parse<number[]>('["array",1,2,3]'); // -> [ 1, 2, 3 ]
   */
  public async parse<T = any>(data: D): Promise<T> {
    return this.revive(await this.provider.parse(data));
  }

  /**
   * Convert the abstract object into revived entity.
   * 
   * @example revive<{ foo: string }>([ "object", "foo", "bar" ]); // -> { foo: "bar" }
   */
  public revive<T = any>(obj: IAbstractData, contexts?: ContextsProvider): T {
    if (!contexts) contexts = new ContextsProvider(this);

    if (obj == null)
      return null;

    if (['boolean', 'string', 'number'].includes(typeof obj))
      return obj as T;

    if (!Array.isArray(obj))
      throw new TypeError(`Invalid value received: execepted an array, received ${obj}`);

    if (obj[Reviver.IGNORE] === true) {
      delete obj[Reviver.IGNORE];

      return obj as T;
    }

    const [key, ...args] = obj;

    for (const reviver of this.allRevivers)
      if (reviver.getId() == key) {
        let a = reviver?.beforeRevive?.(args, contexts, this) || args;

        const newArgs = a.map(x => this.revive(x, contexts));

        return reviver.revive(newArgs as never, contexts, this);
      }

    throw new ReferenceError(`No reviver for "${key}", cannot continue.`);
  }
}
