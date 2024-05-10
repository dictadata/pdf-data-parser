
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
   * @param {object}           options
   * @param {URL|string}       options.url
   * @param {TypeArray|string} options.data
   */
  constructor(options) {
    let streamOptions = {
      objectMode: true,
      highWaterMark: 64,
      autoDestroy: false
    };
    super(streamOptions);

    this.parser;
    this.started = false;
    this.options = options || {};
  }

  async _construct(callback) {
    let parser = this.parser = new PdfDataParser(this.options);
    var reader = this;

    parser.on('data', (row) => {
      if (row) {
        // add additional processing here

        if (!reader.push(row)) {
          //parser.pause();  // If push() returns false stop reading from source.
        }
      }

    });

    parser.on('end', () => {
      reader.push(null);
    });

    parser.on('error', function (err) {
      throw err;
    });

    callback();
  }

  /**
   * Fetch data from the underlying resource.
   * @param {*} size <number> Number of bytes to read asynchronously
   */
  async _read(size) {
    // ignore size
    try {
      if (!this.started) {
        this.started = true;
        this.parser.parse();
      }
    }
    catch (err) {
      this.push(null);
    }
  }

};
