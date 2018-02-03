
const TrapCategories = require("../trap-categories");

const eval = global.eval;
const Reflect_apply = Reflect.apply;
const Reflect_construct = Reflect.construct;
const Array_prototype_forEach = Array.prototype.forEach;

const empty = () => {};
function pass () { return arguments[arguments.length-2] }

module.exports = (aran, join) => {
  const traps = {};
  Reflect_apply(Array_prototype_forEach, TrapCategories.producers, [(key) => traps[key] = pass]);
  Reflect_apply(Array_prototype_forEach, TrapCategories.consumers, [(key) => traps[key] = pass]);
  Reflect_apply(Array_prototype_forEach, TrapCategories.informers, [(key) => traps[key] = empty]);
  traps.eval = (value, serial) => join(value, aran.node(serial).AranStrict);
  traps.apply = (value, values, serial) => Reflect_apply(value, aran.node(serial).AranStrict ? void 0 : global, values);
  traps.invoke = (value1, value2, values, serial) => Reflect_apply(value1[value2], value1, values);
  traps.construct = (value, values, serial) => Reflect_construct(value, values);
  traps.unary = (operator, value, serial) => eval(operator+" value");
  traps.binary = (operator, value1, value2, serial) => eval("value1 "+operator+" value2");
  traps.get = (value1, value2, serial) => value1[value2];
  traps.delete = (value1, value2, serial) => delete value1[value2];
  traps.array = (values, serial) => values;
  traps.set = (value1, value2, value3, serial) => {
    value1[value2] = value3;
  };
  traps.object = (properties, serial) => {
    var object = {};
    for (let index=0; index<properties.length; index++)
      object[properties[index][0]] = properties[index][1];
    return object;
  };
  return traps;
};
