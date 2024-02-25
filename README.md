# @dictadata/pdf-data-parser 1.2.6

Parse, search and stream PDF tabular data using Node.js with Mozilla's PDF.js library.

This document explains how to use pdf-data-parser in your code or as a stand-alone program.

> Only supports PDF files containing grid/table like layouts. Does not support reading PDF forms (XFA).

## Installation

For use as command line utility. Requires Node.js 18+.

```bash
npm -g install @dictadata/pdf-data-parser
```

For use as module in a Node.js project. See Developers Guide below.

```bash
npm install @dictadata/pdf-data-parser
```

## CLI Program

Parse tabular data from a PDF file or URL.

```bash
pdp <filename.pdf|URL> [<output-file>] [--cells=#] [--heading=title], [--repeating] [--headers=name1,name2,...] [--csv|--json]

  `filename|URL` - path name or URL of PDF file to process, required.
  `output-file`  - local path name for output of parsed data, default stdout.
  `--cells`      - minimum number of cells for a data row, default = 1.
  `--heading`    - text of heading to find in document that precedes desired data table, default none.
  `--headers`    - comma separated list of column names for data, default none first table row contains names.
  `--repeating`  - table headers repeat on each PDF page, default = false.
  `--csv`        - output data in CSV format.
  `--json`       - output data in JSON format, default.
  `--raw`        - output text in the document as JSON array of arrays.
```

Note: If the `pdp` command conflicts with another program on your system use `pdfdataparser` instead.

### Examples

```bash
pdp ./test/data/pdf/helloworld.pdf --headers=Greeting --csv
```

```bash
pdp https://sos.iowa.gov/elections/pdf/VRStatsArchive/2024/CoJan24.pdf --cells=8 --repeating
```

## Developer Guide

---

