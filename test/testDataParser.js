/**
 * test/testParser.js
 */

const PdfDataParser = require("../lib/PdfDataParser");
const fs = require("fs");
const path = require("path");
const compareFiles = require("./_compareFiles");

async function test(options) {
  let pdfDataParser = new PdfDataParser(options);
  let rows = await pdfDataParser.parse();

  let outputFile = "./output/PdfDataParser/" + path.parse(options.url).name + ".json";
  console.log("output: " + outputFile);
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, JSON.stringify(rows, null, 2));

  let expected = outputFile.replace("/output/", "/expected/");
  let exitCode = compareFiles(expected, outputFile, 2);
  return exitCode;
}

(async () => {
  if (await test({ url: "./data/pdf/helloworld.pdf" })) return 1;
  if (await test({ url: "https://www2.census.gov/geo/pdfs/reference/ClassCodes.pdf", newlines: false })) return 1;
  if (await test({ url: "./data/pdf/Nat_State_Topic_File_formats.pdf", heading: "Government Units File Format", cells: 3 })) return 1;
  if (await test({ url: "./data/pdf/CoJul22.pdf", repeatingHeaders: true })) return 1;
  if (await test({ url: "./data/pdf/CongJul22.pdf", artifacts: true, pageHeader: 50, pageFooter: 35 })) return 1;
})();
