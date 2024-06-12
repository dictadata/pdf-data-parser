/**
 * test/testParser.js
 */

const PdfDataParser = require("../lib/PdfDataParser");
const fs = require("fs");
const path = require("path");
const compareFiles = require("./_compareFiles");

async function test(options) {
  let outputName = path.parse(options.url || options.data).name;

  if (options.data) {
    options.data = new Uint8Array(fs.readFileSync(options.data));
    outputName += "_data";
  }

  let pdfDataParser = new PdfDataParser(options);
  let rows = await pdfDataParser.parse();

  let outputFile = "./test/output/PdfDataParser/" + outputName + ".json";
  console.log("output: " + outputFile);
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, JSON.stringify(rows, null, 2));

  let expectedFile = outputFile.replace("/output/", "/expected/");
  let exitCode = compareFiles(outputFile, expectedFile, 2);
  return exitCode;
}

(async () => {
  if (await test({ url: "./test/data/pdf/helloworld.pdf" })) return 1;
  if (await test({ url: "https://www2.census.gov/geo/pdfs/reference/ClassCodes.pdf", newlines: true })) return 1;
  if (await test({ url: "./test/data/pdf/Nat_State_Topic_File_formats.pdf", heading: "Government Units File Format", cells: 3, orderXY: false })) return 1;
  if (await test({ url: "./test/data/pdf/CoJul22.pdf", repeatingHeaders: true })) return 1;
  if (await test({ url: "./test/data/pdf/CongJul22.pdf" })) return 1;
  if (await test({ url: "./test/data/pdf/state_voter_registration_jan2024.pdf", pages: [ 3, 4, 5 ], pageHeader: 64, repeatingHeaders: true })) return 1;

  if (await test({ data: "./test/data/pdf/helloworld.pdf" })) return 1;
  if (await test({ data: "./test/data/pdf/ClassCodes.pdf", newlines: true })) return 1;
})();
