/**
 * Repeat a heading cell in following rows that have one less cell.
 */
export default class RepeatCellTransform {
    /**
     *
     * @param {Object} [options]
     * @param {Number} [options.column] - column index in row to repeat, default 0
     */
    constructor(options?: {
        column?: number | undefined;
    });
    column: any;
    repeatValue: string;
    prevLen: number;
    /**
     * Internal call from streamWriter to process an object
     * @param {Object} row
     * @param {String} encoding
     * @param {Function} callback
     */
    _transform(row: Object, encoding: string, callback: Function): void;
}
//# sourceMappingURL=RepeatCellTransform.d.ts.map