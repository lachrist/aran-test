
const TrapCategories = require("../trap-categories");

function pass () {
  return arguments[arguments.length-2];
}
const empty = () => {};

TrapCategories.producers.forEach((key) => exports[key] = pass);
TrapCategories.consumers.forEach((key) => exports[key] = pass);
TrapCategories.informers.forEach((key) => exports[key] = empty);
exports.write = (wrt, tag, val, idx) => wrt(val);
exports.apply = (fct, args, idx) => fct(...args);
exports.invoke = (obj, key, args, idx) => obj[key](...args);
exports.construct = (cst, args, idx) => new cst(...args);
exports.unary = (opr, arg, idx) => eval(opr+" arg");
exports.binary = (opr, arg1, arg2, idx) => eval("lft "+opr+" rgt");
exports.get = (obj, key, idx) => obj[key];
exports.set = (obj, key, val, idx) => obj[key] = val;
exports.delete = (obj, key, idx) => delete obj[key];
exports.array = (elms, idx) => elms;
exports.object = (prps, idx) => {
  var obj = {};
  for (var i=0; i<prps.length; i++)
    obj[prps[i][0]] = prps[i][1];
  return obj
};
