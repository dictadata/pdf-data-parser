#!/usr/bin/env node
/* eslint-disable node/shebang */
/**
 * pdf-data-parser
 */
"use strict";

import PdfDataReader from "./lib/PdfDataReader.js";
import RepeatCellTransform from "./lib/RepeatCellTransform.js";
import RepeatHeadingTransform from "./lib/RepeatHeadingTransform.js";
import RowAsObjectTransform from "./lib/RowAsObjectTransform.js";
import FormatCSV from "./lib/FormatCSV.js";
import FormatJSON from "./lib/FormatJSON.js";
import { parse } from "jsonc-parser";
import Package from "./package.json" with { type: 'json' };
import colors from 'colors';

import { open, readFile } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';
import { stdout } from 'node:process';

colors.enable();

// default program options
var options = {
  url: "",
  format: "json",
  output: "",
  cells: "1-256",
  lineHeight: 1.67,
  orderXY: true,
  trim: true
}

/**
 * parseArgs
 *   only filename is required
 *   example ["node.exe", "pdf-data-parser.js", <filename.pdf|URL>, <output> "--cells=3", "--heading=title", "--repeating" "--headers=c1,c2,.." "--format=csv|json|rows" ]
 */
async function parseArgs() {
  let clOptions = {}; // command line options
  let ofOptions = {}; // options file options
  let optionsfile = "pdp.options.json";

  let i = 2;
  while (i < process.argv.length) {
    let arg = process.argv[ i ];

    if (arg[ 0 ] !== "-") {
      if (!clOptions.url)
        clOptions.url = arg;
      else
        clOptions.output = arg;
    }
    else {
      let nv = arg.split('=');

      if (nv[ 0 ] === "--options")
        optionsfile = nv[ 1 ];
      else if (nv[ 0 ] === "--password")
        clOptions.password = nv[ 1 ];
      else if (nv[ 0 ] === "--cells")
        clOptions.cells = parseInt(nv[ 1 ]);
      else if (nv[ 0 ] === "--pages")
        clOptions.pages = nv[ 1 ];
      else if (nv[ 0 ] === "--heading")
        clOptions.heading = nv[ 1 ];
      else if (nv[ 0 ].includes("--headers"))
        clOptions.headers = nv[ 1 ].split(",");
      else if (nv[ 0 ].startsWith("--repeating"))
        clOptions.repeatingHeaders = true;
      else if (nv[ 0 ] === "--format")
        clOptions.format = nv[ 1 ].toLowerCase();
    }
    ++i;
  }

  if (typeof clOptions.pages === "string") {
    // convert pages arg
    let pages = clOptions.pages.split(",")
    clOptions.pages = []

    for (let p of pages) {
      let range = p.split("-");
      if (range.length === 1) {
        // single page
        clOptions.pages.push(parseInt(range[ 0 ]));
      }
      else {
        // expand range into individual pages
        for (let i = parseInt(range[ 0 ]); i <= parseInt(range[ 1 ]); i++)
          clOptions.pages.push(i);
      }
    }
  }

  if (optionsfile) {
    try {
      let opts = await readFile(optionsfile, { encoding: 'utf8' });
      let perrors = [];
      let poptions = {
        disallowComments: false,
        allowTrailingComma: true,
        allowEmptyContent: false
      };
      ofOptions = parse(opts, perrors, poptions)
    }
    catch (err) {
      if (err.code !== 'ENOENT' || optionsfile != "pdp.options.json")
        throw err;
    }
  }

  Object.assign(options, ofOptions, clOptions);
}

/**
 * Program entry point.
 */
(async () => {
  let retCode = 0;

  await parseArgs();

  let stdoutput = options.output === "" || !options.url;

  if (!stdoutput) {
    console.log("pdp PDF Data Parser " + Package.version);
    console.log("Copyright 2024 Drew O. Letcher | The MIT License");
  }

  if (!options.url) {
    console.log("");
    console.log("Parse tabular data from a PDF file.");
    console.log("");
    console.log("pdp <filename.pdf|URL> <output> --options=filename.json --cells=# --heading=title, --repeating --headers=name1,name2,... --format=csv|json|rows");
    console.log("");
    console.log("  filename|URL - path name or URL of PDF file to process, required.");
    console.log("  output       - local path name for output of parsed data, default stdout.");
    console.log("  --options    - file containing JSON object with pdp options, default: pdp.options.json.");
    console.log("  --password   - password for decrypting the PDF document, optional.");
    console.log("  --format     - output data format CSV, JSON, or ROWS (JSON array of arrays), default JSON.");
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

    if (options?.format !== "rows") {
      let transform = new RowAsObjectTransform(options);
      pipes.push(transform);
    }

    let formatter = options?.format === "csv" ? new FormatCSV(options) : new FormatJSON(options);
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

    if (options.output)
      writer.end();
  }
  catch (err) {
    console.error(err.message.red);
    retCode = 1;
  }

  if (!stdoutput) {
    if (retCode === 0)
      console.log("parser results OK".green);
    else
      console.log(" parser failed.".red);
  }

  process.exitCode = retCode;
})();
