/**
 * test/testObjectTransform.js
 */

import { PdfDataReader, RowAsObjectTransform } from "../lib/index.js";
import FormatJSON from '../lib/FormatJSON.js';
import { pipeline } from 'node:stream/promises';
import fs from "node:fs";
import path from "node:path";
import compareFiles from "./_compareFiles.js";

async function test(options) {

  let reader = new PdfDataReader(options);

  let transform1 = new RowAsObjectTransform(options);
  let transform2 = new FormatJSON();

  let outputFile = "./test/output/RowAsObjectTransform/" + path.parse(options.url).name + ".json";
  console.log("output: " + outputFile);
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  let writer = fs.createWriteStream(outputFile, { encoding: "utf-8", autoClose: false });

  await pipeline(reader, transform1, transform2, writer);

  let expectedFile = outputFile.replace("/output/", "/expected/");
  let exitCode = compareFiles(outputFile, expectedFile, 2);
  return exitCode;
}

(async () => {
  if (await test({ url: "./test/data/pdf/helloworld.pdf", headers: [ "Greeting" ] })) return 1;
  if (await test({ url: "./test/data/pdf/ClassCodes.pdf", newlines: false })) return 1;
  if (await test({ url: "./test/data/pdf/Nat_State_Topic_File_formats.pdf", heading: "Government Units File Format", cells: 3, orderXY: false })) return 1;
  if (await test({ url: "./test/data/pdf/CoJul22.pdf", repeatingHeaders: true })) return 1;
  if (await test({ url: "./test/data/pdf/CongJul22.pdf", cells: 12 })) return 1;
  if (await test({ url: "./test/data/pdf/state_voter_registration_jan2024.pdf", pages: [ 3,4,5 ], pageHeader: 64, repeatingHeaders: true })) return 1;
})();
