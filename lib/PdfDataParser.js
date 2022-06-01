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

class Cell {
  /**
   *
   * @param {*} width viewport width
   * @param {*} height viewport height
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
    this.c_str = 0;
  }
}

module.exports = class PdfDataParser extends EventEmitter {

  /**
   *
   * @param {Object} options
   * @param {String} options.url
   * @param {String} options.heading PDF section heading where data is located, default: none
   * @param {Integer} options.columns minimum number of columns in a tabular data, default: 1
   * @param {Boolean} options.newlines preserve new lines in cell data, default: false
   */
  constructor(options = {}) {
    super({ captureRejections: true });

    this.options = Object.assign({ columns: 1 }, options);
    this.doc;
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
    const { width, height } = page.getViewport({ scale: 1.0 });
    let content = await page.getTextContent({ includeMarkedContent: true, disableCombineTextItems: false });

    let row = [];
    let cell = new Cell(width, height);
    let prevCell = new Cell(width, height);
    let paragraph = false;
    let span = false;
    let prevStr;

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

        // determine if cell should be added to row
        // when new paragraph or span isn't adjacent to previous text
        if (paragraph || (span && !this._adjacent(x, y, prevStr, cell))) {
          if (cell.text) {
            let text = cell.text.trimStart();
            row.push(text);
            prevCell = cell;
          }
          cell = new Cell(width, height);
        }

        // determine if row should be added to rows
        if (paragraph && item.str !== ' ' && row.length > 0) {
          //if (x <= (prevCell.x + prevCell.w) && y < prevCell.y) {
          if (x <= prevCell.maxX && y < prevCell.maxY) {
            this._output(row);
            row = [];
            prevCell = new Cell(width, height);
          }
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
        cell.c_str++;
        if (w && item.str !== ' ')
          prevStr = item;
      }

      if (this.tableDone)
        break;
    }

    // push last cell
    if (cell.text) {
      let text = cell.text.trimStart();
      row.push(text);
    }
    // push last row
    this._output(row);

    // release page resources.
    await page.cleanup();
  }

  _output(row) {
    if (!this.headingFound) {
      if (row.length > 0 && row[ 0 ] === this.options.heading)
        this.headingFound = true;
    }
    else if (!this.tableFound) {
      this.tableFound = row.length >= this.options.columns;
    }
    else if (this.options.heading && !this.tableDone) {
      this.tableDone = row.length < this.options.columns;
    }

    if (this.headingFound && this.tableFound && !this.tableDone && row.length > 0) {
      if (this.listenerCount("data") > 0)
        this.emit("data", row);
      else
        this.rows.push(row);
    }
  }

  _adjacent(x, y, prevStr, cell) {
    let prevX = prevStr.transform[ 4 ];
    let prevY = prevStr.transform[ 5 ];

    // check if on some line as prevStr and within approximately two characters
    if (Math.abs(prevY - y) < 8 && (x < (prevX + prevStr.width + 24)))
      return true;

    // check if next line
    if ((prevY - y) > 8 && Math.abs(cell.x - x) < 10)
      return true;

    return false;
  }

};
