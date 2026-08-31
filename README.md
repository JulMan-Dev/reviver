# @julman/reviver

A serialization library for JavaScript/TypeScript that handles types JSON can't represent natively — `BigInt`, `Symbol`, 
`Date`, `URL`, `TypedArray`, `Set`, `RegExp` — and lets you plug in custom revivers for your own classes.

No specific use case in mind, but it fits well for client/server communication or persistent storage of complex object 
graphs.

## Installation

The package is not published on npm yet, so you'll have to install it from GitHub:

```bash
npm install @julman/reviver@github:JulMan-Dev/reviver
# or
yarn add @julman/reviver@github:JulMan-Dev/reviver
# or
pnpm add @julman/reviver@github:JulMan-Dev/reviver
# or
bun add @julman/reviver@github:JulMan-Dev/reviver
```

## Usage

```ts
import { Reviver } from "@julman/reviver";

const reviver = new Reviver();

const str = reviver.stringify({ id: 3n, tags: new Set(["a", "b"]) });
const obj = await reviver.parse(str);
```

### Custom revivers

Pass custom revivers to handle your own types:

```ts
export class CustomReviver implements IReviver<{ foo: string }, [string]> {
  canApplyTo(element: any): element is { foo: string } {
    return typeof element.foo == "string";
  }
  getId(): string {
    return "foo-bar";
  }
  getArguments(element: { foo: string }): [string] {
    return [element.foo];
  }
  revive(args: [string]): { foo: string } {
    return { foo: args[0] };
  }
}

const reviver = new Reviver([new CustomReviver()]);
```

## Data providers

The final serialized format is abstracted behind an `IDataProvider`.

- **JSON** (`JsonDataProvider`) — the default. Not just a thin wrapper around `JSON.stringify`/`parse`: it also handles
  `NaN`, `Infinity`, and `-Infinity`, which standard JSON can't represent.
- **BSON** (`BsonDataProvider`) — optional; requires installing the `bson` package separately.

```ts
import { BsonDataProvider } from "@julman/reviver/lang/bson";

const reviver = new Reviver([], new BsonDataProvider());
```

## Contexts

Contexts let a reviver keep a shared state across an entire stringify/parse pass, rather than handling each value in 
isolation. The system is built as a layer on top of the base reviver mechanism (honestly, a bit bolted on) rather than 
a first-class primitive.

The library ships one context, `CircularContext`, which lets a reviver store a value once and reference it again later 
instead of duplicating it (or looping forever on a circular structure). **It's opt-in and not automatic** - 
`CircularContext` doesn't detect cycles by itself; a reviver has to explicitly call `wrapValue`/`unwrapValue` to use it.

To use contexts:

1. Create an attachable ref and register your contexts with `ContextsReviver`, which returns the revivers needed for the 
   system to work — pass them into `Reviver`.
2. Wrap the value you're about to serialize with `ref.attach(value)` before passing it to `stringify`/`plainify`.

```ts
import {Reviver, ContextsReviver, createAttachableRef} from "@julman/reviver";
import {CircularContext, CircularWrapReviver} from "@julman/reviver/contexts/circulars";

const ref = createAttachableRef();
const reviver = new Reviver([
  ...ContextsReviver(ref, [new CircularContext()]),
  new CircularWrapReviver()
]);

const str = reviver.stringify(ref.attach(myValue));
```

You can write your own context by implementing `IReviveContext`, or more simply with `createPlainContext`, which builds 
one from a factory function without the class boilerplate.

## Production mode

When running in production, reviver and typed-array keys are shortened to reduce the size of serialized payloads (e.g. 
`"bigint"` → a short generated key), rather than sending the full readable tag names over the wire.

# License

All code in this repository is licensed under the MIT license.
