declare const _exports: {
    new (options?: any): {
        options: any;
        text: string;
        x1: number;
        y1: number;
        x2: number;
        y2: number;
        fontHeight: number;
        fontWidth: number;
        lineHeightRatio: any;
        count: number;
        prevX: number;
        prevY: number;
        prevX2: number;
        prevY2: number;
        hasSpan: boolean;
        inserted: boolean;
        readonly lineHeight: number;
        addItem(item: any): void;
        /**
         * check if the Y boundaries overlap.
         *
         * @param {*} cell
         * @returns 0 if same line, 1 if cell is above this, -1 if cell is below this
         */
        isSameLine(cell: any): number;
        /**
         * check if the Y boundaries overlap.
         *
         * @param {*} cell
         * @returns
         */
        isOutputLine(cell: any): boolean;
        isAdjacent(item: any): boolean;
        alignment(item: any): {
            top: boolean;
            bottom: boolean;
            left: boolean;
            right: boolean;
            adjacent: boolean;
        };
    };
};
export = _exports;
//# sourceMappingURL=cell.d.ts.map