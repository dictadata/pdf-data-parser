/**
 * test/testReader.js
 */

const { PdfDataReader, RowAsObjects } = require("../lib");
const RowTransform = require('./RowTransform');
const { pipeline } = require('node:stream/promises');
const fs = require("fs");
const path = require("path");

async function test(options) {

  let reader = new PdfDataReader(options);

  let transform1 = new RowAsObjects(options);
  let transform2 = new RowTransform();

  let outputFile = "./output/RowAsObjects/" + path.parse(options.url).name + ".json";
  console.log("output: " + outputFile);
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  let writer = fs.createWriteStream(outputFile, { encoding: "utf-8", autoClose: false });

  await pipeline(reader, transform1, transform2, writer);
}

(async () => {
  await test({ url: "./data/pdf/helloworld.pdf", headers: [ "Greeting" ] });
  await test({ url: "./data/pdf/ClassCodes.pdf", newlines: false });
  await test({ url: "./data/pdf/Nat_State_Topic_File_formats.pdf", heading: "Government Units File Format", cells: 3 });
})();
