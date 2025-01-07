import { Reviver } from ".";
import { ContextsProvider } from "./contexts";
import { IAbstractData } from "./provider";

export declare type As<T> = T | { as(): T };
export declare type NonSerializable = object & {};

export const TYPED_ARRAYS = {
  i8: Int8Array,
  u8: Uint8Array,
  u8c: Uint8ClampedArray,
  i16: Int16Array,
  u16: Uint16Array,
  i32: Int32Array,
  u32: Uint32Array,
  f32: Float32Array,
  f64: Float64Array,
  i64: BigInt64Array,
  u64: BigUint64Array
};

export declare interface IRefOwner<O, R> {
  attachObjectFromRef(object: O): R;
}

export declare type IRefOwner_T<T> = T extends IRefOwner<infer A, infer B> ? [A, B] : never;

export declare type IRef<T extends IRefOwner<any, any>, T1 extends IRefOwner_T<T> = IRefOwner_T<T>> = {
  /**
   * Apply the reference owner code to the object and returning an object.
   */
  attach(object: T1[0]): T1[1];
  /**
   * Set reference owner. Can be done only once.
   */
  set(owner: T): void;
  /**
   * Get reference owner.
   */
  get(): T;
  toString(): string;
}

/**
 * Create a new attachable ref.
 * 
 * It can be used for like, contexts wrappers.
 */
export function createAttachableRef<T extends IRefOwner<any, any>>(owner: T = null): IRef<T> {
  let currentOwner: T = owner;

  return {
    attach(object) {
      if (!currentOwner) throw new ReferenceError("Current reference doesn't have owner");

      return currentOwner.attachObjectFromRef(object);
    },

    set(owner) {
      if (currentOwner) throw new ReferenceError("Current reference already has an owner.");

      currentOwner = owner;
    },

    get() {
      return currentOwner;
    },

    toString() {
      if (currentOwner)
        return "<Ref (set)>";

      return "<Ref (unset)>";
    }
  }
}

export declare type TypedArray = Int8Array
  | Uint8Array
  | Uint8ClampedArray
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array
  | Float32Array
  | Float64Array
  | BigInt64Array
  | BigUint64Array;

export declare interface IReviver<T, A extends any[] = any[]> {
  /**
   * Check if the reviver is for the given object.
   */
  canApplyTo(element: any): boolean | NonSerializable;
  /**
   * Returns the unique reviver id, used to revive entities.
   */
  getId(): string;
  /**
   * Returns the arguments needed to revive the entity.
   */
  getArguments(element: T, contexts: ContextsProvider, reviver: Reviver<any>): A;
  /**
   * Revive the entity with arguments.
   */
  revive(args: A, contexts: ContextsProvider, reviver: Reviver<any>): T;
  /**
   * Called before `revive` and before reviving all dependencies.
   * 
   * Used, for example, for registering contexts.
   * 
   * Used for transforming abstract data argurments.
   * 
   * @returns This method needs to return a abstract data tree.
   */
  beforeRevive?(rawArgs: IAbstractData[], contexts: ContextsProvider, reviver: Reviver<any>): IAbstractData[];
}
