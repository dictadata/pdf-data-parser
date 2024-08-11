declare const _exports: {
    new (options?: {
        hasHeader?: Object | undefined;
        headers?: string[] | undefined;
    } | undefined): {
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
    };
};
export = _exports;
//# sourceMappingURL=RowAsObjectTransform.d.ts.map