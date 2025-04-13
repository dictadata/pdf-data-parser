export const PdfDataParser: {
    new (options?: {
        url?: string | URL | undefined;
        data?: string | ArrayBuffer | undefined;
    }): import("./PdfDataParser.js");
};
export const PdfDataReader: {
    new (options: {
        url: string | URL;
        data: string | ArrayBuffer;
    }): import("./PdfDataReader.js");
};
export const RowAsObjectTransform: {
    new (options?: {
        hasHeader?: Object | undefined;
        headers?: string[] | undefined;
    }): {
        headers: any;
        hasHeader: any;
        _transform(row: Object, encoding: string, callback: Function): void;
        _headers: Object | undefined;
    };
};
export const RepeatCellTransform: {
    new (options?: {
        column?: number | undefined;
    }): {
        column: any;
        repeatValue: string;
        prevLen: number;
        _transform(row: Object, encoding: string, callback: Function): void;
    };
};
export const RepeatHeadingTransform: {
    new (options?: {
        header?: string | undefined;
        hasHeader?: boolean | undefined;
    }): {
        header: any;
        headerIndex: any;
        dataIndex: any;
        hasHeader: any;
        subHeading: string;
        count: number;
        _transform(row: Object, encoding: string, callback: Function): void;
    };
};
export const FormatCSV: {
    new (options: any): {
        first: boolean;
        _transform(row: Object, encoding: string, callback: Function): void;
    };
};
export const FormatJSON: {
    new (options: any): {
        options: any;
        first: boolean;
        _transform(row: Object, encoding: string, callback: Function): void;
        _flush(callback: Function): void;
    };
};
//# sourceMappingURL=index.d.ts.map