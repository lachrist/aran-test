
const Aran = require("aran");
const Acorn = require("acorn");
const Astring = require("astring");
const ForwardTraps = require("../forward-traps.js");

const Reflect_apply = Reflect.apply;

module.exports = () => {
  const aran = Aran({
    namespace: "META",
    output: "EstreeValid"
  });
  const join = (script, parent) => Astring.generate(Acorn.parse(aran.join(script, keys, parent)));
  global.META = Object.assign(Object.create(null), ForwardTraps);
  global.META.eval = (script, serial) => join(script, aran.node(serial));
  global.META.apply = (value, values, serial) => Reflect_apply(value, aran.node(serial).AranStrict ? void 0 : global, values);
  const keys = Reflect.ownKeys(global.META);
  return Run(join);
};
