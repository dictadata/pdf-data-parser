/**
 * Transforms row objects to CSV strings.
 */
export default class FormatCSV {
    constructor(options: any);
    first: boolean;
    /**
     * Internal call from streamWriter to process an object
     * @param {Object} row
     * @param {String} encoding
     * @param {Function} callback
     */
    _transform(row: Object, encoding: string, callback: Function): void;
}
//# sourceMappingURL=FormatCSV.d.ts.map