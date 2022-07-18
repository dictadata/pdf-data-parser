/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

// Builds upon getContent.js
//
// Advanced example that gets content items with marked content
// and groups the text into cells by comparing x, y coordinates of items.
//
// Output is an array of arrays.
//

const pdfjsLib = require("./pdfjs-dist/build/pdf.js");

const EventEmitter = require('node:events');

/**
 * Cell contains the data value (text) and bounding box coordinates.
 */
class Cell {
  /**
   *
   * @param {*} width use viewport width
   * @param {*} height use viewport height
   */
  constructor(width, height) {
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
    // stats
    this.str_count = 0;
  }

  addItem(item) {
    this.text += item.str;

    let fh = item.transform[ 0 ];
    let fw = item.width / item.str.length;
    if (fh > this.fontHeight) this.fontHeight = fh;
    if (fw > this.fontWidth) this.fontWidth = fw;
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
   * @param {Integer} options.pageHeader height of page header area in points, default: 0
   * @param {Integer} options.pageFooter height of page footer area in points, default: 0
   * @param {Boolean} options.repeatingHeaders indicates if table headers are repeated on each page, default: false
   * @param {Integer} options.lineHeight approximate line height ratio based on font size; default 1.5
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
    this.viewportWidth = 800;
    this.viewportHeight = 600;
    this.headerY = 800;
    this.footerY = 0;
    this.lineHeightRatio = options.lineHeight || 1.75;
  }

  lineHeight(cell) {
    return cell.fontHeight * this.lineHeightRatio;
  }

  /**
   * Load and parse the PDF document.
   * @returns Rows an array containing arrays of data values.
   * If using an event listener the return value will be an empty array.
   */
  async parse() {

    try {
      let args = { url: this.options.url, fontExtraProperties: true };
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
    let content = await this.page.getTextContent({ includeMarkedContent: true, disableCombineTextItems: false });

    this.cells = [];
    let cell = new Cell(this.viewportWidth, this.viewportHeight);
    let paragraph = false;
    let span = false;
    let prevItem;  // previous str item

    for (let item of content.items) {
      if (item.type === "beginMarkedContent") {
        switch (item.tag) {
          case "Artifact":
            break;
          default:
            console.log("unknown content tag: " + item.tag);
        }
      }
      else if (item.type === "beginMarkedContentProps") {
        switch (item.tag) {
          case 'P':
            if (!span)
              paragraph = true;  // starting new paragraph
            else
              span = false;
            break;
          case "Span":
            span = true;  // span inside paragraph
            break;
          default:
        }
      }
      else if (item.type === "endMarkedContent") {
        // nop
      }
      else if (item.type) {
        // unknown type
        console.warn("Warning: unknown content type: " + item.type);
      }
      else {
        // a string item
        if (item.dir !== 'ltr')  // expect direction left-to-right
          console.warn("Warning: text direction is: " + item.dir);

        let x = item.transform[ 4 ];
        let y = item.transform[ 5 ];
        let w = item.width;
        let h = item.height;

        let s = (paragraph ? "P" : " ") + (span ? "S" : " ") + " " +
          Math.round(x * 10) / 10 + ": " +
          Math.round(item.width * 10) / 10 + ", " +
          Math.round(y * 10) / 10 + " " +
          "'" + item.str + "'";
        console.log(s);

        if (w = 0 || item.str === "" || item.str === " ") {
          // ignore leading/padding spaces,
          // because sometimes x,y is in the previous cell's boundaries

          //if (item.hasEOL)
          //  cell.text += this.options.newlines ? "\n" : " ";
        }
        else {
          // determine if working cell should be added to list
          // i.e. when new paragraph or span and item isn't adjacent to previous text item
          if (paragraph || (span && !this.itemIsAdjacent(item, prevItem, cell))) {
            if (cell.text) {
              this.insertCell(cell);
            }
            // new Cell
            cell = new Cell(this.viewportWidth, this.viewportHeight);
          }

          // check cell bounding box
          if (x < cell.x) cell.x = x;
          if (y < cell.y) cell.y = y;
          if (x + w > cell.maxX) cell.maxX = x + w - 1;  // right edge of cell
          if (y + h > cell.maxY) cell.maxY = y + h - 1;  // top edge of cell

          // append text to cell
          cell.addItem(item);
          if (item.hasEOL)
            cell.text += this.options.newlines ? "\n" : " ";

          paragraph = false;
          cell.str_count++;
          prevItem = item;
        }
      }
    }

    // push last cell
    if (cell.text) {
      this.insertCell(cell);
    }

    // release page resources.
    await this.page.cleanup();
  }

  /**
   * Determine if item should be in the cell.
   *
   * @param {*} item
   * @param {*} prevItem
   * @param {*} cell
   * @returns
   */
  itemIsAdjacent(item, prevItem, cell) {
    let itemX = item.transform[ 4 ];
    let itemY = item.transform[ 5 ];
    let itemMaxX = itemX + item.width;
    let prevX = prevItem.transform[ 4 ];
    let prevY = prevItem.transform[ 5 ];

    // check if on some line as prevItem and within approximately two characters
    if (Math.abs(prevY - itemY) <= (this.lineHeight(cell) * 0.5) && ((prevX + prevItem.width + (cell.fontWidth * 2)) >= itemX))
      return true;

    // check if item is on next line and x range overlaps cell x boundary
    if ((prevY - itemY) > (this.lineHeight(cell) * 0.5) && (prevY - itemY) <= (this.lineHeight(cell) * 1.5)
      && ((itemX >= cell.x && itemX <= cell.maxX) || (cell.x >= itemX && cell.x <= itemMaxX)))
      return true;

    return false;
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
    console.log("C");

    // filter out cells in page header and footer areas
    if (cell.y >= this.headerY || cell.y <= this.footerY)
      return;

    let i = this.cells.length - 1;
    let c = this.cells[ i ];

    // find cell at end of same row or previous row
    while (c && cell.y > c.maxY) {
      c = this.cells[ --i ];
    }

    // if same row, find position in row
    while (c && cell.maxY >= c.y && cell.x < c.maxX) {
      c = this.cells[ --i ];
    }

    this.cells.splice(i + 1, 0, cell);
  }

  /**
   * Iterate the cells and determine rows.
   * Cells in a row are determined by overlapping Y boundaries.
   */
  async parseCells() {

    let cell;
    let prevCell = new Cell(this.viewportWidth, this.viewportHeight);

    this.rowNum = 1;
    let row = [];

    for (cell of this.cells) {

      // determine if row should be output
      if (row.length > 0 && !this.isSameRow(cell, prevCell)) {
        if (this.filters(row))
          this.output(row);
        // start new row
        row = [];
        prevCell = new Cell(this.viewportWidth, this.viewportHeight);
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
    if (row.length > 0 && this.filters(row)) {
      this.output(row);
    }
  }

  /**
   * check if the Y boundaries overlap.
   *
   * @param {*} cell1
   * @param {*} cell2
   * @returns
   */
  isSameRow(cell1, cell2) {
    return (cell1.y >= cell2.y && cell1.y <= cell2.maxY)
      || (cell2.y >= cell1.y && cell2.y <= cell1.maxY);
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

    let output = this.headingFound && this.tableFound
      && !this.tableDone && row.length > 0;

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
