export default class RepeatHeadingTransform {
    /**
     *
     * @param {Object}  [options]
     * @param {String}  [options.header] header name inserted into header row, use suffix :n:m to specify insert index in row.
     * @param {Boolean} [options.hasHeader] data has a header row, default true
     */
    constructor(options?: {
        header?: string | undefined;
        hasHeader?: boolean | undefined;
    });
    header: any;
    headerIndex: any;
    dataIndex: any;
    hasHeader: any;
    subHeading: string;
    count: number;
    /**
     * Internal call from streamWriter to process an object
     * @param {Object} row
     * @param {String} encoding
     * @param {Function} callback
     */
    _transform(row: Object, encoding: string, callback: Function): void;
}
//# sourceMappingURL=RepeatHeadingTransform.d.ts.map