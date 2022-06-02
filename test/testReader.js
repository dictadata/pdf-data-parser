/**
 * test/testReader.js
 */

const PdfDataReader = require("../lib/PdfDataReader");
const RowTransform = require('./RowTransform');
const { finished } = require('stream/promises');
const fs = require("fs");
const path = require("path");

async function test(options) {

  let reader = new PdfDataReader(options);

  let transform = new RowTransform();

  let outputFile = "./output/PdfDataReader/" + path.parse(options.url).name + ".json";
  console.log("output: " + outputFile);
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  let writer = fs.createWriteStream(outputFile, { encoding: "utf-8", autoClose: false });

  reader.pipe(transform).pipe(writer);
  await finished(writer);
}

(async () => {
  await test({ url: "./data/pdf/helloworld.pdf", newlines: false });
  await test({ url: "./data/pdf/ClassCodes.pdf", newlines: false });
  await test({ url: "./data/pdf/Nat_State_Topic_File_formats.pdf", heading: /Government Units .*/, cells: 3 });
})();
