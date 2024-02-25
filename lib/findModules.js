const { access, constants } = require("node:fs/promises");
const { parse, join } = require("node:path");

module.exports = exports = async () => {
  let dir = __dirname;

  let found = false;
  let dp = parse(dir);

  while (!found && dir !== dp.root) {
    // Check if node_modules is readable.
    try {
      let nm = join(dir, "node_modules");
      await access(nm, constants.R_OK);
      found = true;
    }
    catch {
      dir = dp.dir;
      dp = parse(dir);
    }
  }

  return found ? join(dir, "/node_modules") : "";
}
