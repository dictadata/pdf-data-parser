#!/usr/bin/env node
/* eslint-disable node/shebang */
/**
 * pdf-data-parser
 */
"use strict";

const PdfDataReader = require("./lib/PdfDataReader.js");
const RepeatCellTransform = require("./lib/RepeatCellTransform.js");
const RepeatHeadingTransform = require("./lib/RepeatHeadingTransform.js");
const RowAsObjectTransform = require("./lib/RowAsObjectTransform.js");
const FormatCSV = require("./lib/FormatCSV.js");
const FormatJSON = require("./lib/FormatJSON.js");
const Package = require("./package.json");
var colors = require('colors');

const { open, readFile } = require('node:fs/promises');
const { pipeline } = require('node:stream/promises');
const { stdout } = require('node:process');

colors.enable();

// default program options
var options = {
  url: "",
  format: "json",
  output: "",
  cells: 1,
  lineHeight: 1.67,
  orderXY: true
}

/**
 * parseArgs
 *   only filename is required
 *   example ["node.exe", "pdf-data-parser.js", <filename.pdf|URL>, <output> "--cells=3", "--heading=title", "--repeating" "--headers=c1,c2,.." "--json|csv" ]
 */
async function parseArgs() {

  let i = 2;
  while (i < process.argv.length) {
    let arg = process.argv[ i ];

    if (arg[ 0 ] !== "-") {
      if (!options.url)
        options.url = arg;
      else
        options.output = arg;
    }
    else {
      let nv = arg.split('=');

      if (nv[ 0 ] === "--options") {
        Object.assign(options, JSON.parse(await readFile(nv[ 1 ])));
      }
      else if (nv[ 0 ] === "--cells")
        options.cells = parseInt(nv[ 1 ]);
      else if (nv[ 0 ] === "--pages")
        options.pages = nv[ 1 ];
      else if (nv[ 0 ] === "--heading")
        options.heading = nv[ 1 ];
      else if (nv[ 0 ].includes("--headers"))
        options.headers = nv[ 1 ].split(",");
      else if (nv[ 0 ].startsWith("--repeating"))
        options.repeatingHeaders = true;
      else if (nv[ 0 ] === "--format")
        options.format = nv[ 1 ];
    }
    ++i;
  }

  if (typeof options.pages === "string") {
    // convert pages arg
    let pages = options.pages.split(",")
    options.pages = []

    for (let p of pages) {
      let range = p.split("-");
      if (range.length === 1) {
        // single page
        options.pages.push(parseInt(range[ 0 ]));
      }
      else {
        // expand range into individual pages
        for (let i = parseInt(range[ 0 ]); i <= parseInt(range[ 1 ]); i++)
          options.pages.push(i);
      }
    }
  }
}

/**
 * Program entry point.
 */
(async () => {
  let retCode = 0;

  await parseArgs();
  let consoleOn = options.output !== "" || !options.url;

  if (consoleOn) {
    console.log("pdp PDF Data Parser " + Package.version);
    console.log("Copyright 2024 Drew O. Letcher | The MIT License");
  }

  if (!options.url) {
    console.log("");
    console.log("Parse tabular data from a PDF file.");
    console.log("");
    console.log("pdp [--options=filename.json] <filename.pdf|URL> [<output>] [--cells=#] [--heading=title], [--repeating] [--headers=name1,name2,...] [--csv|--json]");
    console.log("");
    console.log("  --options    - file containing JSON object with pdp options, optional.");
    console.log("  filename|URL - path name or URL of PDF file to process, required.");
    console.log("  output       - local path name for output of parsed data, default stdout.");
    console.log("  --format     - output data format CSV, JSON or raw, default JSON, raw is JSON array of arrays (rows).");
    console.log("  --cells      - minimum number of cells for a data row, default = 1.");
    console.log("  --heading    - text of heading to find in document that precedes desired data table, default none.");
    console.log("  --headers    - comma separated list of column names for data, default none first table row contains names.");
    console.log("  --repeating  - table header row repeats on each PDF page, default = false.");
    console.log("");
    return;
  }

  try {

    let pipes = [];

    let reader = new PdfDataReader(options);
    pipes.push(reader);

    if (Object.hasOwn( options,  "RepeatCell.column") || Object.hasOwn( options, "column")) {
      let transform = new RepeatCellTransform(options);
      pipes.push(transform);
    }

    if (Object.hasOwn( options, "RepeatHeading.header") || Object.hasOwn( options, "header")) {
      let transform = new RepeatHeadingTransform(options);
      pipes.push(transform);
    }

    if (options.format !== "raw") {
      let transform = new RowAsObjectTransform(options);
      pipes.push(transform);
    }

    let formatter = options.format === "csv" ? new FormatCSV() : new FormatJSON();
    pipes.push(formatter);

    let writer;
    if (options.output) {
      let fd = await open(options.output, "w");
      writer = fd.createWriteStream();
    }
    else
      writer = process.stdout;
    pipes.push(writer);

    await pipeline(pipes);

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
