/**
 * lib/RowAsObjectTransform.js
 */
"use strict";

const { Transform } = require('stream');

/**
 * Transforms row data to JSON objects.
 */
module.exports = exports = class RowAsObjectTransform extends Transform {

  /**
   * If headers are not set in options then the first row seen is assumed to be the headers.
   *
   * @param {object}    [options]
   * @param {string[]}  [options.headers] - array of column names for data, default none, first table row contains names.
   */
  constructor(options = {}) {
    let streamOptions = {
      writableObjectMode: true,
      readableObjectMode: true
    };
    super(streamOptions);

    this.headers = options[ "RowAsObject.headers" ] || options.headers || undefined;
  }

  /**
   * Internal call from streamWriter to process an object
   * @param {*} row
   * @param {*} encoding
   * @param {*} callback
   */
  _transform(row, encoding, callback) {
    if (!this.headers) {
      this.headers = row;
    }
    else {
      let obj = {};
      for (let i = 0; i < row.length; i++) {
        let prop = (i < this.headers.length) ? this.headers[ i ] : i;
        obj[ prop ] = row[ i ];
      }
      this.push(obj);
    }
    callback();
  }
/*
  _flush(callback) {
    callback();
  }
*/
};
