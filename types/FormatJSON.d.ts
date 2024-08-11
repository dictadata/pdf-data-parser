declare const _exports: {
    new (options: any): {
        first: boolean;
        /**
         * Internal call from streamWriter to process an object
         * @param {Object} row
         * @param {String} encoding
         * @param {Function} callback
         */
        _transform(row: Object, encoding: string, callback: Function): void;
        /**
         *
         * @param {Function} callback
         */
        _flush(callback: Function): void;
    };
};
export = _exports;
//# sourceMappingURL=FormatJSON.d.ts.map