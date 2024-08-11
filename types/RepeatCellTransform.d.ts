declare const _exports: {
    new (options?: {
        column?: number | undefined;
    } | undefined): {
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
    };
};
export = _exports;
//# sourceMappingURL=RepeatCellTransform.d.ts.map