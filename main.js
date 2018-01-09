
const Esprima = require("esprima");
const Escodegen = require("escodegen");
const Aran = require("aran");

module.exports = (advice, script1) => {
  global.aran = advice;
  const aran = Aran("aran");
  const root1 = Esprima.parse(script1);
  const root2 = aran.join(root1, Object.keys(advice));
  const script2 = Escodegen.generate(root2);
  try {
    return {
      script: script2,
      value: eval(script2)
    };
  } catch (error) {
    return {
      script: script2,
      error: error
    };
  }
};