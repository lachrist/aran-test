
const Print = require("./util/print.js");

const String = global.String;
const WeakMap = global.WeakMap;
const TypeError = global.TypeError;
const Error = global.Error;
const Proxy = global.Proxy;
const Function = global.Function;
const eval = global.eval;
const $eval = global.eval;
const Reflect_apply = global.Reflect.apply;
const Reflect_construct = global.Reflect.construct;
const Reflect_getPrototypeOf = global.Reflect.getPrototypeOf;
const Reflect_ownKeys = global.Reflect.ownKeys;
const Reflect_getOwnPropertyDescriptor = global.Reflect.getOwnPropertyDescriptor;
const Reflect_defineProperty = global.Reflect.defineProperty;
const Reflect_get = global.Reflect.get;
const Reflect_set = global.Reflect.set;
const JSON_stringify = global.JSON.stringify;
const Object_create = global.Object.create;
const Array_isArray = global.Array.isArray;
const Array_prototype_map = global.Array.prototype.map;
const Array_prototype_forEach = global.Array.prototype.forEach;
const WeakMap_prototype_get = global.WeakMap.prototype.get;
const WeakMap_prototype_set = global.WeakMap.prototype.set;
const WeakMap_prototype_has = global.WeakMap.prototype.has;

const bindings = new WeakMap();
[
  "global",
  "Object.prototype",
  "Array.prototype",
  "Function.prototype",
  "String.prototype",
  "Boolean.prototype",
  "Error.prototype"
].forEach((name) => {
  bindings.set(eval(name), ["builtin", name]);
});

