# pdfDataParser 2.3.x

Storage junction for PDF tabular data.

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
