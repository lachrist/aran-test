
const Acorn = require("acorn");
const Astring = require("astring");
const Aran = require("aran");

module.exports = (Advice, script1) => {
  const aran = Aran({
    namespace: "META",
    output: "EstreeValid"
  });
  const join = (script, strict) => Astring.generate(
    aran.join(
      Acorn.parse(script, {loc:true}),
      Object.keys(global.META),
      strict));
  global.META = Advice(aran, join);
  const script2 = join(script1);
  try {
    return {
      script: script2,
      value: global.eval(script2)
    };
  } catch (error) {
    return {
      script: script2,
      error: error
    };
  }
};
