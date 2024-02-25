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

const fs = require('node:fs/promises');
const { pipeline } = require('node:stream/promises');
const { stdout } = require('node:process');

// set program argument defaults
var options = {
  url: ""
}
var outfile = "";
var format = "csv";

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
      else if (nv[ 0 ] === "--heading")
        options.heading = nv[ 1 ];
      else if (nv[ 0 ].startsWith("--repeating"))
        options.repeatingHeaders = true;
      else if (nv[ 0 ].includes("headers"))
        options.headers = nv[ 1 ].split(",");
      else if (nv[ 0 ] === "--json")
        format = "json";
    }
    ++i;
  }

}

/**
 * Program entry point.
 */
(async () => {
  let retCode = 0;

  parseArgs();
  let consoleOn = outfile !== "";

  if (consoleOn) {
    console.log("pdf-data-parser");
    console.log("Copyright 2024 Drew O. Letcher | The MIT License");
  }

  if (!options.url) {
    console.log("Parse tabular data from a PDF file.");
    console.log("");
    console.log("pdf-data-parser.js <filename.pdf>, <output-file> [--cells=#] [--heading=title], [--repeating] [--headers=name1,name2,...] [--csv|--json]");
    console.log("");
    console.log("  filename - path name or URL of PDF file to process.");
    console.log("  output-file - local path name for output of parsed data.");
    console.log("  --cells - minimum number of cells for a data row, default = 1.");
    console.log("  --heading - text of heading to find in document that precedes desired data table, default none.");
    console.log("  --repeating - table headers repeat on each PDF page, default = false.");
    console.log("  --headers - comma separated list of table headers (property names) for data, default none.")
    console.log("  --csv - output data in CSV format, default.");
    console.log("  --json - output data in JSON format.");
    console.log("");
    return;
  }

  try {

    let reader = new PdfDataReader(options);
    let transform = new RowAsObjects(options);
    let formatter = format === "json" ? new FormatJSON() : new FormatCSV();
    let writer;
    if (outfile) {
      let fd = await fs.open(outfile, "w");
      writer = fd.createWriteStream();
    }
    else
      writer = process.stdout;

    await pipeline(reader, transform, formatter, writer);

    writer.end();
  }
  catch (err) {
    console.error(err);
    retCode = 1;
  }

  if (consoleOn) {
    if (retCode === 0)
      console.log("parser results OK");
    else
      console.log(" parser failed.");
    console.log();
  }

  process.exitCode = retCode;
})();
