/**
 *
 */
"use strict";

/**
 * Cell contains the data value (text) and bounding box coordinates.
 */
module.exports = exports = class Cell {

  /**
   *
   * @param {*} options parser options
   */
  constructor(options = {}) {
    this.options = options;

    this.text = "";
    // cell lower-left
    this.x1 = 9999;
    this.y1 = 9999;
    // cell upper-right
    this.x2 = 0;
    this.y2 = 0;
    // font sizing
    this.fontHeight = 8;
    this.fontWidth = 4;
    this.lineHeightRatio = options.lineHeight || 1.67;
    // stats
    this.count = 0;
    // working props
    this.prevX = 0;
    this.prevY = 0;
    this.prevX2 = 0;
    this.prevY2 = 0;

    this.hasSpan = false;
    this.inserted = false;
  }

  get lineHeight() {
    return this.fontHeight * this.lineHeightRatio;
  }

  addItem(item) {
    this.count++;

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
    if (x < this.x1) this.x1 = x;
    if (y < this.y1) this.y1 = y;
    if (x + w > this.x2) this.x2 = x + w;  // right edge of cell
    if (y + h > this.y2) this.y2 = y + h;  // top edge of cell

    // update font size
    let fh = item.transform[ 0 ];
    let fw = item.str ? (item.width / item.str.length) : 0;
    if (fh > this.fontHeight) this.fontHeight = fh;
    if (fw > this.fontWidth) this.fontWidth = fw;

    // position of last item added
    this.prevX = x;
    this.prevY = y;
    this.prevX2 = x + w;
    this.prevY2 = y + h;
  }

  /**
   * check if the Y boundaries overlap.
   *
   * @param {*} cell
   * @returns 0 if same line, 1 if cell is above this, -1 if cell is below this
   */
  isSameLine(cell) {
    let same = 0;

    if (cell.y1 - 1 > this.y2) // cell baseline is above this topline
      same = 1;
    else if (cell.y2 + 1 < this.y1) // cell topline is below this baseline
      same = -1

    //console.log("same: " + same);
    return same;
  }


  /**
   * check if the Y boundaries overlap.
   *
   * @param {*} cell
   * @returns
   */
  isOutputLine(cell) {
    // check if Y boundary overlaps
    let yOverlaps = (cell.y1 >= this.y1 && cell.y1 <= this.y2) || (this.y1 >= cell.y1 && this.y1 <= cell.y2);

    if (yOverlaps) {
      // if cell has wrapped then check if previous cell was a vertical span
      if ((this.x1 < cell.x1) && ((this.y2 - this.y1) < (cell.y2 - cell.y1)))
        yOverlaps = false;
    }

    return yOverlaps;
  }

  isAdjacent(item) {
    let x = item.transform[ 4 ];
    let y = item.transform[ 5 ];
    let w = item.width;
    let h = item.height;
    let x2 = x + w;

    // check if item on same line as previous item and within one character width
    // a single space should be less than average font width.
    if (Math.abs(y - this.prevY) <= (this.lineHeight * 0.125) && (x - this.prevX2 < this.fontWidth))
      return true;

    // check if item is on next line and x range overlaps cell x boundary
    if (this.hasSpan
      && (this.prevY - y) > (this.lineHeight * 0.75) && (this.prevY - y) <= (this.lineHeight * 1.25)
      && ((x >= this.x1 && x <= this.x2) || (this.x1 >= x && this.x1 <= x2)))
      return true;

    return false;
  }

  // check alignment of item relative to cell
  alignment(item) {
    let aligns = {
      top: false,
      bottom: false,
      left: false,
      right: false,
      adjacent: false
    }

    if (this.count === 0)
      return aligns;

    let x = item.transform[ 4 ];
    let y = item.transform[ 5 ];

    // horizontal alignment baseline
    if (Math.abs(y - this.y1) <= 2.0)
      aligns.bottom = true;
    // horizontal alignment topline
    if (Math.abs(y + item.height - this.y2) <= 2.0)
      aligns.top = true;
    // vertical alignment left justified
    if (Math.abs(x - this.x1) <= 2.0)
      aligns.left = true;
    // vertical alignment right justified
    if (Math.abs(x + item.width - this.x2) <= 2.0)
      aligns.right = true;

    // assume we're processing top to bottom, left to right

    // adjacent horizontal, within approximately one space
    if ((aligns.top || aligns.bottom) && Math.abs(x - this.x2) < this.fontWidth)
      aligns.adjacent = true;
    // adjacent vertical, within approximately one line space
    if ((aligns.left || aligns.right) && Math.abs((y + item.height) - this.y1) < this.fontWidth)
      aligns.adjacent = true;

    return aligns;
  }

}
