/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

// Based on source from PDF.js examples/node/getInfo.js.
//
// Basic example that outputs document metadata and content items
// including marked content to a output file in .txt or .json format.
//

const pdfjsLib = require("pdfjs-dist");
//pdfjsLib.GlobalWorkerOptions.workerSrc = '../../lib/pdfjs-dist/build/pdf.worker.js';

const fs = require("fs");
const path = require("path");

var doc;

async function getContent(options) {
  try {
    var loadingTask = pdfjsLib.getDocument({ url: options.url, fontExtraProperties: true });
    doc = await loadingTask.promise;

    const numPages = doc.numPages;
    console.log("# Document Loaded");
    console.log("Number of Pages: " + numPages);
    console.log();

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
      await loadPage(n, options);
    }

    console.log("# End of Document");
  }
  catch (err) {
    console.error("Error: " + err);
  }
}

async function loadPage(pageNum, options) {
  let output = "";

  let page = await doc.getPage(pageNum);
  console.log("Page " + pageNum);
  output += "Page " + pageNum + "\n";

  const viewport = page.getViewport({ scale: 1.0 });
  console.log("Size: " + viewport.width + "x" + viewport.height);
  output += "Size: " + viewport.width + "x" + viewport.height + "\n";

  let content = await page.getTextContent({ includeMarkedContent: true });

  if (options.outputJSON) {
    output = JSON.stringify(content.items, null, 2);
  }
  else {
    for (let item of content.items) {
      if (item.type === "beginMarkedContent") {
        output += item.type + " " + item.tag + "\n";
      }
      else if (item.type === "beginMarkedContentProps") {
        output += item.type + " " + item.tag + " " + item.id + "\n";
      }
      else if (item.type === "endMarkedContent") {
        output += item.type + "\n";
      }
      else if (item.type) {
        // unknown type
        output += item.type + " " + item.tag + " " + item.id + "\n";
      }
      else {
        // a string item
        if (item.dir !== 'ltr')  // expect direction left-to-right
          output += item.dir + "\n";

        let x = item.transform[ 4 ];
        let y = item.transform[ 5 ];
        let w = item.width;
        let h = item.height;

        output += Math.round(x * 100) / 100 + "," + Math.round(y * 100) / 100 + " "
          + Math.round(w * 100) / 100 + "," + Math.round(h * 100) / 100 + " "
          + item.hasEOL + " '" + item.str + "'" + "\n";
      }
    }
  }

  let outputFile = "./output/pdf.js/" + path.parse(options.url).name + "_content_p" + pageNum;
  outputFile += options.outputJSON ? ".json" : ".txt";
  console.log("output: " + outputFile);
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, output);

  // Release page resources.
  page.cleanup();

  console.log();
}

(async () => {
  await getContent({ url: "./data/pdf/helloworld.pdf", outputJSON: true }); 7
  await getContent({ url: "./data/pdf/ClassCodes.pdf", outputJSON: true });
  await getContent({ url: "./data/pdf/Nat_State_Topic_File_formats.pdf", outputJSON: true });
  await getContent({ url: "./data/pdf/CoJul22.pdf", outputJSON: true });
  await getContent({ url: "./data/pdf/CongJul22.pdf", outputJSON: true });
})();
