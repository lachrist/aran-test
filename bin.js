
const Fs = require("fs");
const Path = require("path");
const AranTest = require("./main.js");

if (process.argv.length !== 4) {
  process.stderr.write("usage: node bin.js advice.js script[.js]\n");
  process.exit(1);
}

const sanitize = (filename) => filename !== ".DS_Store";
const trailing = (pathname) => pathname[pathname.length-1] === "/" ? pathname : pathname + "/";

if (/\.js$/.test(process.argv[3])) {
  const Advice = require(Path.resolve(process.argv[2]));
  const test = AranTest(
    Advice,
    Fs.readFileSync(process.argv[3], "utf8"));
  console.log(test.script);
  if ("value" in test) {
    console.log("Success "+JSON.stringify(test.value, null, 2));
  } else {
    console.log("Failure "+JSON.stringify(test.error, null, 2));
  }
} else {
  const Advice = require(Path.resolve(process.argv[2]));
  const failures = [];
  Fs.readdirSync(process.argv[3]).filter(sanitize).forEach((filename) => {
    const test = AranTest(
      Advice,
      Fs.readFileSync(trailing(process.argv[3])+filename, "utf8"));
    test.filename = filename;
    delete test.script;
    console.log(
      JSON.stringify(test, null, 2));
    if (test.failure)
      failures[failures.length] = filename;
  });
  if (failures.length) {
    console.log("No failure")
  } else {
    console.log("Failures:\n"+failures.join("\n"));
  }
}
