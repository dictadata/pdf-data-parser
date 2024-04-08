#!/usr/bin/env node
/* eslint-disable node/shebang */
/**
 * pdf-data-parser
 */
"use strict";

const PdfDataParser = require("./lib/PdfDataParser.js");
const PdfDataReader = require("./lib/PdfDataReader.js");
const RowAsObjects = require("./lib/RowAsObjects.js");
const FormatCSV = require("./lib/FormatCSV.js");
const FormatJSON = require("./lib/FormatJSON.js");
const Package = require("./package.json");
var colors = require('colors');

const fs = require('node:fs/promises');
const { pipeline } = require('node:stream/promises');
const { stdout } = require('node:process');

colors.enable();

// set program argument defaults
var options = {
  url: ""
}
var outfile = "";
var format = "json";

/**
 * parseArgs
 *   only filename is required
 *   example ["node.exe", "pdf-data-parser.js", <pdf-filename>, <output-filename> "--cells=3", "--heading=title", "--repeating" "--headers=c1,c2,.." "--json|csv" ]
 */
function parseArgs() {

  let i = 2;
  while (i < process.argv.length) {
    let arg = process.argv[ i ];

    if (arg[ 0 ] !== "-") {
      if (!options.url)
        options.url = arg;
      else
        outfile = arg;
    }
    else {
      let nv = arg.split('=');
      if (nv[ 0 ] === "--cells")
        options.cells = parseInt(nv[ 1 ]);
      if (nv[ 0 ] === "--pages")
        options.pages = nv[ 1 ].split(",");
      else if (nv[ 0 ] === "--heading")
        options.heading = nv[ 1 ];
      else if (nv[ 0 ].includes("headers"))
        options.headers = nv[ 1 ].split(",");
      else if (nv[ 0 ].startsWith("--repeating"))
        options.repeatingHeaders = true;
      else if (nv[ 0 ] === "--csv")
        format = "csv";
      else if (nv[ 0 ] === "--raw")
        format = "raw";
    }
    ++i;
  }

  // convert pages arg
  // from an array of strings
  // to an array of integers
  if (options.pages) {
    let pgnums = []

    for (let p of options.pages) {
      let range = p.split("-");
      if (range.length === 1)
        pgnums.push(parseInt(range[ 0 ]));
      else {
        for (let i = parseInt(range[ 0 ]); i <= parseInt(range[ 1 ]); i++)
          pgnums.push(i);
      }
    }

    options.pages = pgnums;
  }
}

/**
 * Program entry point.
 */
(async () => {
  let retCode = 0;

  parseArgs();
  let consoleOn = outfile !== "" || !options.url;

  if (consoleOn) {
    console.log("pdfdataparser (pdp) " + Package.version);
    console.log("Copyright 2024 Drew O. Letcher | The MIT License");
  }

  if (!options.url) {
    console.log("");
    console.log("Parse tabular data from a PDF file.");
    console.log("");
    console.log("pdp <filename.pdf|URL> [<output-file>] [--cells=#] [--heading=title], [--repeating] [--headers=name1,name2,...] [--csv|--json]");
    console.log("");
    console.log("  filename|URL - path name or URL of PDF file to process, required.");
    console.log("  output-file  - local path name for output of parsed data, default stdout.");
    console.log("  --cells      - minimum number of cells for a data row, default = 1.");
    console.log("  --heading    - text of heading to find in document that precedes desired data table, default none.");
    console.log("  --headers    - comma separated list of column names for data, default none first table row contains names.")
    console.log("  --repeating  - table header row repeats on each PDF page, default = false.");
    console.log("  --csv        - output data in CSV format.");
    console.log("  --json       - output data in JSON format, default.");
    console.log("  --raw        - output text in the document as JSON array of arrays.")
    console.log("");
    return;
  }

  try {

    let reader = new PdfDataReader(options);
    let transform = new RowAsObjects(options);
    let formatter = format === "csv" ? new FormatCSV() : new FormatJSON();
    let writer;
    if (outfile) {
      let fd = await fs.open(outfile, "w");
      writer = fd.createWriteStream();
    }
    else
      writer = process.stdout;

    if (format === "raw")
      await pipeline(reader, formatter, writer);
    else
      await pipeline(reader, transform, formatter, writer);

    writer.end();
  }
  catch (err) {
    console.error(err.message.red);
    retCode = 1;
  }

  if (consoleOn) {
    if (retCode === 0)
      console.log("parser results OK");
    else
      console.log(" parser failed.".red);
    console.log();
  }

  process.exitCode = retCode;
})();
