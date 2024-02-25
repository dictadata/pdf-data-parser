/**
 * test/testReader.js
 */

const { PdfDataReader, RowAsObjects } = require("../lib");
const FormatJSON = require('../lib/FormatJSON');
const { pipeline } = require('node:stream/promises');
const fs = require("fs");
const path = require("path");
const compareFiles = require("./_compareFiles");

async function test(options) {

  let reader = new PdfDataReader(options);

  let transform1 = new RowAsObjects(options);
  let transform2 = new FormatJSON();

  let outputFile = "./output/RowAsObjects/" + path.parse(options.url).name + ".json";
  console.log("output: " + outputFile);
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  let writer = fs.createWriteStream(outputFile, { encoding: "utf-8", autoClose: false });

  await pipeline(reader, transform1, transform2, writer);

  let expected = outputFile.replace("/output/", "/expected/");
  let exitCode = compareFiles(expected, outputFile, 2);
  return exitCode;
}

(async () => {
  if (await test({ url: "./data/pdf/helloworld.pdf", tableHeaders: [ "Greeting" ] })) return 1;
  if (await test({ url: "./data/pdf/ClassCodes.pdf", newlines: false })) return 1;
  if (await test({ url: "./data/pdf/Nat_State_Topic_File_formats.pdf", heading: "Government Units File Format", cells: 3 })) return 1;
  if (await test({ url: "./data/pdf/CoJul22.pdf", repeatingHeaders: true })) return 1;
  if (await test({ url: "./data/pdf/CongJul22.pdf", cells: 12 })) return 1;
})();
