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

// some default settings
var characterWidth = 10;
var lineHeight = 12;
var viewportWidth = 800;
var viewportHeight = 600;

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
    this.maxY = 0;  // baseline of top most string
    // stats
    this.str_count = 0;
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
   * @param {Boolean} options.HeaderRow
   * @param {Boolean} options.FooterRow
   */
  constructor(options = {}) {
    super({ captureRejections: true });

    this.options = Object.assign({ cells: 1 }, options);
    this.doc;
    this.cells = [];
    this.rows = [];
    this.headingFound = options.heading ? false : true;
    this.tableFound = this.headingFound;
    this.tableDone = false;
  }

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
        await this._parsePage(n);
        await this._parseCells();

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

  async _parsePage(pageNum) {
    let page = await this.doc.getPage(pageNum);
    const vp = page.getViewport({ scale: 1.0 });
    viewportWidth = vp.width;
    viewportHeight = vp.height;
    let content = await page.getTextContent({ includeMarkedContent: true, disableCombineTextItems: false });

    this.cells = [];
    let cell = new Cell(viewportWidth, viewportHeight);
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

        // determine if cell should be added to list
        // i.e. when new paragraph or span isn't adjacent to previous text
        if (paragraph || (span && !this._adjacent(x, y, prevItem, cell))) {
          if (cell.text) {
            this._insertCell(cell);
          }
          // new Cell
          cell = new Cell(viewportWidth, viewportHeight);
        }

        // check cell bounding box
        if (x < cell.x) cell.x = x;
        if (y < cell.y) cell.y = y;
        if (x + w > cell.maxX) cell.maxX = x + w - 1;
        if (y > cell.maxY) cell.maxY = y;

        // append text to cell
        cell.text += item.str;
        if (item.hasEOL)
          cell.text += this.options.newlines ? "\n" : " ";

        paragraph = false;
        cell.str_count++;
        if (w && item.str && item.str !== " ")
          prevItem = item;
      }

    }

    // push last cell
    if (cell.text) {
      this._insertCell(cell);
    }

    // release page resources.
    await page.cleanup();
  }

  _adjacent(x, y, prevItem, cell) {
    let prevX = prevItem.transform[ 4 ];
    let prevY = prevItem.transform[ 5 ];

    // check if on some line as prevItem and within approximately two characters
    if (Math.abs(prevY - y) < 8 && (x < (prevX + prevItem.width + 24)))
      return true;

    // check if next line
    if ((prevY - y) > 8 && Math.abs(cell.x - x) < 10)
      return true;

    return false;
  }

  _insertCell(cell) {
    let i = this.cells.findLastIndex((c) => cell.y < c.y || (cell.y === c.y && cell.x > c.x));
    if (i === -1 || i === this.cells.length - 1)
      this.cells.push(cell);
    else
      this.cells.splice(i + 1, 0, cell);
  }

  async _parseCells() {

    let row = [];
    let cell;
    let prevCell = new Cell(viewportWidth, viewportHeight);

    for (cell of this.cells) {

      // determine if row should be output
      if (row.length > 0) {
        if ((cell.x <= prevCell.maxX && cell.y < prevCell.maxY) || (cell.y > prevCell.maxY + lineHeight)) {
          this._output(row);
          // new row
          row = [];
          prevCell = new Cell(viewportWidth, viewportHeight);
        }
      }
      if (this.tableDone)
        break;

      // add cell to row
      if (cell.text) {
        let text = cell.text.trimStart();
        row.push(text);
        prevCell = cell; // prevCell must have text
      }

    }

    if (row.length > 0) {
      // push last row
      this._output(row);
    }
  }

  _output(row) {
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

    if (this.headingFound && this.tableFound && !this.tableDone && row.length > 0) {
      if (this.listenerCount("data") > 0)
        this.emit("data", row);
      else
        this.rows.push(row);
    }
  }

  /**
  * looks at deep type of object for "regex"
  * @param {*} obj - the object to check
  */
  isRegExp(obj) {
    if (obj == null)
      return false;

    var deepType = Object.prototype.toString.call(obj).slice(8, -1).toLowerCase();
    return deepType === 'regexp';
  }

};
