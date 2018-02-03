
const String = global.String;
const WeakMap = global.WeakMap;
const TypeError = global.TypeError;
const Error = global.Error;
const eval = global.eval;
const Reflect_apply = Reflect.apply;
const Reflect_construct = Reflect.construct;
const Reflect_getPrototypeOf = Reflect.getPrototypeOf;
const Reflect_ownKeys = Reflect.ownKeys;
const Reflect_getOwnPropertyDescriptor = Reflect.getOwnPropertyDescriptor;
const Reflect_defineProperty = Reflect.defineProperty;
const Reflect_get = Reflect.get;
const Reflect_set = Reflect.set;
const JSON_stringify = JSON.stringify;
const Object_create = Object.create;
const Array_isArray = Array.isArray;
const Array_prototype_map = Array.prototype.map;
const Array_prototype_includes = Array.prototype.includes;
const WeakMap_prototype_get = WeakMap.prototype.get;
const WeakMap_prototype_set = WeakMap.prototype.set;
const WeakMap_prototype_has = WeakMap.prototype.has;

const proxies = new WeakMap();
const Proxy = global.Proxy = ((() => {
  const RealProxy = global.Proxy;
  return function Proxy (target, traps) {
    if (!new.target)
      throw new TypeError("Constructor Proxy requires 'new'");
    const proxy = new RealProxy(target, traps);
    Reflect_apply(WeakMap_prototype_set, proxies, [proxy, {target:target, traps:traps}]);
    return proxy;
  };
}) ());

const bindings = new WeakMap();
bindings.set(global, "global");
bindings.set(Object.prototype, "Object.prototype");
bindings.set(Array.prototype, "Array.prototype");
bindings.set(Function.prototype, "Function.prototype");
bindings.set(String.prototype, "String.prototype");
bindings.set(Number.prototype, "Number.prototype");
bindings.set(Boolean.prototype, "Boolean.prototype");
bindings.set(Error.prototype, "Error.prototype");

