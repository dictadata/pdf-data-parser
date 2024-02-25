/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

// Builds upon getContent.js
//
// Advanced example that gets content items with marked content
// and groups the text into cells by comparing x, y coordinates of items.
//
// Output is an array of arrays.
//

const EventEmitter = require('node:events');
const { join } = require("path");

/**
 * Cell contains the data value (text) and bounding box coordinates.
 */
class Cell {
  /**
   *
   * @param {*} width use viewport width
   * @param {*} height use viewport height
   * @param {*} options parser options
   */
  constructor(width = 1200, height = 900, options = {}) {
    this.options = options;

    this.text = "";
    // cell lower-left
    this.x = width;
    this.y = height;
    // cell upper-right
    this.maxX = 0;  // max(x + width, ...)
    this.maxY = 0;  // max(y + height, ...)
    // font sizing
    this.fontHeight = 8;
    this.fontWidth = 5;
    this.lineHeightRatio = options.lineHeight || 1.67;
    // stats
    this.item_count = 0;
    // working props
    this.prevX = 0;
    this.prevY = 0;
    this.prevMaxX = 0;

    this.hasSpan = false;
    this.inserted = false;
  }

  get lineHeight() {
    return this.fontHeight * this.lineHeightRatio;
  }

  addItem(item) {
    this.item_count++;

    if (item.str)
      this.text += item.str;
    if (item.hasEOL)
      this.text += this.options.newlines ? "\n" : " ";

    let x = item.transform[ 4 ];
    let y = item.transform[ 5 ];
    let w = item.width;
    let h = item.height;

    // debug output
    /*
    let s = Math.round(x * 10) / 10 + ": " +
      Math.round(item.width * 10) / 10 + ", " +
      Math.round(y * 10) / 10 + " " +
      "'" + item.str + "'";
    console.debug(s);
    */

    // update cell bounding box
    if (x < this.x) this.x = x;
    if (y < this.y) this.y = y;
    if (x + w > this.maxX) this.maxX = x + w;  // right edge of cell
    if (y + h > this.maxY) this.maxY = y + h;  // top edge of cell

    // update font size
    let fh = item.transform[ 0 ];
    let fw = item.str ? (item.width / item.str.length) : 0;
    if (fh > this.fontHeight) this.fontHeight = fh;
    if (fw > this.fontWidth) this.fontWidth = fw;

    // position of last item added
    this.prevX = x;
    this.prevY = y;
    this.prevMaxX = x + w;
    this.prevMaxY = y + h;
  }

  isAdjacent(item) {
    let x = item.transform[ 4 ];
    let y = item.transform[ 5 ];
    let w = item.width;
    let h = item.height;
    let maxX = x + w;

    // check if item on same line as previous item and within one character width
    // a single space should be less than average font width.
    if (Math.abs(y - this.prevY) <= (this.lineHeight * 0.1) && (x - this.prevMaxX < this.fontWidth))
      return true;

    // check if item is on next line and x range overlaps cell x boundary
    if (this.hasSpan
      && (this.prevY - y) > (this.lineHeight * 0.75) && (this.prevY - y) <= (this.lineHeight * 1.25)
      && ((x >= this.x && x <= this.maxX) || (this.x >= x && this.x <= maxX)))
      return true;

    return false;
  }

}

