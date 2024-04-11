/**
 * test/testRepeatHeading.js
 */

const { PdfDataReader, RowAsObjectTransform, RepeatHeadingTransform } = require("../lib");
const FormatJSON = require('../lib/FormatJSON');
const { pipeline } = require('node:stream/promises');
const fs = require("fs");
const path = require("path");
const compareFiles = require("./_compareFiles");

async function test(options) {

  let reader = new PdfDataReader(options);

  let transform1 = new RepeatHeadingTransform(options);
  let transform2 = new RowAsObjectTransform(options);
  let transform3 = new FormatJSON();

  let outputFile = "./output/RepeatHeading/" + path.parse(options.url).name + ".json";
  console.log("output: " + outputFile);
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  let writer = fs.createWriteStream(outputFile, { encoding: "utf-8", autoClose: false });

  await pipeline(reader, transform1, transform2, transform3, writer);

  let expected = outputFile.replace("/output/", "/expected/");
  let exitCode = compareFiles(expected, outputFile, 2);
  return exitCode;
}

(async () => {
  if (await test({
    url: "./data/pdf/state_voter_registration_jan2024.pdf",
    pages: [ 2 ],
    pageHeader: 64,
    "RepeatHeading.header": "County:1"
  })) return 1;
})();
