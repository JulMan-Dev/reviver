import { assertExists, catchErrors, chunk } from "./utils";

describe("chunk", () => {
  const four = [1, 2, 3, 4];

  it("should chunk an array in 2", () => {
    expect(chunk(four, 2)).toEqual([[1, 2], [3, 4]]);
  });

  it("should chunk an array in 2 with missing elements", () => {
    expect(chunk(four, 3)).toEqual([[1, 2, 3], [4]]);
  });

  it("should pass same array for chunking with size higher than array size", () => {
    expect(chunk(four, 5)).toEqual([four]);
  });
});

describe("assertExists", () => {
  it.each([
    [1, true],
    [null, true],
    [NaN, true],
    [undefined, false]
  ])("should return %s (%s)", (value, th) => {
    const fn = jest.fn(() => assertExists(value));

    if (!th)
      expect(fn).toThrow();
    else {
      fn();
      expect(fn).toHaveReturnedWith(value);
    }
  });
});

describe("catchErrors", () => {
  it("should return results", () => {
    const fn = jest.fn(() => 34);

    expect(catchErrors(fn)).toBe(34);
    expect(fn).toHaveBeenCalled();
  });

  it("should throw EvalError", () => {
    expect(() => {
      catchErrors(() => { throw new Error(); });
    }).toThrow("Execution failed");
  });

  it("should throw EvalError with message", () => {
    expect(() => {
      catchErrors(() => { throw new Error(); }, "a custom message");
    }).toThrow("a custom message");
  });
});
