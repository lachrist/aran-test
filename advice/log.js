
const Aran = require("aran");
const Acorn = require("acorn");
const Astring = require("astring");
const ForwardTraps = require("../forward-traps.js");

const Reflect_apply = Reflect.apply;
const Object_create = Object_create;
const console = global.console;
const console_log = console.log;

module.exports = (aran, join) => {
  const traps = Object_create(null);
  traps.eval = (script, serial) => join(script, aran.node(serial));
  traps.apply = (value, values, serial) => Reflect_apply(value, aran.node(serial).AranStrict ? void 0 : global, values);
  const keys = Reflect.ownKeys(global.META);
  keys.forEach((key) => {
    global.META[key] = function () {
      const serial = arguments[arguments.length-1];
      const location = aran.node(serial).loc.start;
      const message = key+serial+"@"+location.line+":"+location.column;
      for (let index = 1, last = arguments.length-1; index < last; index++)
        message += " "+Print(arguments[index]);
      Reflect_apply(console_log, console, [message]);
      return Reflect_apply(ftraps[key], null, arguments);
    };
  });
  return (script1) => {
    const script2 = join(script1, null);
    try {
      return {script:script2, value:Jsonify($eval(script2))};
    } catch (error) {
      return {script:script2, value:}
    }
    console.log(script2);

  }
  return Run(join);
};
