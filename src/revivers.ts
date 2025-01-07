import { ContextsProvider, Reviver } from ".";
import { IReviver, TypedArray, TYPED_ARRAYS } from "./types";
import { chunk } from "./utils";

export interface IDefaultReviver {
  keyName: string;
}

/**
 * Built-in reviver for the BigInt type.
 * 
 * @example const plain = plainify(3n); // No need to provide reviver. 
 * console.log(plain); // [ "bigint", "3" ]
 * 
 * const int = revive(plain); // No need to provide reviver.
 * console.log(int); // 3n
 */
export class BigIntReviver implements IReviver<bigint, [string]>, IDefaultReviver {
  public constructor(
    /**
     * The key used for stringifing/parsing. Must be unique.
     */
    public keyName: string = "bigint"
  ) { }

  public canApplyTo(element: any): element is bigint {
    return typeof element == 'bigint';
  }

  public getId(): string {
    return this.keyName;
  }

  public getArguments(element: bigint): [string] {
    return [element.toString()];
  }

  public revive(args: [string]): bigint {
    return BigInt(args[0]);
  }
}

/**
 * Built-in reviver for the Symbol type.
 * 
 * @example const plain = plainify(Symbol.asyncIterator); // No need to provide reviver. 
 * console.log(plain); // [ "symbol", "Symbol.asyncIterator" ]
 * 
 * const int = revive(plain); // No need to provide reviver.
 * console.log(int); // Symbol(Symbol.asyncIterator)
 */
export class SymbolReviver implements IReviver<symbol, [string]>, IDefaultReviver {
  public constructor(
    /**
     * The key used for stringifing/parsing. Must be unique.
     */
    public keyName: string = "symbol"
  ) { }

  public canApplyTo(element: any): element is symbol {
    return typeof element == 'symbol';
  }

  public getId(): string {
    return this.keyName;
  }

  public getArguments(element: Symbol): [string] {
    return [element.description];
  }

  public revive(args: [string]): symbol {
    return Symbol.for(args[0]);
  }
}

/**
 * Built-in reviver for the Date type.
 * 
 * @example const plain = plainify(new Date("01/01/2020")); // No need to provide reviver. 
 * console.log(plain); // [ "date", 1577833200000 ]
 * 
 * const int = revive(plain); // No need to provide reviver.
 * console.log(int); // Date(Wed Jan 01 2020 00:00:00 GMT+0100 (Central European Standard Time))
 */
export class DateReviver implements IReviver<Date, [number]>, IDefaultReviver {
  public constructor(
    /**
     * The key used for stringifing/parsing. Must be unique.
     */
    public keyName: string = "date"
  ) { }

  public canApplyTo(element: any): element is Date {
    return element instanceof Date;
  }

  public getId(): string {
    return this.keyName;
  }

  public getArguments(element: Date): [number] {
    return [element.valueOf()];
  }

  public revive(args: [number]): Date {
    return new Date(args[0]);
  }
}

/**
 * Built-in reviver for the URL type.
 * 
 * @example const plain = plainify(new URL("/test", "https://example.com/")); // No need to provide reviver. 
 * console.log(plain); // [ "url", "https://example.com/test" ]
 * 
 * const int = revive(plain); // No need to provide reviver.
 * console.log(int); // URL "https://example.com/test"
 */
export class URLReviver implements IReviver<URL, [string]>, IDefaultReviver {
  public constructor(
    /**
     * The key used for stringifing/parsing. Must be unique.
     */
    public keyName: string = "url"
  ) { }

  public canApplyTo(element: any): element is URL {
    return element instanceof URL;
  }

  public getId(): string {
    return this.keyName;
  }

  public getArguments(element: URL): [string] {
    return [element.href];
  }

  public revive(args: [string]): URL {
    return new URL(args[0]);
  }
}

/**
 * Built-in reviver for all typed arrays (`Int8Array`...)
 * 
 * @example const plain = plainify(new Int16Array([21, 31])); // No need to provide reviver. 
 * console.log(plain); // [ "typedarray", "i16", 21, 31 ]
 * 
 * const int = revive(plain); // No need to provide reviver.
 * console.log(int); // Int16Array(2) [ 21, 31 ]
 */
export class TypedArrayReviver implements IReviver<TypedArray, [string, ...(number | bigint | string)[]]>, IDefaultReviver {
  public constructor(
    /**
     * The key used for stringifing/parsing. Must be unique.
     */
    public keyName: string = "typedarray"
  ) { }

  public canApplyTo(element: any): element is TypedArray {
    for (const array of Object.values(TYPED_ARRAYS))
      if (element instanceof array)
        return true;

    return false;
  }

  public getId(): string {
    return this.keyName;
  }

  public getArguments(element: TypedArray): [string, ...(number | bigint | string)[]] {
    const key = Object.entries(TYPED_ARRAYS).find(([, value]) => element instanceof value)[0];
    let values: (bigint | number | string)[] = [...element.values()];

    if (element instanceof BigInt64Array || element instanceof BigUint64Array)
      values = values.map(x => x.toString());

    return [key, ...values];
  }

  public revive(args: [string, ...(number | bigint | string)[]]): TypedArray {
    const constructor = TYPED_ARRAYS[args[0]];
    let [, ...values] = args;

    if (['u64', 'i64'].includes(args[0]))
      values = values.map(x => BigInt(x));

    return new constructor(values);
  }
}

