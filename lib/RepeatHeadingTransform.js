/**
 * lib/RepeatHeadingTransform.js
 */
"use strict";

const { Transform } = require('stream');

/**
 * Repeat a heading cell in following rows.
 */
module.exports = exports = class RepeatHeadingTransform extends Transform {

  /**
   *
   * @param {object} [options]
   * @param {string} [options.header] - column name for the repeating heading field
   */
  constructor(options = {}) {
    let streamOptions = {
      writableObjectMode: true,
      readableObjectMode: true
    };
    super(streamOptions);

    let ch = options["RepeatHeading.header"] || options.header || "heading:0";
    ch = ch.split(":");
    this.columnHeader = ch[ 0 ];
    this.columnIndex = (ch.length > 1) ? ch[ 1 ] : 0;

    this.repeatValue = "";
    this.count = 0;
  }

  /**
   * Internal call from streamWriter to process an object
   * @param {*} row
   * @param {*} encoding
   * @param {*} callback
   */
  _transform(row, encoding, callback) {
    this.count++;
    if (row.length === 1) {
      this.repeatValue = row[ 0 ];
    }
    else {
      if (this.count === 1)
        row.splice(this.columnIndex, 0, this.columnHeader);
      else
        row.splice(0, 0, this.repeatValue);
      this.push(row);
    }

    callback();
  }

  _flush(callback) {
    callback();
  }
};
