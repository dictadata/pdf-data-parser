/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

// Builds upon getContent.js
//
// Advanced example that gets content items with marked content
// and groups the text into cells by comparing x, y coordinates of items.
//
// Output is an array of arrays.
//

//const pdfjsLib = require("pdfjs-dist");
//pdfjsLib.GlobalWorkerOptions.workerSrc = '../../lib/pdfjs-dist/build/pdf.worker.js';

const fs = require("fs");
const path = require("path");

var pdfPath;
var doc;

class Cell {
  /**
   *
   * @param {*} width viewport width
   * @param {*} height viewport height
   */
  constructor(width, height) {
    this.text = "";
    // cell lower-left
    this.x = width;
    this.y = height;
    // cell upper-right
    this.maxX = 0;  // max(x + width, ...)
    this.maxY = 0;  // baseline of top most string
    // stats
    this.c_str = 0;
  }
}

async function getContent() {
  try {
    const pdfjsLib = await import("pdfjs-dist");

    var loadingTask = pdfjsLib.getDocument({ url: pdfPath, fontExtraProperties: true });
    doc = await loadingTask.promise;

    const numPages = doc.numPages;
    console.log("# Document Loaded");
    console.log("Number of Pages: " + numPages);

    let docdata = await doc.getMetadata();
    console.log("# Metadata Is Loaded");
    console.log("## Info");
    console.log(JSON.stringify(docdata.info, null, 2));
    console.log();

    if (docdata.metadata) {
      console.log("## Metadata");
      console.log(JSON.stringify(docdata.metadata.getAll(), null, 2));
      console.log();
    }

    let markInfo = await doc.getMarkInfo();
    console.log("Marked = " + (markInfo && markInfo.Marked));

    for (let n = 1; n <= numPages; n++) {
      await loadPage(n);
    }

    console.log("# End of Document");
  }
  catch (err) {
    console.error("Error: " + err);
  }
}

async function loadPage(pageNum) {
  let page = await doc.getPage(pageNum);
  console.log("# Page " + pageNum);

  const { width, height } = page.getViewport({ scale: 1.0 });
  console.log("Size: " + width + "x" + height);

  let content = await page.getTextContent({ includeMarkedContent: true, disableCombineTextItems: false });

  let rows = [];
  let row = [];
  let cell = new Cell(width, height);
  let prevCell = new Cell(width, height);
  let paragraph = false;
  let span = false;
  let prevStr;

  let newlines = false; // include newlines in cells

  for (let item of content.items) {
    if (item.type === "beginMarkedContent") {
      console.log(item.type + " " + item.tag);

      switch (item.tag) {
        case "Artifact":
          break;
        default:
      }
    }
    else if (item.type === "beginMarkedContentProps") {
      console.log(item.type + " " + item.tag + " " + item.id);

      switch (item.tag) {
        case 'P':
          if (!span)
            paragraph = true;  // starting new paragraph
          else
            span = false;
          break;
        case "Span":
          span = true;  // span inside paragraph
          break;
        default:
      }
    }
    else if (item.type === "endMarkedContent") {
      console.log(item.type + " " + cell.c_str);
    }
    else if (item.type) {
      // unknown type
      console.log(item.type + " " + item.tag + " " + item.id);
    }
    else {
      // a string item
      if (item.dir !== 'ltr')  // expect direction left-to-right
        console.log(item.dir);

      let x = item.transform[ 4 ];
      let y = item.transform[ 5 ];
      let w = item.width;
      let h = item.height;
      console.log(Math.round(x * 100) / 100 + ", " + Math.round(y * 100) / 100 + " " + Math.round(w * 100) / 100
        + " " + paragraph + " " + item.hasEOL + " '" + item.str + "'");

      {
        // determine if cell should be added to row
        // when new paragraph or span isn't adjacent to previous text
        if (paragraph || (span && !adjacent(x, y, prevStr, cell))) {
          if (cell.text) {
            let text = cell.text.trimStart();
            row.push(text);
            prevCell = cell;
          }
          cell = new Cell(width, height);
        }

        // determine if row should be added to rows
        if (paragraph && item.str !== ' ' && row.length > 0) {
          //if (x <= (prevCell.x + prevCell.w) && y < prevCell.y) {
          if (x <= prevCell.maxX && y < prevCell.maxY) {
            rows.push(row);
            row = [];
            prevCell = new Cell(width, height);
          }
        }

        // check cell bounding box
        if (x < cell.x) cell.x = x;
        if (y < cell.y) cell.y = y;
        if (x + w > cell.maxX) cell.maxX = x + w - 1;
        if (y > cell.maxY) cell.maxY = y;

        // append text to cell
        cell.text += item.str;
        if (item.hasEOL)
          cell.text += newlines ? "\n" : " ";

        paragraph = false;
        cell.c_str++;
        if (w && item.str !== ' ')
          prevStr = item;
      }
    }

  }

  // process last cell
  if (cell.text) {
    let text = cell.text.trimStart();
    row.push(text);
  }
  if (row.length > 0) {
    rows.push(row);
  }

  let output = "./output/pdf.js/" + path.parse(pdfPath).name + "_cells_p" + pageNum + ".json";
  console.log("output: " + output);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(rows, null, 2));

  // Release page resources.
  await page.cleanup();

  console.log();
}

function adjacent(x, y, prevStr, cell) {
  let prevX = prevStr.transform[ 4 ];
  let prevY = prevStr.transform[ 5 ];

  // check if on some line as prevStr and within approximately two characters
  if (Math.abs(prevY - y) < 8 && (x < (prevX + prevStr.width + 24)))
    return true;

  // check if next line
  if ((prevY - y) > 8 && Math.abs(cell.x - x) < 10)
    return true;

  return false;
}

(async () => {
  // Loading file from file system into typed array
  pdfPath = process.argv[ 2 ] || "./data/pdf/helloworld.pdf";
  await getContent();
  pdfPath = "./data/pdf/ClassCodes.pdf";
  await getContent();
  pdfPath = "./data/pdf/Nat_State_Topic_File_formats.pdf";
  await getContent();
  pdfPath = "./data/pdf/CoJul22.pdf";
  await getContent();
  pdfPath = "./data/pdf/CongJul22.pdf";
  await getContent();
})();
