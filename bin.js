
const Fs = require("fs");
const Util = require("util");
const Path = require("path");
const AranTest = require("./main.js");

if (process.argv.length !== 4) {
  process.stderr.write("usage: node bin.js advice.js script[.js]\n");
  process.exit(1);
}

const sanitize = (filename) => filename !== ".DS_Store";
const trailing = (pathname) => pathname[pathname.length-1] === "/" ? pathname : pathname + "/";
const trail = (string, size) => {
  while (string.length < size)
    string += " ";
  return string;
};

if (/\.js$/.test(process.argv[3])) {
  const Advice = require(Path.resolve(process.argv[2]));
  const test = AranTest(Advice, Fs.readFileSync(process.argv[3], "utf8"));
  console.log(test.script);
  console.log(test.success ? "Success" : "Failure");
  console.log(Util.inspect(test.value, {depth:10,colors:true}));
} else {
  const Advice = require(Path.resolve(process.argv[2]));
  const failures = [];
  Fs.readdirSync(process.argv[3]).filter(sanitize).forEach((filename) => {
    const test = AranTest(Advice, Fs.readFileSync(trailing(process.argv[3])+filename, "utf8"));
    console.log(trail(filename, 25), test.success ? "Success" : "Failure");
    if (!test.success)
      failures.push(filename);
  });
  if (failures.length) {
    console.log("\nFailures:\n  "+failures.join("\n  "));
  } else {
    console.log("No failure");
  }
}