module.exports = (aran, join) => {

  const traps = Object_create(null);
  const substitutes = new WeakMap();
  Reflect_apply(WeakMap_prototype_set, substitutes, [Function, function Function () {
    if (arguments.length === 0) {
      var script = "function () {}";
    } else if (arguments.length === 1) {
      var script = "function () {"+arguments[0]+"}";
    } else {
      var script = "function ("+arguments[0];
      for (let index=1, last = arguments.length-1; index < last; index++)
        script += ","+arguments[index];
      script += "){"+arguments[arguments.length-1]+"}";
    }
    return $eval(join(script, null));
  }]);
  Reflect_apply(WeakMap_prototype_set, substitutes, [eval, function eval (script) {
    return $eval(join(script, null));
  }]);

  ///////////
  // State //
  ///////////

  const terminals = [];
  const callstack = [];
  const scopes = new WeakMap();

  /////////////////
  // Environment //
  /////////////////

  const enter = (type, serial, label, bindings) => {
    const frames = callstack[callstack.length-1].frames;
    return frames[frames.length] = {
      type: type,
      serial: serial,
      label: label,
      bindings: bindings,
      values: []
    };
  };

  const leave = (type, serial) => {
    const frames = callstack[callstack.length-1].frames;
    const frame = frames[frames.length-1];
    if (type !== frame.type)
      throw new Error("["+serial+"] Environment type mismatch. Expected: "+type+", got: "+frame.type+".");
    if (serial !== frame.serial)
      throw new Error("["+serial+"] Environments serial mismatch. Expected: "+serial+", got: "+frame.serial+".");
    frames.length--;
  };

  const lookup = (node, serial1, serial2) => {
    while (node.AranSerial !== serial1)
      if (!(node = node.AranParent))
        throw new Error("["+serial1+"] Unmatched node serial: "+serial2+".");
    return node;
  }

  ///////////
  // Stack //
  ///////////

  const produce = (value, serial) => {
    const frames = callstack[callstack.length-1].frames;
    const values = frames[frames.length-1].values;
    return values[values.length] = value;
  };

  const consume = (value1, serial) => {
    const frames = callstack[callstack.length-1].frames;
    const index = frames.length;
    while (index--) {
      const frame = frames[index];
      if (frame.values.length) {
        const value2 = frame.values[frame.values.length-1];
        if (value1 === value2 || (value1 !== value1 && value2 !== value2)) {
          frame.values.length--;
          return value;
        }
        throw new Error("["+serial+"] Consume value mismatch. Expected: "+Print(value2)+", got: "+Print(value1)+".");
      }
    }
    throw new Error("["+serial+"] Could not find any value on the callstack.");
  };

  //////////////
  // Specials //
  //////////////

  const position = (position) => {
    const index = 1;
    while (position) {

    };
    return index;
  };

  traps.swap = (position1, position2, value, serial) => {
    const frames = callstack[callstack.length-1].frames;
    const index1
    while (index--) {
      const frame = 
    }


    const frame = call[call.length-position1];
    call[call.length-position1] = call[call.length-position2];
    call[call.length-position2] = frame;
    return value;
  };

  traps.copy = (position, value, serial) => {
    const frames = callstack[callstack.length-1].frames;
    let index = frames.length;
    while (index--) {
      const values1 = frames[index1].values;
      if (position <= values1.length) {
        const values2 = frames[frames.length-1];
        values[values2.length-position] = 
        frames[frames.length-1].values
        return value;
      }
      const index = 0;
      while (index2--) {

      }
    }
    const call = callstack[callstack.length-1];
    call[call.length] = call[call.length-position];
    return value;
  };

  traps.drop = (value, serial) => {
    const call = callstack[callstack.length-1];

    call.length--;
    return value;
  };

  ///////////////
  // Producers //
  ///////////////

  traps.read = (identifier, value, serial) => {
    const call = callstack[callstack.length-1];
    let index = call.length;
    while (index--) {
      if (identifier in call[index].environment) {
        if (value !== call[index].environment[identifier])
          throw new Error("["+serial+"] Environment read mismatch: "+identifier+". Expected: "+Print(value)+", got: "+Print(call[index].environment[identifier])+".");
        if (call[index].environment === global && Reflect_apply(WeakMap_prototype_has, substitutes, [value]))
          return produce(Reflect_apply(WeakMap_prototype_get, substitutes, [value]));
        return produce(value, serial);
      }
    }
    throw new Error("["+serial+"] Environment read failure: "+identifier+".");
  };

  traps.builtin = (identifier, value, serial) => produce(value, serial);

  traps.this = (value, serial) => produce(value, serial);

  traps.newtarget = (value, serial) => produce(value, serial);

  traps.arguments = (values, serial) => produce(values, serial);

  traps.primitive = (value, serial) => produce(value, serial);

  traps.regexp = (value, serial) => produce(value, serial);

  traps.closure = (value, serial) => {
    let wrapper = function () {
      if (callstack.length)
        return new.target ? Reflect_construct(value, arguments) : Reflect_apply(value, this, arguments);
      try {
        var result = new.target ? Reflect_construct(value, arguments) : Reflect_apply(value, this, arguments);
      } catch (error) {
        callstack.length = 0;
        throw error;
      }
      if (callstack.length)
        throw new Error("["+serial+"] Stack poluted.");
      return result;
    };
    const call = callstack[callstack.length-1];
    const scope = [];
    for (var index = 0; length = call.scope.length; index < length; index++)
      scope[index] = call.scope[index];
    for (var index = 0; length = call.frames.length; index < length; index++)
      scope[scope.length] = calls.frame[index].environment;
    let scope = Reflect_apply(Array_prototype_slice, call, []);
    Reflect_apply(WeakMap_prototype_set, scopes, [wrapper, scope]);
    return produce(wrapper, serial);
  };

  traps.discard = (identifier, value, serial) => produce(value, serial);

  traps.catch = (value, serial) => {
    while (callstack.length) {
      const call = callstack[callstack.length-1];
      while (call.length) {
        const frame = call[call.length-1];
        if (frame.type === "closure") {
          call.length = 0;
        } else {
          call.length--;
          if (frame.type === "try") {
            enter("catch", serial, Object_create(null));
            return produce(value, serial);
          }
        }
      }
      callstack.length--;
    }
    throw new Error("["+serial+"] Could not find surrounding try block.");
  };

  ///////////////
  // Consumers //
  ///////////////

  traps.test = (value, serial) => consume(value, serial);

  traps.throw = (value, serial) => consume(value, serial);

  traps.terminal = (value, serial) => terminals[terminals.length-1].value = consume(value, serial);

  traps.return = (value, serial) => {
    consume(value, serial);
    const call = callstack[callstack.length-1];
    let node = aran.node(serial);
    let index = call.length;
    while (index--) {
      node = lookup(node, call[index].serial, serial);
      if (call[index].type === "closure") {
        callstack.length--;
        return value;
      }
    }
    throw error("["+serial+"] Could not find surrounding closure.");
  };

  traps.write = (identifier, value, serial) => {
    consume(value, serial);
    const call = callstack[callstack.length-1];
    let index = call.length;
    while (index--) {
      if (identifier in call[index].environment) {
        if (call[index].type !== "with")
          call[index].environment[identifier] = value;
        return value;
      }
    }
    if (aran.node(serial).AranStrict)
      throw new Error("["+serial+"] Environment write failure: "+identifier+".");
    return value;
  };

  traps.declare = (kind, identifier, value, serial) => {
    consume(value, serial);
    const call = callstack[callstack.length-1];
    let index = call.length;
    if (kind === "var") {
      while (index--) {
        if (call[index].type === "closure") {
          return call[index].environment[identifier] = value;
        }
      }
    } else {
      while (index--) {
        if (call[index].type !== "with") {
          Reflect_defineProperty(call[index].environment, identifier, {
            enumerable: true,
            configurable: false,
            writable: kind !== "const",
            value: value
          });
          return value;
        }
      }
    }
    return value;
  };

  traps.with = (value, serial) => {
    consume(value, serial);
    enter("with", serial, value);
    return value;
  };

  traps.eval = (value, serial) => {
    consume(value, serial);
    return join(value, aran.node(serial));
  };

  ///////////////
  // Informers //
  ///////////////

  traps.callee = (value, serial) => {
    const scope = Reflect_apply(WeakMap_prototype_get, scopes, [value]);
    const call = [];
    for (let index = 0, length = scope.length; index < length; index++)
      call[index] = scope[index];
    callstack[callstack.length] = call;
    enter("closure", serial, Object.create(null));
  };

  traps.block = (serial) => {
    enter("block", serial, Object.create(null));
  };

  traps.try = (serial) => {
    enter("try", serial, Object_create(null));
  };

  traps.finally = (serial) => {
    enter("finally", serial, Object_create(null));
  };

  traps.label = (boolean, label, serial) => {
    label = (boolean ? "Break" : "Continue") + (label||"");
    enter("label", serial, Object_create(null)).environment["@label"] = label;
  };

  traps.leave = (type, serial) => {
    leave(type, serial);
  };

  traps.begin = (serial) => {
    terminals[terminals.length] = {serial:serial};
    if (aran.node(serial).AranParent)
      return enter(aran.node(serial).AranStrict ? "closure" : "block", serial, Object_create(null));
    callstack[callstack.length] = [];
    enter("with", serial, global);
  };

  traps.break = (boolean, label, serial) => {
    label = (boolean ? "Break" : "Continue") + (label||"");
    let node = aran.node(serial);
    const call = callstack[callstack.length-1];
    while (call.length) {
      const frame = call[call.length-1];
      if (frame.type === "closure")
        throw new Error("["+serial+"] Could not find surrounding label block: "+label+" (hit closure). ");
      call.length--;
      node = lookup(node, frame.serial);
      if (frame.type === "label" && frame.environment["@label"] === label)
        return;
    }
    throw new Error("["+serial+"] Could not find surrounding label block: "+label+" (hit call)");
  };

  ///////////////
  // Combiners //
  ///////////////

  traps.invoke = (value1, value2, values, serial) => {
    for (let index = values.length-1; index >= 0; index--)
      consume(values[index], serial);
    consume(value2, serial);
    consume(value1, serial);
    return produce(Reflect_apply(value1[value2], value1, values), serial);
  };

  traps.construct = (value, values, serial) => {
    for (let index = values.length-1; index >= 0; index--)
      consume(values[index], serial);
    consume(value, serial);
    return produce(Reflect_construct(value, values), serial);
  };

  traps.apply = (value, values, serial) => {
    for (let index = values.length-1; index >= 0; index--)
      consume(values[index], serial);
    consume(value, serial);
    return produce(Reflect_apply(value, aran.node(serial).AranStrict ? void 0 : global, values), serial);
  };

  traps.unary = (operator, value, serial) => {
    consume(value, serial);
    return produce(eval(operator+" value"), serial)
  };

  traps.binary = (operator, value1, value2, serial) => {
    consume(value2, serial);
    consume(value1, serial);
    return produce(eval("value1 "+operator+" value2"), serial);
  };

  traps.get = (value1, value2, serial) => {
    consume(value2, serial);
    consume(value1, serial);
    let value3 = value1[value2];
    if (Reflect_apply(WeakMap_prototype_has, substitutes, [value3]))
      return produce(Reflect_apply(WeakMap_prototype_get, substitutes, [value3]));
    return produce(value3, serial);
  };

  traps.set = (value1, value2, value3, serial) => {
    consume(value3, serial);
    consume(value2, serial);
    consume(value1, serial);
    return produce(value1[value2] = value3, serial);
  };

  traps.delete = (value1, value2, serial) => {
    consume(value2, serial);
    consume(value1, serial);
    return produce(delete value1[value2], serial);
  };

  traps.array = (values, serial) => {
    for (let index = values.length-1; index >= 0; index--)
      consume(values[index], serial);
    return produce(values, serial);
  };

  traps.object = (properties, serial) => {
    const result = {};
    for (let index = properties.length-1; index >= 0; index--) {
      consume(properties[index][1], serial);
      consume(properties[index][0], serial);
      result[properties[index][0]] = properties[index][1];
    }
    return produce(result, serial);
  };

  //////////////
  // Terminal //
  ////////////// 

  traps.success = (value, serial) => {
    if (terminals[terminals.length-1].value !== value)
      throw new Error("["+serial+"] Terminal value mismatch. Expected: "+Print(terminals[terminals.length-1].value)+", got: "+Print(value));
    if (aran.node(serial).AranParent) {
      leave(aran.node(serial).AranStrict ? "closure" : "block", serial);
      return produce(value, serial);
    }
    leave("with", serial);
    if (callstack[callstack.length-1].length)
      throw new Error("["+serial+"] Callstack poluted");
    callstack.length--;
    return value;
  };

  traps.failure = (error, serial) => {
    if (terminals.length === 1)
      callstack.length = 0;
    return error;
  };

  traps.end = (serial) => {
    if (terminals[terminals.length-1].serial !== serial)
      throw new Error("["+serial+"] Terminal serial mismatch. Expected: "+terminals[terminals.length-1].serial+", got: "+serial);
    terminals.length--;
  };

  ///////////////
  // Interface //
  ///////////////

  // (function () {
  //   const ReadlineSync = require("readline-sync");
  //   const Util = require("util");
  //   const proxies = new WeakMap();
  //   Reflect_apply(WeakMap_prototype_set, substitutes, [Proxy, function Proxy (target, traps) {
  //     if (new.target === void 0) // https://github.com/jsdom/webidl2js/issues/78
  //       throw new TypeError("Constructor Proxy requires 'new'");
  //     const proxy = new Proxy(target, traps);
  //     Reflect_apply(WeakMap_prototype_set, proxies, [proxy, {target:target, traps:traps}]);
  //     return proxy;
  //   }]);
  //   const reify = (key, values) => {
  //     const store = [];
  //     const jsonify = (value) => {
  //       if (Reflect_apply(WeakMap_prototype_has, bindings, [value]))
  //         return Reflect_apply(WeakMap_prototype_get, bindings, [value]);
  //       if (value === null || typeof value === "boolean" || typeof value === "number" || typeof value === "string")
  //         return value;
  //       if (value === void 0)
  //         return ["undefined"];
  //       let pointer = 0;
  //       while (store[pointer] !== value && pointer < store.length)
  //         pointer++;
  //       if (pointer === store.length)
  //         store[pointer] = value;
  //       return ["pointer", pointer];
  //     };
  //     const state = {
  //       key: key,
  //       serial: values[values.length-1],
  //       values: [],
  //       terminals: [],
  //       callstack: [],
  //       store: {}
  //     };
  //     for (let index = 0, last = values.length-1; index < last; index++)
  //       state.values[index] = jsonify(values[index]);
  //     for (let index = 0, length = terminals.length; index < length; index++)
  //       state.terminals[index] = {
  //         serial: terminals[index].serial,
  //         value: jsonify(terminals[index].value)
  //       };
  //     for (let index1 = 0, length1 = callstack.length; index1 < length1; index1++) {
  //       let call = callstack[index1];
  //       state.callstack[index1] = [];
  //       for (let index2 = 0, length2 = call.length; index2 < length2; index2++) {
  //         state.callstack[index1][index2] = {
  //           type: call[index2].type,
  //           serial: call[index2].serial,
  //           value: jsonify(call[index2].value)
  //         };
  //       }
  //     }
  //     for (let index = 0; index < store.length; index++) {
  //       if (typeof store[index] === "symbol") {
  //         state.store[index] = {
  //           type: "symbol",
  //           name: String(store[index])
  //         };
  //       } else if (Reflect_apply(WeakMap_prototype_has, proxies, [store[index]])) {
  //         const inner = Reflect_apply(WeakMap_prototype_get, proxies, [store[index]]);
  //         state.store[index] = {
  //           type: "proxy",
  //           target: jsonify(inner.target),
  //           traps: jsonify(inner.traps)
  //         };
  //       } else {
  //         state.store[index] = {
  //           type: Array.isArray(store[index]) ? "array" : typeof store[index],
  //           prototype: jsonify(Reflect_getPrototypeOf(store[index])),
  //           descriptors: Object_create(null)
  //         };
  //         Reflect_apply(Array_prototype_map, Reflect_ownKeys(store[index]), [(key) => {
  //           const descriptor = Reflect_getOwnPropertyDescriptor(store[index], key);
  //           if ("value" in descriptor) {
  //             descriptor.value = jsonify(descriptor.value);
  //           } else {
  //             descriptor.get = jsonify(descriptor.get);
  //             descriptor.set = jsonify(descriptor.set);
  //           }
  //           state.store[index].descriptors[key] = descriptor;
  //         }]);
  //         if (Reflect_apply(WeakMap_prototype_has, scopes, [store[index]])) {
  //           const scope = Reflect_apply(WeakMap_prototype_get, scopes, [store[index]]);
  //           state.store[index].scope = Reflect_apply(Array_prototype_map, scope, [jsonify]);
  //         }
  //       }
  //     }
  //     return state;
  //   };
  //   Reflect_apply(Array_prototype_forEach, Reflect_ownKeys(traps), [(key) => {
  //     const trap = traps[key];
  //     traps[key] = function () {
  //       console.log(Util.inspect(reify(key, arguments), {depth:null, colors:true}));
  //       ReadlineSync.question("Press <enter> to step in...");
  //       return Reflect.apply(trap, this, arguments);
  //     };
  //   }]);
  // } ());

  return traps;

};