PdfDataParser given a PDF document will output an array of arrays (rows). For most projects use the streaming classes PdfDataReader and RowAsObjects transform to convert the arrays to Javascript objects.  With default settings PdfDataParser will output all rows in the document including headings and paragraphs. Using [PdfDataParser Options](#pdf-data-parser-options) the parser can filter content to retrieve the desired data table in the document.

PdfDataParser only works on a certain subset of PDF documents specifically those that contain some type of tabular data in a grid/table format. The parser uses __marked content__ items and x,y position information returned by the Mozilla [pdf.js](https://github.com/mozilla/pdf.js) API to transform PDF content items into rows of cells.

Rows and Cells terminology is used instead of Rows and Columns because the marked content in a PDF document flows more like an HTML page than database query results. Some rows may have more cells than other rows. For example a heading or description paragraph will be a row (array) with one cell (string).  See [Notes](#notes) below.

> <font color="red">Warning: PDF document does not contain Marked Content</font>
>
> If the PDF document does not contain marked content the parser will display a console warning. In this case PdfDataParser may not be able to reliably parse data in the document based solely on x,y positioning.

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

Common Options:

`{string|regexp} heading` - Section heading in the document after which the parser will look for tabular data; optional, default: none. The parser does a string comparison or regexp match looking for first occurrence of `heading` value in the first cell of rows. If not specified then data output starts with first row of the document that contains enough cells.

`{integer} cells` - Minimum number of cells in tabular data; optional, default: 1. If `heading` is not specified then all rows in document with at least `cells` length will be output. If `heading` string is found parser will look for the first row that contains at least `cells` count of cells after the heading. The parser will output rows until it encounters a row with less than `cells` count of cells.

`{Boolean} repeatingHeaders` - Indicates if table headers are repeated on each page, default: false. The table headers will be compare to the first row on each subsequent page.  If found they will be removed from the output.

Other Options:

`{boolean} newlines` - Preserve new lines in cell data; optional, default: false. When false newlines will be replaced by spaces. Preserving newlines characters will keep the formatting of multiline text such as descriptions. Though, newlines are problematic for cells containing multi-word identifiers and keywords that might be wrapped in the PDF text.

`{Boolean} artifacts` - Parse artifacts content, default: false. Artifacts content specifies objects on the page such as table/grid lines and table headers/footers. Grid lines do not have text content, but table headers and footers might. If page headers and footers show up in output try the pageHeader and pageFooter options.

`{Integer} pageHeader` - Height of page header area in points, default: 0. Content within this area of the page will not be included in output. Use about 16 points per line including blank lines.

`{Integer} pageFooter` - Height of page footer area in points, default: 0. Content within this area of the page will not be included in output. Use about 16 points per line including blank lines.

`{Integer} lineHeight` - Approximate line height ratio based on font size; default 1.67. The parser extracts font size from the pdf content. The line height ratio maybe used when comparing the position of content items on the page.

## Streaming Usage

---

### PdfDataReader

PdfDataReader is a Node.js stream reader implemented with the Object mode option. It uses PdfDataParser to stream one data row (array) per chunk.

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

## RowAsObjects

---

PdfDataReader operates in Object Mode. The reader outputs arrays (rows). To convert rows into Javascript objects use the RowAsObjects transform.  PdfDataReader also operates in Object mode where a chunk is a Javascript Object of <name,value> pairs.

```javascript
const { PdfDataReader, RowAsObjects } = require("pdf-data-parser");
const { pipeline } = require('node:stream/promises');

let reader = new PdfDataReader(options);
let transform1 = new RowAsObjects(options);
let writable = <some writable that can handle Object Mode data>

await pipeline(reader, transform1, writable);
```

### RowAsObjects Options

RowAsObjects constructor takes an options object with the following fields.

`{array} headers` - array of cell property names; optional, default: none. If a headers array is not specified then parser will assume the first row found contains cell property names.

If a row is encountered with more cells than in the headers array then extra cell property names will be the ordinal position. For example if the data contains five cells, but only three headers where specified.  Specifying `options = { headers: [ 'name', 'type', 'info' ] }` then the Javascript objects in the stream will contain `{ "name": "value1", "type": "value2", "info": "value3", "4": "value4", "5": "value5" }`.

### FormatCSV and FormatJSON

The `pdfdataparser` CLI program uses the FormatCSV and FormatJSON transforms to covert Javascript Objects into strings that can be saved to a file.

```javascript
const { PdfDataReader, RowAsObjects, FormatCSV } = require("pdf-data-parser");
const { pipeline } = require('node:stream/promises');

let reader = new PdfDataReader(options);
let transform1 = new RowAsObjects(options);
let transform2 = new FormatCSV();

await pipeline(reader, transform1, transform2, process.stdout);
```

## Examples

---

### Hello World

[HelloWorld.pdf](./test/data/pdf/helloworld.pdf) is a single page PDF document with the string "Hello, world!" positioned on the page. The PdfDataParser output is one row with one cell.

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

Note that `cells: 3` was specified even though the output has four cells.  The fourth cell of this table sometimes contains a vertical spanning cell.  Specifying `cells: 4` would cause the parser to short circuit on the row after the vertical span, because it would only contain three cells.

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

### State of Iowa Voter Registration Totals by County

[CoJul22.pdf](./test/data/pdf/CoJul22.pdf) contains one simple table spanning multiple pages. This document contains page headers and footers with repeating table headers on each page. Use the _repeatingHeaders_ option to remove the extra table headers from output data.

```javascript
let parser = new PdfDataParser({ url: "./data/pdf/CoJul22.pdf", repeatingHeaders: true })
```

The page headers/footers in this document are in PDF.js _Artifacts_ marked content. They will be ignored by default. To output the page headers and footers use the _artifacts_ option.

```javascript
let parser = new PdfDataParser({ url: "./data/pdf/CoJul22.pdf", artifacts: true })
```

If your document has page headers/footers contained in regular content items then the headers/footers can be ignored by using the _pageHeader_ and _pageFooter_ options.  The settings of 50 and 35 ignore 3 and 2 lines respectively.

```javascript
let parser = new PdfDataParser({ url: "./data/pdf/CoJul22.pdf", pageHeader: 50, pageFooter: 35 })
```

### State of Iowa Voter Registration Totals by Congressional District

[CongJul22.pdf](./test/data/pdf/CongJul22.pdf) contains four tables. This document contains page headers and footers.

> An oddity of this document is there is an additional table header row that identifies each table. This content item, e.g. "US Representative District 1", is actually in the document content after the table. The PdfDataParser has specialized logic to insert the cell data in the appropriate flow order before output of data rows.

PdfDataParser does not support the splitting of output so the file would need to be read four times with separate `heading` options or read all together and then hand edit the output. Alternatively, a custom Node.js stream transform or writer derived class could be used to split the data into multiple outputs.

```javascript
parser1 = new PdfDataParser({ url: "./data/pdf/CongJul22.pdf", heading: "US Representative District 1", cells: 12 })
house1 = await parser.parse();
parser2 = new PdfDataParser({ url: "./data/pdf/CongJul22.pdf", heading: "US Representative District 2", cells: 12 })
house2 = await parser.parse();
parser3 = new PdfDataParser({ url: "./data/pdf/CongJul22.pdf", heading: "US Representative District 3", cells: 12 })
house3 = await parser.parse();
parser3 = new PdfDataParser({ url: "./data/pdf/CongJul22.pdf", heading: "US Representative District 4", cells: 12 })
house3 = await parser.parse();
```

## Notes

---

* Only supports PDF files containing grid/table like layouts. Does not support reading PDF forms (XFA).
* Tables that span multiple pages are supported as long as all cell text for an individual row is on the same page.
* Cells crossing page boundaries is not supported, currently. The cell will be split into multiple rows. The second row may not contain the proper number of cells, i.e. missing values are not supported, currently.
* Embedded hyperlinks are not supported. The link information is not provided by pdf.js API.
* Does not support identification of titles, headings, column headers, etc. by using style information for a cell. This style information is not provided by pdf.js API.
* Vertical spanning cells are parsed with first row where the cell is encountered. Subsequent rows will not contain the cell and have one less cell. Currently, vertical spanning cells must be at the end of the row otherwise the ordinal position of cells in the following rows will be incorrect, i.e. missing values are not supported.
