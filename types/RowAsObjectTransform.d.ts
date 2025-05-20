/**
 * Transforms row data to JSON objects.
 */
export default class RowAsObjectTransform {
    /**
     * If headers are not set in options then the first row seen is assumed to be the headers.
     *
     * @param {Object}    [options]
     * @param {Object}    [options.hasHeader] - data has a header row, if true and headers set then headers overrides header row.
     * @param {String[]}  [options.headers]   - array of column names for data, default none first row contains names.
     */
    constructor(options?: {
        hasHeader?: Object | undefined;
        headers?: string[] | undefined;
    });
    headers: any;
    hasHeader: any;
    /**
     * Internal call from streamWriter to process an object
     * @param {Object} row
     * @param {String} encoding
     * @param {Function} callback
     */
    _transform(row: Object, encoding: string, callback: Function): void;
    _headers: Object | undefined;
}
//# sourceMappingURL=RowAsObjectTransform.d.ts.map