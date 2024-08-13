
/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/
 */
/**
 * pdf-junction/pdfDataReader
 */
"use strict";

const PdfDataParser = require("./PdfDataParser");
const { Readable } = require('stream');

module.exports = class PdfDataReader extends Readable {

  /**
   *
   * @param {Object}           options
   * @param {String|URL}       options.url
   * @param {String|ArrayBuffer} options.data
   * @param {any}              see PdfDataParser for all options
   */
  constructor(options) {
    let streamOptions = {
      objectMode: true,
      highWaterMark: 16,
      autoDestroy: false
    };
    super(streamOptions);

    this.options = options || {};
    this.parser;
  }

  async _construct(callback) {
    let parser = this.parser = new PdfDataParser(this.options);
    var reader = this;

    parser.on('data', (row) => {
      if (row) {
        if (!reader.push(row)) {
          parser.pause();  // If push() returns false stop reading from source.
        }
      }
    });

    parser.on('end', () => {
      reader.push(null);
    });

    parser.on('error', (err) => {
      console.error(err);
      //throw err;
    });

    callback();
  }

  /**
   * Fetch data from the underlying resource.
   * @param {Number} size number of bytes to read asynchronously
   */
  async _read(size) {
    // ignore size
    try {
      if (!this.parser.started)
        this.parser.parse();
      else
        this.parser.resume();
    }
    catch (err) {
      this.push(null);
    }
  }

};
