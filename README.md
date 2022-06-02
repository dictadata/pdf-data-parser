# pdf-data-parser 0.9.x

Parse and stream a PDF as tabular data using Node.js and Mozilla's pdf.js library.

## Installation

```bash
npm install pdfDataParser
```

## Basic Usage

```javascript
const { PdfDataParser } = require("pdf-data-parser"); 

let parser = new PdfDataParser({url: "filename.pdf"});

async function myFunc() {
  var rows = await parser.parse();
  // process the rows
}
```

## Streaming Usage

```javascript
const { PdfDataReader } = require("pdf-data-parser"); 

let reader = new PdfDataReader({url: "filename.pdf"});
var rows = [];

reader.on('data', (row) => {
  rows.push(row)
});

reader.on('end', () => {
  // do something with the rows
});
```

## Examples

[HelloWorld.pdf](./data/pdf/helloworld.pdf)

```json
[
  ["Hello, world!"]
]
```

Census file format from [Nat_State_Topic_File_formats.pdf](./data/pdf/Nat_State_Topic_File_formats.pdf) in section "Government Units File Format".

```json
[
  ["Name","Type","Length/Decimals","Description"],
  ["Feature ID","Number","10","The Feature ID number for the governmental unit."],
  ["Unit Type","Character","50","The type of government unit. Values are County, State, Country."],
  ...,
  ["Country Name","Character","100"],
  ["Feature Name","Character","120","Official feature name"]
]
```

## Notes

* Only supports PDF files with simple tabular format. Does not support reading PDF forms.
* Does not support cells that cross page boundaries.
