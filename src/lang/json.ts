import { IAbstractData, IDataProvider } from "../provider";

/**
 * Use for stringify/parse data into/from the JSON.
 * 
 * This data provider provides a security againts `Infinity` and `NaN` loss.
 * 
 * This is the default data provider when no other one provided.
 */
export class JsonDataProvider implements IDataProvider<string> {
  /**
   * Use for stringify/parse data into/from the JSON.
   * 
   * This is the default data provider when no other one provided.
   */
  public constructor() { }

  public stringify(data: IAbstractData): string {
    return JSON.stringify(data, this.replacer);
  }

  public parse(data: string): Promise<IAbstractData> {
    return Promise.resolve(JSON.parse(data, this.reviver));
  }

  private replacer(key: string, value: any) {
    if (typeof value == "number") {
      if (Number.isNaN(value)) {
        return { "@": "nan" };
      }

      if (!Number.isFinite(value)) {
        return { "@": Math.sign(value) == -1 ? "-inf" : "inf" };
      }
    }

    return value;
  }

  private reviver(key: string, value: any) {
    if (typeof value != "object" || Array.isArray(value)) {
      return value;
    }

    if ("@" in value) {
      const security = value["@"];

      switch (security) {
        case "nan":
          return NaN;

        case "inf":
          return Infinity;

        case "-inf":
          return -Infinity;
      }
    }

    return value;
  }
}
