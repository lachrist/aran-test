
const Fs = require("fs");
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
  const test = Advice()(Fs.readFileSync(process.argv[3], "utf8"));
  console.log(test.script);
  if ("value" in test) {
    console.log("success", test.value);
  } else {
    console.log("failure", test.error);
  }
} else {
  const Advice = require(Path.resolve(process.argv[2]));
  const failures = [];
  Fs.readdirSync(process.argv[3]).filter(sanitize).forEach((filename) => {
    const test = Advice()(Fs.readFileSync(process.argv[3], "utf8"));
    if ("value" in test) {
      console.log(trail(filename, 25), "success", test.value);
    } else {
      console.log(trail(filename, 25), "failure", test.error);
      failures[failures.length] = filename;
    }
  });
  if (failures.length) {
    console.log("\nFailures:\n  "+failures.join("\n  "));
  } else {
    console.log("No failure");
  }
}
