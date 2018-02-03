
const Forward = require("./forward.js");

const Reflect_apply = Reflect.apply;
const Reflect_ownKeys = Reflect.ownKeys;
const console = global.console;
const console_log = console.log;
const Array_prototype_forEach = Array.prototype.forEach;
const Array_prototype_concat = Array.prototype.concat;

module.exports = (aran, join) => {
  const traps = {};
  const ftraps = Forward(aran, join);
  Reflect.apply(Array_prototype_forEach, Reflect.ownKeys(ftraps), [(key) => {
    traps[key] = function () {
      const array = Reflect.apply(Array_prototype_concat, [key+"@"+arguments[arguments.length-1]], [arguments]);
      Reflect.apply(console_log, console, array);
      return Reflect.apply(ftraps[key], null, arguments);
    };
  }]);
  return traps;
};
