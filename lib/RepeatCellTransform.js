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
   * @param {Object} options
   * @property {Number} options.column column index of cell to repeat, default 0
   */
  constructor(options = {}) {
    let streamOptions = {
      writableObjectMode: true,
      readableObjectMode: true
    };
    super(streamOptions);

    this.column = options["RepeatCell.column"] || options.column || 0;
    this.prevLen = 0;
    this.repeatValue = "";
  }

  /**
   * Internal call from streamWriter to process an object
   * @param {*} row
   * @param {*} encoding
   * @param {*} callback
   */
  _transform(row, encoding, callback) {
    if (row.length === this.prevLen - 1) {
      row.splice(0, 0, this.repeatValue);
    }
    else {
      this.repeatValue = row[ this.column ];
    }
    this.prevLen = row.length;

    this.push(row);
    callback();
  }

  _flush(callback) {
    callback();
  }
};
