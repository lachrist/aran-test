
const Forward = require("./forward.js");

Object.keys(Forward).forEach((key) => exports[key] = (...args) => {
  console.log(key, ...args);
  return Forward[key](...args);
});
