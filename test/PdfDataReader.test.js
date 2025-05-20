/**
 * test/testReader.js
 */

import PdfDataReader from "../lib/PdfDataReader.js";
import FormatJSON from '../lib/FormatJSON.js';
import { finished } from 'node:stream/promises';
import fs from "node:fs";
import path from "node:path";
import compareFiles from "./_compareFiles.js";

async function test(options) {
  try {
    let outputName = path.parse(options.url || options.data).name;

    if (options.data) {
      options.data = new Uint8Array(fs.readFileSync(options.data));
      outputName += "_data";
    }

    let reader = new PdfDataReader(options);

    let transform = new FormatJSON();

    let outputFile = "./test/output/PdfDataReader/" + outputName + ".json";
    console.log("output: " + outputFile);
    fs.mkdirSync(path.dirname(outputFile), { recursive: true });
    let writer = fs.createWriteStream(outputFile, { encoding: "utf-8", autoClose: false });

    reader.pipe(transform).pipe(writer);
    await finished(writer);

    let expectedFile = outputFile.replace("/output/", "/expected/");
    let exitCode = compareFiles(outputFile, expectedFile, 2);
    return exitCode;
  }
  catch (err) {
    console.error(err);
    return 1;
  }
}

(async () => {
  if (await test({ url: "./test/data/pdf/helloworld.pdf" })) return 1;
  if (await test({ url: "http://dev.oby4.org/data/US/census.gov/reference/ClassCodes.pdf", newlines: false })) return 1;
  if (await test({ url: "./test/data/pdf/Nat_State_Topic_File_formats.pdf", heading: /Official short names, .*/, stopHeading: /.* File Format/, orderXY: false })) return 1;
  if (await test({ url: "./test/data/pdf/CoJul22.pdf", repeatingHeaders: true })) return 1;
  if (await test({ url: "./test/data/pdf/CongJul22.pdf" })) return 1;
  if (await test({ url: "./test/data/pdf/state_voter_registration_jan2024.pdf", pages: [ 3, 4, 5 ], pageHeader: 64, repeatingHeaders: true })) return 1;

  if (await test({ data: "./test/data/pdf/helloworld.pdf" })) return 1;
  if (await test({ data: "./test/data/pdf/ClassCodes.pdf", newlines: true })) return 1;
})();