module.exports = (aran, join) => {

  let callstack = [global];
  let stack = [];
  const internals = new WeakMap();

  const reify = (serial, value) => {
    const store = [];
    const jsonify = (value) => {
      if (Reflect_apply(WeakMap_prototype_has, bindings, [value]))
        return Reflect_apply(WeakMap_prototype_get, bindings, [value]);
      if (value === null || typeof value === "boolean" || typeof value === "number" || typeof value === "string")
        return value;
      if (value === void 0)
        return ["undefined"];
      let pointer = 0;
      while (store[pointer] !== value && pointer < store.length)
        pointer++;
      if (pointer === store.length)
        store[pointer] = value;
      return ["pointer", pointer];
    };
    const state = {
      serial: serial,
      value: jsonify(value),
      stack: Reflect_apply(Array_prototype_map, stack, [jsonify]),
      callstack: Reflect_apply(Array_prototype_map, callstack, [jsonify]),
      store: {}
    };
    for (let index = 0; index < store.length; index++) {
      if (typeof store[index] === "symbol") {
        state.store[index] = {
          type: "symbol",
          name: String(store[index])
        };
      } else if (Reflect_apply(WeakMap_prototype_has, proxies, [store[index]])) {
        const inner = Reflect_apply(WeakMap_prototype_get, proxies, [store[index]]);
        astate.store[index] = {
          type: "proxy",
          target: jsonify(inner.target),
          traps: jsonify(inner.traps)
        };
      } else {
        state.store[index] = {
          type: Array.isArray(store[index]) ? "array" : typeof store[index],
          prototype: jsonify(Reflect_getPrototypeOf(store[index])),
          dictionnary: Reflect_apply(Array_prototype_map, Reflect_ownKeys(store[index]), [(key) => {
            const descriptor = Reflect_getOwnPropertyDescriptor(store[index], key);
            descriptor.key = key;
            if ("value" in descriptor) {
              descriptor.value = jsonify(descriptor.value)
            } else {
              descriptor.get = jsonify(descriptor.get);
              descriptor.set = jsonify(descriptor.set);
            }
            return descriptor;
          }])
        };
        if (Reflect_apply(WeakMap_prototype_has, internals, [store[index]])) {
          const inner = Reflect_apply(WeakMap_prototype_get, internals, [store[index]]);
          state.store[index].frame = jsonify(inner.frame);
          state.store[index].serial = jsonify(inner.serial);
          state.store[index].location = jsonify(aran.node(inner.serial).loc);
        }
      }
    }
    return state;
  };

  const error = (message, serial, value) => new Error(message+"\n"+JSON.stringify(reify(serial, value), null, 2));

  /////////////////
  // Environment //
  /////////////////

  const enter = (tag, serial) => {
    frame = Object_create(callstack[callstack.length-1]);
    frame["@tag"] = tag;
    frame["@serial"] = serial;
    callstack[callstack.length-1] = frame;
  };

  const leave = (tag, serial) => {
    const frame = callstack[callstack.length-1];
    if (tag !== frame["@tag"])
      throw error("Environments tag mismatch; expected: "+frame["@tag"]+", got: "+tag, serial, null);
    if (serial !== frame["@serial"])
      throw error("Environments serial mismatch; expected: "+frame["@serial"]+", got: "+serial, serial, null);
    callstack[callstack.length-1] = Reflect_getPrototypeOf(frame);
  };

  const lookup = (node, serial) => {
    console.log("lookup", node.AranIndex, serial);
    while (node.AranIndex !== serial) {
      node = node.AranParent;
      if (!node)
        throw error("Unmatched serial: "+frame["@serial"], serial, null);
    }
    return node;
  }

  ///////////
  // Stack //
  ///////////

  const produce = (value, reason, serial) => stack[stack.length] = value;

  const consume = (value, reason, serial) => {
    if (value !== stack[stack.length-1])
      throw error("Stack consume mismatch ("+reason+")", serial, value);
    stack.length--;
    return value;
  };

  //////////////
  // Specials //
  //////////////

  const traps = {};

  traps.copy = (position, value, serial) => {
    if (value !== stack[stack.length-1])
      throw error("Stack copy mismatch", serial, value);
    for (let index = stack.length; index >= stack.length - position; index--)
      stack[index] = stack[index-1];
    stack[stack.length-1-position] = stack[stack.length-1];
    return value;
  };

  traps.set = (value1, value2, value3, serial) => {
    consume(value3, "set-value", serial);
    consume(value2, "set-key", serial);
    consume(value1, "set-object", serial);
    value1[value2] = value3;
  };

  ///////////////
  // Producers //
  ///////////////

  traps.read = (identifier, value, serial) => {
    if (value !== callstack[callstack.length-1][identifier])
      throw error("Environment read mismatch: "+identifier, serial, value);
    return produce(value, "read", serial);
  };

  traps.builtin = (identifier, value, serial) => produce(value, "builtin", serial);

  traps.this = (value, serial) => produce(value, "this", serial);

  traps.newtarget = (value, serial) => produce(value, "newtarget", serial);

  traps.arguments = (values, serial) => produce(values, "arguments", serial);

  traps.primitive = (value, serial) => produce(value, "primitive", serial);

  traps.regexp = (value, serial) => produce(value, "regexp", serial);

  traps.closure = (value, serial) => {
    let wrapper = function () {
      if (callstack.length > 1 || callstack[0] !== global)
        return new.target ? Reflect_construct(value, arguments) : Reflect_apply(value, this, arguments);
      try {
        var result = new.target ? Reflect_construct(value, arguments) : Reflect_apply(value, this, arguments);
        if (stack.length)
          throw error("Stack poluted", serial, null);
        if (callstack.length !== 1 || callstack[0] !== global)
          throw error("CallStack poluted", serial, null);
      } catch (error) {
        stack = [];
        callstack = [global];
        throw error;
      }
    };
    Reflect_apply(WeakMap_prototype_set, internals, [wrapper, {frame:callstack[callstack.length-1], serial:serial}]);
    return produce(wrapper, "closure", serial);
  };

  traps.discard = (identifier, value, serial) => produce(value, "discard", serial);

  // Either an error is thrown or it is not.
  // If an error is thrown the catch block will clean the environment
  // If not, the environment is cleaned in the usual way.
  traps.catch = (value, serial) => {
    while (callstack.length) {
      for (let frame = callstack[callstack.length-1]; frame; frame = Reflect_getPrototypeOf(frame)) {
        if (frame["@tag"] === "try") {
          callstack[callstack.length-1] = Reflect_getPrototypeOf(frame);
          enter("catch", serial);
          return produce(value, "catch", serial);
        }
      }
      callstack.length--;
    }
    throw error("Unmatched try/catch", serial, null);
  };

  ///////////////
  // Consumers //
  ///////////////

  traps.drop = (value, serial) => consume(value, "drop", serial);

  traps.test = (value, serial) => consume(value, "test", serial);

  traps.throw = (value, serial) => consume(value, "throw", serial);

  traps.terminate = (success, value, serial) => {
    for (let frame = callstack[0]; Reflect_getPrototypeOf(frame) !== global; frame = Reflect_getPrototypeOf(frame))
      var initial = frame["@serial"] === serial;
    if (success) {
      leave(aran.node(serial).AranStrict ? "closure" : "block", serial);
      consume(value, "terminate", serial);
      if (initial) {
        if (stack.length)
          throw error("Stack poluted", serial, null);
        if (callstack.length !== 1 || callstack[0] !== global)
          throw error("Callstack poluted", serial, null);
      }
    } else if (initial) {
      stack = [];
      callstack = [global];
    }
    return value;
  };

  traps.return = (value, serial) => {
    let node = aran.node(serial);
    for (var frame = callstack[callstack.length-1]; frame["@tag"] !== "closure"; frame = Reflect_getPrototypeOf(frame))
      node = lookup(node, frame["@serial"]);
    lookup(node, frame["@serial"]);
    callstack.length--;
    return consume(value, "return", serial);
  };

  traps.write = (identifier, value, serial) => {
    for (let frame = callstack[callstack.length-1]; frame !== global; frame = Reflect_getPrototypeOf(frame))
      if (Reflect_apply(Array_prototype_includes, Reflect_ownKeys(frame), [identifier]))
        return frame[identifier] = consume(value, "write", serial);
    return consume(value, "write", serial);
  };

  traps.declare = (kind, identifier, value, serial) => {
    let frame = callstack[callstack.length-1];
    if (kind === "var")
      while (frame["@tag"] !== "closure" && frame !== global)
        frame = Reflect_getPrototypeOf(frame);
    if (frame !== global)
      Reflect_defineProperty(frame, identifier, {
        enumerable: true,
        configurable: kind !== "const",
        writable: kind !== "const",
        value: value
      });
    return consume(value, "declare", serial);
  };

  ((() => {
    const ptraps = {
      get: (target, key, receiver) => {
        if (key === "@tag")
          return "with";
        if (key === "@serial")
          return target.serial;
        if (key in target.object)
          return Reflect_get(target.object, key, receiver);
        return Reflect_get(target.prototype, key, receiver);
      },
      set: (target, key, value, receiver) => {
        if (key in target.object)
          return Reflect_set(target.object, key, receiver);
        return Reflect_set(target.prototype, key, receiver);
      },
      ownKeys: (target) => {
        let keys = [];
        for (let key in target.object)
          keys[keyts.length] = key;
        return keys;
      },
      getPrototypeOf: (target) => target.prototype
    };
    traps.with = (value, serial) => {
      callstack[callstack.length-1] = new Proxy({
        object: value,
        parent: callstack[callstack.length-1]
      }, ptraps);
      return consume(value, "with", serial);
    };
  }) ());

  traps.eval = (value, serial) => {
    consume(value, "eval", serial);
    return join(value, aran.node(serial).AranStrict);
  };

  ///////////////
  // Informers //
  ///////////////

  traps.callee = (value, serial) => {
    callstack[callstack.length] = Reflect_apply(WeakMap_prototype_get, internals, [value]).frame;
    enter("closure", serial);
  };

  traps.block = (serial) => {
    enter("block", serial);
  };

  traps.try = (serial) => {
    enter("try", serial);
  };

  traps.finally = (serial) => {
    enter("finally", serial);
  };

  traps.label = (label, boolean, serial) => {
    enter("label", serial);
    callstack[callstack.length-1]["@label"] = (boolean ? "Continue" : "Break") + (label||"");
  };

  traps.leave = (tag, serial) => {
    leave(tag, serial);
  };

  traps.program = (serial) => {
    enter(aran.node(serial).AranStrict ? "closure" : "block", serial);
  };

  traps.break = (label, boolean, serial) => {
    label = (boolean ? "Continue" : "Break") + (label||"");
    let node = aran.node(serial);
    for (var frame = callstack[callstack.length-1]; frame["@label"] !== label; frame = Reflect_getPrototypeOf(frame)) {
      if (frame["@tag"] === "closure" || frame === global)
        throw error("Unmatched label: "+label, serial, null);
      node = lookup(node, frame["@serial"]);
    }
    lookup(node, frame["@serial"]);
    console.log("break", frame, Reflect_getPrototypeOf(frame));
    callstack[callstack.length-1] = Reflect_getPrototypeOf(frame);
  };

  ///////////////
  // Combiners //
  ///////////////

  traps.invoke = (value1, value2, values, serial) => {
    for (let index = values.length-1; index >= 0; index--)
      consume(values[index], "invoke-argument-"+index, serial);
    consume(value2, "invoke-key", serial);
    consume(value1, "invoke-object", serial);
    return produce(Reflect_apply(value1[value2], value1, values), "invoke", serial);
  };

  traps.construct = (value, values, serial) => {
    for (let index = values.length-1; index >= 0; index--)
      consume(values[index], "construct-argument-"+index, serial);
    consume(value, "construct-constructor", serial);
    return produce(Reflect_construct(value, values), "construct", serial);
  };

  traps.apply = (value, values, serial) => {
    for (let index = values.length-1; index >= 0; index--)
      consume(values[index], "apply-argument-"+index, serial);
    consume(value, "apply-callee", serial);
    return produce(Reflect_apply(value, aran.node(serial).AranStrict ? void 0 : global, values), "apply", serial);
  };

  traps.unary = (operator, value, serial) => {
    consume(value, "unary-argument", serial);
    return produce(eval(operator+" value"), "unary", serial)
  };

  traps.binary = (operator, value1, value2, serial) => {
    consume(value2, "binary-right", serial);
    consume(value1, "binary-left", serial);
    return produce(eval("value1 "+operator+" value2"), "binary", serial);
  };

  traps.get = (value1, value2, serial) => {
    consume(value2, "get-key", serial);
    consume(value1, "get-object", serial);
    return produce(value1[value2], "get", serial);
  };

  exports.delete = (value1, value2, serial) => {
    consume(value2, "delete-key", serial);
    consume(value1, "delete-object", serial);
    return produce(delete value1[value2], "delete", serial);
  };

  traps.array = (values, serial) => {
    for (let index = values.length-1; index >= 0; index--)
      consume(values[index], "array-element-"+index, serial);
    return produce(values, "array", serial);
  };

  traps.object = (properties, serial) => {
    const result = {};
    for (let index = properties.length-1; index >= 0; index--) {
      consume(properties[index][1], "object-key-"+index, serial);
      consume(properties[index][0], "object-value-"+index, serial);
      result[properties[index][0]] = properties[index][1];
    }
    return produce(result, "object", serial);
  };

  return traps;

};