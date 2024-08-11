/**
 * lib/RepeatHeadingTransform.js
 *
 * Repeat a subheading cell in following rows.
 * Subheadings are rows containing a single cell interspersed in data rows.
 *
 * The options.header name is inserted in to the header row.
 * The subheading value is inserted into data rows.
 */
"use strict";

const { Transform } = require('stream');

module.exports = exports = class RepeatHeadingTransform extends Transform {

  /**
   *
   * @param {Object}  [options]
   * @param {String}  [options.header] header name inserted into header row, use suffix :n:m to specify insert index in row.
   * @param {Boolean} [options.hasHeader] data has a header row, default true
   */
  constructor(options = {}) {
    let streamOptions = {
      objectMode: true
    };
    super(streamOptions);

    let header = options.RepeatHeading?.header || options["RepeatHeading.header"] || options.header || "subheading:0";
    let cols = header.split(":");
    this.header = cols[ 0 ];
    this.headerIndex = (cols.length > 1) ? cols[ 1 ] : 0;
    this.dataIndex   = (cols.length > 2) ? cols[ 2 ] : (this.headerIndex || 0);

    if (options.RepeatHeading && Object.hasOwn(options.RepeatHeading, "hasHeader"))
      this.hasHeader = options.RepeatHeading.hasHeader;
    else if (Object.hasOwn(options, "RepeatHeading.hasHeader"))
      this.hasHeader = options[ "RepeatHeading.hasHeader" ];
    else if (Object.hasOwn(options, "hasHeader"))
      this.hasHeader = options.hasHeader;
    else
      this.hasHeader = true

    this.subHeading = "";
    this.count = 0;
  }

  /**
   * Internal call from streamWriter to process an object
   * @param {Object} row
   * @param {String} encoding
   * @param {Function} callback
   */
  _transform(row, encoding, callback) {
    this.count++;
    if (row.length === 1) {
      this.subHeading = row[ 0 ];
    }
    else {
      if (this.count === 1 && this.hasHeader)
        row.splice(this.headerIndex, 0, this.header);
      else
        row.splice(this.dataIndex, 0, this.subHeading);
      this.push(row);
    }

    callback();
  }

  /*
  _flush(callback) {
    callback();
  }
  */
};
