# pdf-data-parser 1.0.x

Parse and stream a PDF as tabular data using Node.js and Mozilla's pdf.js library.

## Installation

```bash
npm install pdf-data-parser
```

## Overview

---

PdfDataParser given a PDF document will output an array of arrays (rows).  With default settings PdfDataParser will output all rows in the document. Using [PdfDataParser Options](#pdf-data-parser-options) the parser can filter for the desired data table in the document.

PdfDataParser only works on a certain subset of PDF documents specifically those that contain some type of tabular data in a grid/table format. The parser uses marked content and x,y position information returned by the Mozilla [pdf.js](https://github.com/mozilla/pdf.js) API to turn PDF content items into rows of cells.

Rows and Cells terminology is used instead of Rows and Columns because the text positioning in a PDF document flows more like an HTML page than database query results. Some rows may have more cells than other rows. For example a heading or description paragraph will be a row (array) with one cell (string).  See [Notes](#notes) below.

### Basic Usage

```javascript
const { PdfDataParser } = require("pdf-data-parser"); 

let parser = new PdfDataParser({url: "filename.pdf"});

async function myFunc() {
  var rows = await parser.parse();
  // process the rows
}
```

### PdfDataParser Options

PdfDataParser constructor takes an options object with the following fields.

`{string|URL} url` - The local path or URL of the PDF document; required.

`{string|regexp} heading` - Section heading in the document after which the parser will look for tabular data; optional, default: none. The parser does a string comparison or match looking for first occurence of `heading` value in the first cell of rows, row[0]. If not specified then data output starts with first row of the document.

`{integer} cells` - Minimum number of cells in tabular data; optional, default: 1. After `heading` string is found parser will look for the first row that contains at least `cells` count of cells. The parser will output rows until it encounters a row with less than `cells` count of cells.

`{boolean} newlines` - Preserve new lines in cell data; optional, default: false. When false newlines will be replaced by spaces. Preserving newlines characters will keep the formatting of multiline text such as descriptions. Though, newlines are problematic for cells containing multiword identifiers and keywords that might be wrapped in the PDF text.

## Streaming Usage

---

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

reader.on('error', (err) => {
  // log error
})
```

### PdfDataParser Options

PdfDataReader constructor options are the same as [PdfDataParser Options](#pdf-data-parser-options).

## Streaming As Objects

---

PdfDataReader operates in Object Mode. The reader outputs arrays (rows). To convert the rows into a JSON objects use the RowAsObjects transform.

```javascript
const { PdfDataReader, RowAsObjects } = require("pdf-data-parser");
const { pipeline } = require('node:stream/promises');

let reader = new PdfDataReader(options);
let transform1 = new RowAsObjects(options);
let writer = <some writable that can handle Object Mode data>

await pipeline(reader, transform1, writer);
```

### RowAsObjects Options

RowAsObjects constructor takes an options object with the following fields.

`{array} headers` - array of cell property names; optional, default: none. If a headers array is not specified then parser will assume the first row found contains cell property names.

If a row is encountered with more cells than headers array then extra cell property names will be the ordinal position. For example: `{ ..., "4": value, "5": value }`.

## Examples

---

### Hello World

[HelloWorld.pdf](./test/data/pdf/helloworld.pdf) is a single page PDF document with the string "Hello, world!" positioned on the page. The parser output is one row with one cell.

```json
[
  ["Hello, world!"]
]
```

To transform the row array into an object specify the headers option to RowAsObjects transform.

```javascript
let transform = new RowAsObjects({ 
  headers: [ "Greeting" ] 
})
```

Output as JSON objects:

```json
[
  { "Greeting": "Hello, world!" }
]
```

### Census.gov Class Codes

[ClassCodes.pdf](./test/data/pdf/ClassCodes.pdf) contains one simple table spanning multiple pages. It is a straight forward parsing of all rows in the document.

```javascript
let parser = new PdfDataParser({ url: "https://www2.census.gov/geo/pdfs/reference/ClassCodes.pdf" })
```

Parser output:

```json
[
  ["Class Code","Class Code Description","Associated Geographic Entity"],
  ["A1","Airport with scheduled commercial flights that also serves as a military installation","Locality Point, Military Installation"],
   ...
  ["Z9","County subdivision not defined","County Subdivision"]
]
```

### USGS.gov File Specification

[Nat_State_Topic_File_formats.pdf](./test/data/pdf/Nat_State_Topic_File_formats.pdf) contains USGS file formats for various downloadable reference files.  It is a rather complicated example containing multiple tables of data interspersed with headings, descriptive paragraphs, vertical column spans, cells split across pages and embedded hyperlinks.  See [Notes](#notes) below.

For this example the parser will look for tabular data following the heading "Government Units File Format" found on pages 6 and 7 in [Nat_State_Topic_File_formats.pdf](./test/data/pdf/Nat_State_Topic_File_formats.pdf).

```javascript
let parser = new PdfDataParser({  
  url: "https://geonames.usgs.gov/docs/pubs/Nat_State_Topic_File_formats.pdf",  
  heading: "Government Units File Format",  
  cells: 3  
})
```

Parser output:

```json
[
  ["Name","Type","Length/Decimals","Description"],
  ["Feature ID","Number","10","ID number for the governmental unit."],
  ["Unit Type","Character","50","Type of government unit."],
  ...,
  ["Country Name","Character","100"],
  ["Feature Name","Character","120","Official feature name"]
]
```

## Notes

---

* Only supports PDF files containing table-like layouts. Does not support reading PDF forms.
* Tables that span multiple pages are supported. Though, proper parsing of individual cells crossing page boundaries is not supported, currently. The cell will be split into multiple rows. The second row may not contain the proper number of cells, i.e. missing values are not supported, currently.
* Embedded hyperlinks are not supported. The link information is not provided by pdf.js API.
* Does not support identification of titles, headings, column headers, etc. by using style information for a cell. This style information is not provided by pdf.js API.
* Vertical spanning cells are parsed with first row where the cell is encountered. Subsequent rows will not contain the cell and have one less cell. Currently, vertical spanning cells must be at the end of the row otherwise the ordinal position of cells in the following rows may be incorrect, i.e. missing values are not supported, currently.
