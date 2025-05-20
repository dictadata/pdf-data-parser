/**
 * test/testRepeatCell.js
 */

import { PdfDataReader, RowAsObjectTransform, RepeatCellTransform } from "../lib/index.js";
import FormatJSON from '../lib/FormatJSON.js';
import { pipeline } from 'node:stream/promises';
import fs from "node:fs";
import path from "node:path";
import compareFiles from "./_compareFiles.js";

async function test(options) {

  let reader = new PdfDataReader(options);

  let transform1 = new RepeatCellTransform(options);
  let transform2 = new RowAsObjectTransform(options);
  let transform3 = new FormatJSON();

  let outputFile = "./test/output/RepeatCell/" + path.parse(options.url).name + ".json";
  console.log("output: " + outputFile);
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  let writer = fs.createWriteStream(outputFile, { encoding: "utf-8", autoClose: false });

  await pipeline(reader, transform1, transform2, transform3, writer);

  let expectedFile = outputFile.replace("/output/", "/expected/");
  let exitCode = compareFiles(outputFile, expectedFile, 2);
  return exitCode;
}

(async () => {
  if (await test({
    url: "./test/data/pdf/state_voter_registration_jan2024.pdf",
    pages: [ 1 ],
    pageHeader: 64,
    cells: 7,
    repeatingHeaders: true,
    "RepeatCell.column": 0
  })) return 1;
})();