module.exports = class PdfDataParser extends EventEmitter {

  /**
   *
   * @param {Object} options
   * @param {String} options.url
   * @param {String} options.heading PDF section heading where data is located, default: none
   * @param {Integer} options.cells minimum number of cells in a tabular data, default: 1
   * @param {Boolean} options.newlines preserve new lines in cell data, default: false
   * @param {Boolean} options.artifacts parse artifacts content, default: false
   * @param {Integer} options.pageHeader height of page header area in points, default: 0
   * @param {Integer} options.pageFooter height of page footer area in points, default: 0
   * @param {Boolean} options.repeatingHeaders indicates if table headers are repeated on each page, default: false
   * @param {Integer} options.lineHeight approximate line height ratio based on font size; default 1.67
   */
  constructor(options = {}) {
    super({ captureRejections: true });

    this.options = Object.assign({ cells: 1 }, options);

    // parsing properties
    this.doc;
    this.page;
    this.cells = []; // array of cells in x,y order
    this.rows = []; // array of data values
    this.headingFound = options.heading ? false : true;
    this.tableFound = this.headingFound;
    this.tableDone = false;
    this.tableHeaders;

    // some default settings
    this.viewportWidth = 1200;
    this.viewportHeight = 900;
    this.headerY = this.viewportHeight;
    this.footerY = 0;
  }

  /**
   * Load and parse the PDF document.
   * @returns Rows an array containing arrays of data values.
   * If using an event listener the return value will be an empty array.
   */
  async parse() {

    try {
      const pdfjsLib = await import("pdfjs-dist");

      let args = {
        url: this.options.url,
        fontExtraProperties: true,
        standardFontDataUrl: join(__dirname, '../node_modules/pdfjs-dist/standard_fonts/')
      };
      var loadingTask = pdfjsLib.getDocument(args);
      this.doc = await loadingTask.promise;

      const numPages = this.doc.numPages;

      let markInfo = await this.doc.getMarkInfo();
      if (!(markInfo && markInfo.Marked)) {
        console.warn("Warning: PDF document does not contain Marked Content");
      }

      for (let n = 1; n <= numPages; n++) {
        await this.parsePage(n);
        await this.parseCells();

        if (this.tableDone)
          break;
      }

      this.emit("end");
      return this.rows;
    }
    catch (err) {
      console.error(err);
      this.emit("error", err);
    }
  }

  /**
   * Parse the content items returned by PDF.js.
   * Use PDF.js marked content to collect multiple items into cells.
   * Result is cells array contains cells in sorted x.y order.
   *
   * @param {*} pageNum
   */
  async parsePage(pageNum) {
    this.page = await this.doc.getPage(pageNum);

    const vp = this.page.getViewport({ scale: 1.0 });
    this.viewportWidth = vp.width;
    this.viewportHeight = vp.height;
    this.headerY = vp.height - (this.options.pageHeader || 0);
    this.footerY = this.options.pageFooter || 0;

    this.cells = [];
    let cell = null;
    let markedContent = "";  // assume NO nesting of markedContent tags, at least I haven't seen it yet.
    let artifact = false;
    let paragraph = false;
    let span = false;
    let content = await this.page.getTextContent({ includeMarkedContent: true, disableCombineTextItems: false });

    for (let item of content.items) {
      if (item.type === "beginMarkedContent") {
        switch (item.tag) {
          case "Artifact":
            markedContent = "Artifact";
            artifact = true;
            // insert working cell
            this.insertCell(cell);
            cell = null;
            // note: start a new cell, because headers and footers could be in artifacts
            break;
          default:
            console.log("unknown content tag: " + item.tag);
        }
      }
      else if (item.type === "beginMarkedContentProps") {
        switch (item.tag) {
          case 'P':
            markedContent = "P";
            paragraph = true;
            break;
          case "Span":
            markedContent = "Span";
            span = true;
            break;
          default:
        }
      }
      else if (item.type === "endMarkedContent") {

        switch (markedContent) {
          case "Artifact":
            artifact = false;
            // ignore text in artifacts like headers and footers
            if (this.options.artifacts)
              this.insertCell(cell);
            cell = null;
            break;
          case "P":
            break;
          case "Span":
            break;
        }

        markedContent = "";
      }
      else if (item.type) {
        // unknown type
        console.warn("Warning: unknown content type: " + item.type);
      }
      else {
        // a string item
        if (item.dir !== 'ltr')  // expect direction left-to-right
          console.warn("Warning: text direction is: " + item.dir);

        if (paragraph || span) {
          // ignore padding from previous cell
          // ignore EOL
          if (item.str === "" && item.width === 0 && (paragraph && item.hasEOL))
            continue;
          // ignore multiple spaces
          if (item.str === " " && (paragraph || (item.width > this.fontWidth)))
            continue;
          // for span and less than one character width assume we need it

          // check to save and start a new cell
          if (cell && cell.item_count > 0) {
            cell.hasSpan = cell.hasSpan || span;
            if (!cell.isAdjacent(item)) {
              this.insertCell(cell);
              cell = null;
            }
          }
        }

        if (!cell)
          cell = new Cell(this.viewportWidth, this.viewportHeight, this.options);

        // append text to cell
        cell.addItem(item);
        paragraph = false;
        span = false;
      }
    }

    // push last cell
    if (cell)
      this.insertCell(cell);

    // release page resources.
    await this.page.cleanup();
  }

  /**
   * Add item to cells array in x,y order.
   *
   * Order of cells is top of page (max) to bottom of page (0).
   * Within a row order is left (0) to right (max).
   * Usually cells flow in order from pdf.js, but sometimes not.
   *
   * Filters out cells in page header and page footer areas.
   *
   * @param {*} cell
   */
  insertCell(cell) {
    //console.log("C");
    if (!cell || cell.item_count <= 0 || cell.inserted)
      return;

    // filter out cells in page header and footer areas
    if (cell.y >= this.headerY || cell.y <= this.footerY)
      return;

    let i = this.cells.length - 1;
    let c = this.cells[ i ];

    // find cell at end of same row or previous row
    while (c && cell.y > c.maxY) {
      c = this.cells[ --i ];
    }

    /*
    // if same row, find position in row
    while (c && cell.maxY >= c.y && cell.x < c.maxX) {
      c = this.cells[ --i ];
    }
    */

    // insert the cell
    this.cells.splice(i + 1, 0, cell);
    cell.inserted = true;
  }

  /**
   * Iterate the cells and determine rows.
   * Cells in a row are determined by overlapping Y boundaries.
   */
  async parseCells() {

    let cell;
    let prevCell = new Cell(this.viewportWidth, this.viewportHeight, this.options);

    this.rowNum = 1;
    let row = [];

    for (cell of this.cells) {

      // determine if row should be output
      if (row.length > 0 && !this.isSameRow(prevCell, cell)) {
        if (this.filters(row))
          this.output(row);
        // start new row
        row = [];
        prevCell = new Cell(this.viewportWidth, this.viewportHeight, this.options);
      }
      if (this.tableDone)
        break;

      // add cell value to row
      if (cell.text) {
        let text = cell.text.trimStart();
        row.push(text);
        prevCell = cell; // prevCell must have text
      }

    }

    // push last row
    if (row.length >= this.options.cells && this.filters(row)) {
      this.output(row);
    }
  }

  /**
   * check if the Y boundaries overlap.
   *
   * @param {*} prevCell
   * @param {*} cell
   * @returns
   */
  isSameRow(prevCell, cell) {
    // check if Y boundary overlaps
    let yOverlaps = (prevCell.y >= cell.y && prevCell.y <= cell.maxY)
      || (cell.y >= prevCell.y && cell.y <= prevCell.maxY);

    if (yOverlaps) {
      // if cell has wrapped then check if previous cell was a vertical span
      if ((cell.x < prevCell.x) && (cell.maxY - cell.y < prevCell.maxY - prevCell.y))
        yOverlaps = false;
    }

    return yOverlaps;
  }

  /**
   * Performs row filtering.
   *
   * @param {*} row is an array of data values
   */
  filters(row) {
    if (!this.headingFound) {
      if (row.length > 0 &&
        ((this.isRegExp(this.options.heading) && row[ 0 ].match(this.options.heading))
          || (row[ 0 ] === this.options.heading))
      )
        this.headingFound = true;
    }
    else if (!this.tableFound) {
      this.tableFound = row.length >= this.options.cells;
    }
    else if (this.options.heading && !this.tableDone) {
      this.tableDone = row.length < this.options.cells;
    }

    let output = this.headingFound && this.tableFound && !this.tableDone && row.length >= this.options.cells;

    if (output && this.options.repeatingHeaders && this.rowNum === 1) {
      if (this.page.pageNumber === 1)
        this.tableHeaders = row;
      else
        output = !this.rowsEqual(this.tableHeaders, row);
    }

    return output;
  }

  /**
   * Emits or appends data to output.
   *
   * @param {*} row is an array of data values
   */
  output(row) {
    if (this.listenerCount("data") > 0)
      this.emit("data", row);
    else
      this.rows.push(row);

    this.rowNum++;
  }

  /**
  * Looks at deep type of object for "regex".
  *
  * @param {*} obj - the object to check
  */
  isRegExp(obj) {
    if (obj == null)
      return false;

    var deepType = Object.prototype.toString.call(obj).slice(8, -1).toLowerCase();
    return deepType === 'regexp';
  }

  rowsEqual(row1, row2) {
    var i = row1.length;
    if (i !== row2.length)
      return false;

    while (i--) {
      if (row1[ i ] !== row2[ i ])
        return false;
    }

    return true;
  }

};
