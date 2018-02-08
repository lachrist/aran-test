
const String = String;
const JSON_stringify = JSON.stringify;
const Array_isArray = Array.isArray;

const print = (value) => {
  if (typeof value === "string")
    return JSON_stringify(value);
  if (value === null || value === void 0 || value === true || value === false || typeof value === "number" || typeof value === "symbol")
    return String(value);
  if (typeof value === "function")
    return "function("+(value.name||"")+")";
  if (Array_isArray(value)) {
    if (value.length === 0)
      return "[]";
    if (value.length === 1)
      return "["+print(value[0]);
    return "["+print(value[0])+",...]";
  }
  for (const key in value)
    return "{"+JSON.stringify(key)+":"+print(value[key])+",...}";
  return "{}";
};

module.exports = print;
