
const Aran = require("aran");
const Acorn = require("acorn");
const Astring = require("astring");
const Print = require("../print.js");

module.exports = (aran, join) => {
  const aran = Aran({
    namespace: "META",
    output: "EstreeValid"
  });
  global.META = Object.create(null);

  const join = (script, parent) => Astring.generate(Acorn.parse(aran.join(script, [], parent)));
  return Run(join);
  return {
    terminate: (success, value, serial) => {
      if (success)
        return 
    }};

  };
