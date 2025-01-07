/**
 * Represent types that can be parsed/serialized by providers. **No other types should be detected.**
 */
export declare type IAbstractData = number | boolean | string | IAbstractData[];

export declare interface IDataProvider<D> {
  /**
   * Returns the representation of the data by this provider.
   */
  stringify(data: IAbstractData): D,
  /**
   * Try parsing using provider parser.
   */
  parse(data: D): Promise<IAbstractData>
}
