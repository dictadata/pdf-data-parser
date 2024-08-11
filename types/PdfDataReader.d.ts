export = PdfDataReader;
declare class PdfDataReader {
    /**
     *
     * @param {Object}           options
     * @param {String|URL}       [options.url]
     * @param {String|ArrayBuffer} [options.data]
     */
    constructor(options: {
        url?: string | URL | undefined;
        data?: string | ArrayBuffer | undefined;
    });
    started: boolean;
    options: {
        url?: string | URL | undefined;
        data?: string | ArrayBuffer | undefined;
    };
    _construct(callback: any): Promise<void>;
    parser: PdfDataParser | undefined;
    /**
     * Fetch data from the underlying resource.
     * @param {Number} size number of bytes to read asynchronously
     */
    _read(size: number): Promise<void>;
}
import PdfDataParser = require("./PdfDataParser");
//# sourceMappingURL=PdfDataReader.d.ts.map