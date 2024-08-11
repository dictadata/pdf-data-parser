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
   * @param {Object}    [options]
   * @param {Object}    [options.hasHeader] - data has a header row, if true and headers set then headers overrides header row.
   * @param {String[]}  [options.headers]   - array of column names for data, default none first row contains names.
   */
  constructor(options = {}) {
    let streamOptions = {
      objectMode: true
    };
    super(streamOptions);

    this.headers = options.RowAsObject?.headers || options[ "RowAsObject.headers" ] || options.headers || [];

    //this.hasHeader = options.RowAsObject?.hasHeader || options[ "RowAsObject.hasHeader" ] || options.hasHeader;
    if (options.RowAsObject && Object.hasOwn(options.RowAsObject, "hasHeader"))
      this.hasHeader = options.RowAsObject.hasHeader;
    else if (Object.hasOwn(options, "RowAsObject.hasHeader"))
      this.hasHeader = options[ "RowAsObject.hasHeader" ];
    else if (Object.hasOwn(options, "hasHeader"))
      this.hasHeader = options.hasHeader;
    else
      this.hasHeader = !this.headers?.length;  // backwards compatibility

    this._headers;  // internal header row
  }

  /**
   * Internal call from streamWriter to process an object
   * @param {Object} row
   * @param {String} encoding
   * @param {Function} callback
   */
  _transform(row, encoding, callback) {
    if (this.hasHeader && !this._headers) {
      this._headers = row;
      if (!this.headers?.length)
        this.headers = row;
    }
    else {
      let obj = {};
      for (let i = 0; i < row.length; i++) {
        let prop = this.headers[ i ] || i;
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
