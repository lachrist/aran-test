
const stringify = JSON.stringify;
const isArray = Array.isArray;

module.exports = () {
  const identities = new WeakMap(); 
  let counter = 1;
  return (value) => {
    if (typeof value === "string")
      return stringify(value);
    if (!value || value === true || typeof value === "number" || typeof value === "symbol")
      return String(value);
    let identity = identities.get(value);
    if (!identity)
      identities.set(value, identity = counter++);
    return (isArray(value) ? "array" : typeof value) + "#" + identity;
  };
};
