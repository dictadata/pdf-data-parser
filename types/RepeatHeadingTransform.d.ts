declare const _exports: {
    new (options?: {
        header?: string | undefined;
        hasHeader?: boolean | undefined;
    } | undefined): {
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
    };
};
export = _exports;
//# sourceMappingURL=RepeatHeadingTransform.d.ts.map