import { deserialize, serialize } from "bson";
import { IAbstractData, IDataProvider } from "../provider";

/**
 * Use for stringify/parse data into/from the BSON (binary JSON).
 */
export class BsonDataProvider implements IDataProvider<Uint8Array> {
  /**
   * Use for stringify/parse data into/from the BSON (binary JSON).
   * 
   * @param storageKey The key used for save data inside of the BSON object.
   */
  public constructor(public readonly storageKey: string = "data") { }

  public stringify(data: IAbstractData): Uint8Array {
    return serialize({ [this.storageKey]: data });
  }

  public parse(data: Uint8Array): Promise<IAbstractData> {
    return Promise.resolve(deserialize(data)[this.storageKey]);
  }

}
