# pdf-data-parser 0.9.x

Parse and stream a PDF as tabular data using Node.js and Mozilla's pdf.js library.

## Installation

```bash
npm install pdfDataParser
```

## Basic Usage

```javascript
const pdfContent = require("pdfDataParser"); 

async function myFunc() {
  var rows = await pdfContent.parse({url: "filename"});
  // process the rows
}
```

## Streaming Usage

```javascript
const pdfContent = require("pdfDataParser");

var parser = pdfContent.parser({url: "filename"});
var rows = [];

parser.on('data', (row) => {
  rows.push(row)
})

parser.parse();
```

## Examples

## Notes

* Does not support cells that cross page boundaries.
