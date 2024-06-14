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
   * @param {object} [options]
   * @param {number} [options.column] - column index of cell to repeat, default 0
   */
  constructor(options = {}) {
    let streamOptions = {
      writableObjectMode: true,
      readableObjectMode: true
    };
    super(streamOptions);

    this.column = options["RepeatCell.column"] || options.column || 0;
    this.repeatLength = 0;
    this.repeatValue = "";
  }

  /**
   * Internal call from streamWriter to process an object
   * @param {*} row
   * @param {*} encoding
   * @param {*} callback
   */
  _transform(row, encoding, callback) {
    if (row.length === this.repeatLength && row[ this.column ] === "") {
      // empty cell
      row[ this.column ] = this.repeatValue;
    }
    else if (row.length === this.repeatLength - 1) {
      // missing cell
      row.splice(this.column, 0, this.repeatValue);
    }
    else if (row.length > this.column && row[ this.column ] !== "") {
      // save value to repeat
      this.repeatLength = row.length;
      this.repeatValue = row[ this.column ];
    }

    this.push(row);
    callback();
  }

  _flush(callback) {
    callback();
  }
};
