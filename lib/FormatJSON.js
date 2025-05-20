/**
 * lib/FormatJSON.js
 */

import { Transform } from 'stream';

/**
 * Transforms row objects to JSON strings.
 */
export default class FormatJSON extends Transform {

  constructor(options) {
    let streamOptions = {
      writableObjectMode: true,
      readableObjectMode: false
    };
    super(streamOptions);

    this.options = options || {};
    this.first = true;
  }

  /**
   * Internal call from streamWriter to process an object
   * @param {Object} row
   * @param {String} encoding
   * @param {Function} callback
   */
  _transform(row, encoding, callback) {
    if (this.first) {
      this.push("[\n");
      this.first = false;
    }
    else
      this.push(",\n");

      let text = (this.options.format === "rows") ? JSON.stringify(Object.values(row)) : JSON.stringify(row);
    this.push(text);

    callback();
  }

  /**
   *
   * @param {Function} callback
   */
  _flush(callback) {
    if (this.first)
      this.push("[\n");
    this.push("\n]\n");

    callback();
  }
};