/**
 * Built-in reviver for the Array type.
 * 
 * @example const plain = plainify([1, "2", Symbol.for("3")]); // No need to provide reviver. 
 * console.log(plain); // [ "array", 1, "2", [ "symbol", "3" ] ]
 * 
 * const int = revive(plain); // No need to provide reviver.
 * console.log(int); // [1, "2", Symbol(3)]
 */
export class ArrayReviver<T> implements IReviver<T[], T[]>, IDefaultReviver {
  public constructor(
    /**
     * The key used for stringifing/parsing. Must be unique.
     */
    public keyName: string = "array"
  ) { }

  public canApplyTo(element: any): element is T[] {
    return Array.isArray(element);
  }

  public getId(): string {
    return this.keyName;
  }

  public getArguments(element: T[]): T[] {
    return element;
  }

  public revive(args: T[]): T[] {
    return args;
  }
}

/**
 * Built-in reviver for the Set type.
 * 
 * @example const plain = plainify(new Set([1, 2, 3])); // No need to provide reviver. 
 * console.log(plain); // [ "set", 1, 2, 3 ]
 * 
 * const int = revive(plain); // No need to provide reviver.
 * console.log(int); // Set(3) { 1, 2, 3 }
 */
export class SetReviver<T> implements IReviver<Set<T>, T[]>, IDefaultReviver {
  public constructor(
    /**
     * The key used for stringifing/parsing. Must be unique.
     */
    public keyName: string = "set"
  ) { }

  public canApplyTo(element: any): element is Set<T> {
    return element instanceof Set;
  }

  public getId(): string {
    return this.keyName;
  }

  public getArguments(element: Set<T>): T[] {
    return [...element];
  }

  public revive(args: T[]): Set<T> {
    return new Set(args);
  }
}

/**
 * Built-in reviver for the RegExp type.
 * 
 * @example const plainify = plainify(/^abc*$/gi); // No need to provide reviver. 
 * console.log(plainify); // [ "regex", "^abc*$", "gi" ]
 * 
 * const int = revive(plainify); // No need to provide reviver.
 * console.log(int); // /^abc*$/gi
 */
export class RegExpReviver implements IReviver<RegExp, [string, string]>, IDefaultReviver {
  public constructor(
    /**
     * The key used for stringifing/parsing. Must be unique.
     */
    public keyName: string = "regex"
  ) { }

  public canApplyTo(element: any): element is RegExp {
    return element instanceof RegExp;
  }

  public getId(): string {
    return this.keyName;
  }

  public getArguments(element: RegExp): [string, string] {
    return [element.source, element.flags];
  }

  public revive(args: [string, string]): RegExp {
    return new RegExp(args[0], args[1]);
  }
}

/**
 * Built-in reviver all unknown/plain objects.
 * 
 * **Note**: plainify all objects (`typeof x == 'object'`), even if a reviver is made for that object.
 * 
 * @example const plain = plainify({ foo: "bar", a: 3 }); // No need to provide reviver. 
 * console.log(plain); // [ "object", "foo", "bar", "a", 3]
 * 
 * const int = revive(plain); // No need to provide reviver.
 * console.log(int); // { foo: "bar", a: 3 }
 */
export class RawObjectReviver<O extends object> implements IReviver<O, any[]>, IDefaultReviver {
  public constructor(
    /**
     * The key used for stringifing/parsing. Must be unique.
     */
    public keyName: string = "object"
  ) { }

  public canApplyTo(element: any): element is O {
    return typeof element == "object";
  }

  public getId(): string {
    return this.keyName;
  }

  public getArguments(element: O): any[] {
    return Object.entries(element).flat();
  }

  public revive(args: any[]): O {
    return Object.fromEntries(chunk(args, 2));
  }
}

export declare type Jsonable = { toJSON(): any };

/**
 * Built-in reviver all unknown/plain objects that can be serialized with `.toJSON()`.
 * 
 * **NB**: This reviver can only plainify, it cannot correctly revive given entities.
 * 
 * **Note**: This reviver is not provided by default, you need to add it to the list.
 * 
 * @example const plain = plainify({ foo: "bar", a: 3, toJSON() { return "foo" } });
 * console.log(plain); // ["json","foo"]
 * 
 * const int = revive(plain);
 * console.log(int); // "foo"
 * // As we can see, the toJSON reviver always returns the results of toJSON on revive side.
 * // Reviver losses informations: avoid use in production.
 */
export class ToJsonReviver implements IReviver<Jsonable, any[]>, IDefaultReviver {
  public constructor(
    /**
     * The key used for stringifing/parsing. Must be unique.
     */
    public keyName: string = "json"
  ) { }

  public canApplyTo(element: any): boolean | object {
    return typeof element == "object" && "toJSON" in element && typeof element.toJSON == "function";
  }

  public getId(): string {
    return this.keyName;
  }

  public getArguments(element: Jsonable, contexts: ContextsProvider, reviver: Reviver<any>): any[] {
    return [element.toJSON()];
  }

  public revive(args: any[], contexts: ContextsProvider, reviver: Reviver<any>): Jsonable {
    return args[0];
  }

}
