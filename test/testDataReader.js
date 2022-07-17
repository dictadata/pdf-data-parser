/**
 * test/testReader.js
 */

const PdfDataReader = require("../lib/PdfDataReader");
const RowTransform = require('./_RowTransform');
const { finished } = require('stream/promises');
const fs = require("fs");
const path = require("path");
const compareFiles = require("./_compareFiles");

async function test(options) {

  let reader = new PdfDataReader(options);

  let transform = new RowTransform();

  let outputFile = "./output/PdfDataReader/" + path.parse(options.url).name + ".json";
  console.log("output: " + outputFile);
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  let writer = fs.createWriteStream(outputFile, { encoding: "utf-8", autoClose: false });

  reader.pipe(transform).pipe(writer);
  await finished(writer);

  let expected = outputFile.replace("/output/", "/expected/");
  let exitCode = compareFiles(expected, outputFile, 1);
  return exitCode;
}

(async () => {
  if (await test({ url: "./data/pdf/helloworld.pdf", newlines: false })) return 1;
  if (await test({ url: "./data/pdf/ClassCodes.pdf", newlines: false })) return 1;
  if (await test({ url: "./data/pdf/Nat_State_Topic_File_formats.pdf", heading: /Government Units .*/, cells: 3 })) return 1;
  if (await test({ url: "./data/pdf/CoJul22.pdf", pageHeader: 50, pageFooter: 35, repeatingHeaders: true })) return 1;
  if (await test({ url: "./data/pdf/CongJul22.pdf", pageHeader: 50, pageFooter: 35 })) return 1;
})();
