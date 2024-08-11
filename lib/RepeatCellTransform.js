/**
 * lib/RepeatCellTransform.js
 */
"use strict";

const { Transform } = require('stream');

/**
 * Repeat a heading cell in following rows that have one less cell.
 */
module.exports = exports = class RepeatCellTransform extends Transform {

  /**
   *
   * @param {Object} [options]
   * @param {Number} [options.column] - column index in row to repeat, default 0
   */
  constructor(options = {}) {
    let streamOptions = {
      objectMode: true
    };
    super(streamOptions);

    this.column = options.RepeatCell?.column || options[ "RepeatCell.column" ] || options.column || 0;

    this.repeatValue = "";
    this.prevLen = 0;
  }

  /**
   * Internal call from streamWriter to process an object
   * @param {Object} row
   * @param {String} encoding
   * @param {Function} callback
   */
  _transform(row, encoding, callback) {
    if (row.length === this.prevLen - 1) {
      // missing cell
      row.splice(this.column, 0, this.repeatValue);
    }
    else if (row.length === this.prevLen && row[ this.column ] === "") {
      // empty cell
      row[ this.column ] = this.repeatValue;
    }
    else if (row.length > this.column && row[ this.column ] !== "") {
      // save value to repeat
      this.prevLen = row.length;
      this.repeatValue = row[ this.column ];
    }

    this.push(row);
    callback();
  }

  /*
  _flush(callback) {
    callback();
  }
  */
};
