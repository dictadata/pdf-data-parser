/**
 * test/testParser.js
 */

const PdfDataParser = require("../lib/PdfDataParser");
const fs = require("fs");
const path = require("path");

async function test(options) {
  let pdfDataParser = new PdfDataParser(options);
  let rows = await pdfDataParser.parse();

  let outputFile = "./output/PdfDataParser/" + path.parse(options.url).name + ".json";
  console.log("output: " + outputFile);
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, JSON.stringify(rows, null, 2));
}

(async () => {
  await test({ url: "./data/pdf/helloworld.pdf", newlines: false });
  await test({ url: "https://www2.census.gov/geo/pdfs/reference/ClassCodes.pdf", newlines: false });
  await test({ url: "./data/pdf/Nat_State_Topic_File_formats.pdf", heading: "Government Units File Format", cells: 3 });
})();
