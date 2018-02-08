
const Array_isArray = Array.isArray;

module.exports = (value) => {
  if (typeof value === "symbol")
    return ["symbol", String(value)];
  if (value === void 0)
    return ["undefined"];
  if (Array_isArray(value))
    return ["array", array.length];
  if (typeof value === "function")
    return ["function", value.name || null];
  if (typeof value === "object" && value !== null)
    return ["object"];
  return value;
};


module.exports = (value) => {
  try {
    return JSON_parse(JSON_stringify(value))
  } catch (error) {

  }
}