/**
 * test/compare
 */
"use strict";

const fs = require('fs');
const path = require('path');
const { unzipSync } = require('zlib');

function compareText(output, expected, compareValues) {

  let outLines = output.split(/\r?\n/);
  let expLines = expected.split(/\r?\n/);

  if (outLines.length !== expLines.length) {
    console.error(`output file has different length ${outLines.length} ${expLines.length}`);
    return 1;
  }

  if (compareValues > 1) {
    for (let i = 0; i < expLines.length; i++) {
      if (outLines[ i ] !== expLines[ i ]) {
        console.error("contents of files are not equal on line: " + (i + 1));
        console.error(outLines[ i ]);
        console.error(expLines[ i ]);
        return 1;
      }
    }
  }

  return 0;
}

function compareBuffer(output, expected, compareValues) {

  let ok = (output.length === expected.length);
  if (!ok) {
    console.error(`output files have different lengths ${output.length} ${expected.length}`);
    return 1;
  }

  if (compareValues > 1) {
    let ok = expected.compare(output) === 0;
    if (!ok) {
      console.error("contents of files are not equal");
      return 1;
    }
  }

  return 0;
}

function compareCSV(output, expected, compareValues) {
  return 0;

  // using compareText for now
}

/**
 *
 * @param {*} var1 output value
 * @param {*} var2 expected value
 * @param {Number} compareValues 0 = no, 1 = compare basic values , 2 = compare dates and array lengths
 * @returns 0 if OK, 1 if different
 */
function compareJSON(var1, var2, compareValues) {
  if (!compareValues)
    return 0;

  // objects must be of same type
  if (typeof var1 !== typeof var2) {
    console.error(`objects are different types: ${typeof var1} <> ${typeof var2}`);
    return 1;
  }

  if (Array.isArray(var1)) {
    // check array lengths
    if (compareValues > 1 && var1.length !== var2.length) {
      console.error("arrays have different lengths");
      return 1;
    }

    if (compareValues > 1) {
      // check array elements
      for (let i = 0; i < var2.length; i++) {
        if (compareJSON(var1[ i ], var2[ i ], compareValues))
          return 1;
      }
    }
  }
  else if (typeof var1 === 'object') {
    let keys1 = Object.keys(var1);
    let keys2 = Object.keys(var2);
    if ((compareValues > 1) ? keys1.length != keys2.length : keys1.length < keys2.length) {
      console.error("compare object maps have different lengths");
      return 1;
    }

    // walk var2 and compare to var1
    for (let key of keys2) {
      if (!Object.hasOwn(var1, key)) {
        console.error("compare object1 does not contain property: " + key);
        return 1;
      }

      if (compareJSON(var1[ key ], var2[ key ], compareValues))
        return 1;
    }
  }
  // don't compare values of dates
  else if (compareValues > 1 && (var1 instanceof Date)) {
    return 0;
  }
  // check values of basic types
  else if (compareValues > 1 && var1 !== var2) {
    console.error(`compare value mismatch: ${var1} <> ${var2}`);
    return 1;
  }

  return 0;  // values match
}

/**
 * @param {String} filename_output filename of test output
 * @param {String} filename_expected filename of expected data
 * @param {Number} compareValues 0 = no, 1 = compare basic values , 2 = compare dates and array lengths
 * @returns 0 if OK, 1 if different
 */
module.exports = exports = function (filename_output, filename_expected, compareValues = 1) {
  console.log(">>> compare files");
  if (compareValues <= 0)
    return 0;

  try {
    let ext1 = path.extname(filename_output);
    let ext2 = path.extname(filename_expected);

    console.log(">>> " + filename_output + " === " + filename_expected);

    // unzip, if needed
    if (ext1 === ".gz")
      ext1 = path.extname(filename_output.substring(0, filename_output.length - 3));
    if (ext2 === ".gz")
      ext2 = path.extname(filename_expected.substring(0, filename_expected.length - 3));

    // compare file extensions
    if (ext1 !== ext2) {
      console.error("Compare filename extension mismatch!");
      return 1;
    }

    // read files
    let output = fs.readFileSync(filename_output, { encoding: 'utf8' });
    if (path.extname(filename_output) === '.gz')
      output = unzipSync(output);
    let expected = fs.readFileSync(filename_expected, { encoding: 'utf8' });
    if (path.extname(filename_expected) === '.gz')
      expected = unzipSync(expected);

    // choose parser
    if (ext1 === '.json')
      return compareJSON(JSON.parse(output), JSON.parse(expected), compareValues);
    else if (ext1 === '.csv')
      return compareText(output, expected, compareValues);
    else if (ext1 === '.txt')
      return compareText(output, expected, compareValues);
    else {
      console.error("compare unknown file extension");
      return 1;
    }
  }
  catch (err) {
    console.error(err);
    return 1;
  }
};
