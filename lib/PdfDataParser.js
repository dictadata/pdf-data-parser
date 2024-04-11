/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

// Builds upon the example getContent.js and test getCells.js
//
// Gets content items with marked content
// and groups the text into cells by comparing x, y coordinates of items.
//
// Output is an array of arrays.
//
"use strict";

const EventEmitter = require('node:events');
const { join } = require("node:path");
const Cell = require("./cell");
const findModules = require("./findModules");
require('colors');


module.exports = class PdfDataParser extends EventEmitter {

  /**
   *
   * @param {Object} options
   * @property {String} options.url
   * @property {Array}  options.pages array of page numbers to process, if undefined defaults to all pages
   * @property {String} options.heading PDF section heading where data is located, default: none
   * @property {Integer} options.cells minimum number of cells in a tabular data, default: 1
   * @property {Boolean} options.newlines preserve new lines in cell data, default: false
   * @property {Boolean} options.artifacts parse artifacts content, default: false
   * @property {Integer} options.pageHeader height of page header area in points, default: 0
   * @property {Integer} options.pageFooter height of page footer area in points, default: 0
   * @property {Boolean} options.repeatingHeaders indicates if table headers are repeated on each page, default: false
   * @property {Integer} options.lineHeight approximate line height ratio based on font size; default 1.67
   * @property {Boolean} options.orderXY order cells by XY coordinates on page; default true
   */
  constructor(options = {}) {
    super({ captureRejections: true });

    this.options = Object.assign({ cells: 1, orderXY: true }, options);

    // parsing properties
    this.doc;
    this.page;
    this.cells = []; // array of cells in x,y order
    this.rows = []; // array of data values
    this.headingFound = options.heading ? false : true;
    this.tableFound = this.headingFound;
    this.tableDone = false;
    this.headersRow;
    this.firstPageNumber = options.pages ? options.pages[0] : 1;

    // some default settings
    this.headerY = 9999;
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
        standardFontDataUrl: join(await findModules(), "./pdfjs-dist/standard_fonts/")
      };
      var loadingTask = pdfjsLib.getDocument(args);
      this.doc = await loadingTask.promise;

      const numPages = this.doc.numPages;

      let markInfo = await this.doc.getMarkInfo();
      if (!(markInfo && markInfo.Marked)) {
        console.warn("Warning: PDF document does not contain Marked Content".yellow);
      }

      for (let pn = 1; pn <= numPages; pn++) {
        if (this.options.pages && !this.options.pages.includes(pn))
          continue;

        this.page = await this.doc.getPage(pn);

        const vp = this.page.getViewport({ scale: 1.0 });
        this.headerY = vp.height - (this.options.pageHeader || 0);
        this.footerY = this.options.pageFooter || 0;
        this.cells = [];

        if (markInfo?.Marked)
          await this.parseMarkedPage();
        else
          await this.parseLinedPage();
        await this.parseCells();

        // release page resources.
        await this.page.cleanup();

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
   */
  async parseMarkedPage() {

    let cell = null;
    let markedContent = "";  // assume NO nesting of markedContent tags, at least I haven't seen it yet.
    let artifact = false;
    let paragraph = false;
    let span = false;

    let content = await this.page.getTextContent({ includeMarkedContent: true, disableNormalization: false, disableCombineTextItems: false });

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
        console.warn("Warning: unknown content type: ".yellow + item.type);
      }
      else {
        // a string item
        if (item.dir !== 'ltr')  // expect direction left-to-right
          console.warn("Warning: text direction is: ".yellow + item.dir);

        if (paragraph || span) {
          // ignore EOL
          if (item.str === "" && item.width === 0 && (paragraph && item.hasEOL))
            continue;
          // ignore spacing between cells
          if (item.str === " " && (paragraph || (item.width > cell?.fontWidth)))
            continue;
          // for span and less than one character width assume we need it

          // check to save and start a new cell
          if (cell && cell.count > 0) {
            cell.hasSpan = cell.hasSpan || span;
            if (!cell.isAdjacent(item)) {
              this.insertCell(cell);
              cell = null;
            }
          }
        }

        if (!cell)
          cell = new Cell(this.options);

        // append text to cell
        cell.addItem(item);
        paragraph = false;
        span = false;
      }
    }

    // push last cell
    if (cell)
      this.insertCell(cell);
  }

  async parseLinedPage() {

    let cell = new Cell(this.options);
    let wasEOL = false;

    let content = await this.page.getTextContent({ disableNormalization: false, disableCombineTextItems: false });

    for (let item of content.items) {
      if (item.dir !== 'ltr')  // expect direction left-to-right
        console.warn(item.dir.yellow);

      let aligns = cell.alignment(item);

      if (!aligns.adjacent && cell.count > 0) {
        this.insertCell(cell);
        cell = new Cell(this.options);
      }

      if (wasEOL && (aligns.top || ((aligns.left || aligns.right) && aligns.adjacent))) {
        // ignore newline in the middle of a line, e.g. a split heading
        // may be sensitive to normal line spacing and heading line spacing
        wasEOL = false;
      }

      if (wasEOL && cell.count > 0) {
        this.insertCell(cell);
        cell = new Cell(this.options);
      }

      // characters have a height, ignore more than one space between cells
      if (item.height > 0 || (item.str === " " && item.width < cell?.fontWidth))
        cell.addItem(item);

      wasEOL = item.hasEOL;
    }

    // process last cell
    if (cell.count > 0) {
      this.insertCell(cell);
    }
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
    if (!cell || cell.count <= 0 || cell.inserted)
      return;

    // filter out cells in page header and footer areas
    if (cell.y1 >= this.headerY || cell.y1 <= this.footerY)
      return;

    if (this.options.orderXY) {
      let i = this.cells.length - 1;
      let c = this.cells[ i ];

      // while cell should be above c
      while (c && c.isSameLine(cell) > 0) {
        c = this.cells[ --i ];
      }

      // while same row and cell is less than c
      // find position in row based on left edge
      while (c && c.isSameLine(cell) === 0 && cell.x1 < c.x1) {
        c = this.cells[ --i ];
      }

      // insert the cell
      this.cells.splice(i + 1, 0, cell);
    }
    else
      this.cells.push(cell);

    cell.inserted = true;
  }


  /**
   * Iterate the cells and determine rows.
   * Cells in a row are determined by overlapping Y boundaries.
   */
  async parseCells() {

    let row = [];
    this.rowNum = 1;

    let prevCell = new Cell(this.options);
    for (let cell of this.cells) {

      // determine if row should be output
      if (row.length > 0 && (cell.isSameLine(prevCell) !== 0 || (prevCell.x1 > cell.x1))) {
        if (this.filters(row))
          this.output(row);
        // start new row
        row = [];
        prevCell = new Cell(this.options);
      }
      if (this.tableDone)
        break;

      // add cell value to row
      if (cell.count) {
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

    if (output && (this.options.repeatingHeaders || this.options.repeating) && this.rowNum === 1) {
      // skip repeating header rows
      if (this.page.pageNumber === this.firstPageNumber)
        this.headersRow = row;
      else
        output = !this.rowsEqual(this.headersRow, row);
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
    if (!row1 || !row2) {
      console.log("row1 " + row1);
      console.log("row2 " + row2);
      return false;
    }

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
