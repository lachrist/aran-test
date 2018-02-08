
const Aran = require("aran");
const Acorn = require("acorn");
const Astring = require("astring");
const Print = require("./util/print.js");

const String = global.String;
const WeakMap = global.WeakMap;
const TypeError = global.TypeError;
const Error = global.Error;
const Proxy = global.Proxy;
const Function = global.Function;
const eval = global.eval;
const $eval = global.eval;
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
const WeakMap_prototype_get = WeakMap.prototype.get;
const WeakMap_prototype_set = WeakMap.prototype.set;
const WeakMap_prototype_has = WeakMap.prototype.has;

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

  const callstack = [];
  const scopes = new WeakMap();

  /////////////////
  // Environment //
  /////////////////

  const enter = (type, serial, value) => {
    const call = callstack[callstack.length-1];
    return call[call.length] = {type:type,serial:serial,value:value};
  };

  const leave = (type, serial) => {
    const call = callstack[callstack.length-1];
    if (type !== call[call.length-1].type])
      throw new Error("["+serial+"] Environment type mismatch. Expected: "+type+", got: "+call[call.length-1].type+".");
    if (serial !== call[call.length-1].serial)
      throw new Error("["+serial+"] Environments serial mismatch. Expected: "+serial+", got: "+call[call.length-1].serial+".");
    call--;
  };

  const lookup = (node, serial1, serial2) => {
    while (node.AranIndex !== serial1)
      if (!(node = node.AranParent))
        throw new Error("["+serial1+"] Unmatched node serial: "+serial2+".");
    return node;
  }

  ///////////
  // Stack //
  ///////////

  const produce = (value, serial) => {
    const call = callstack[callstack.length-1];
    return call[call.length] = {type:"value",serial:serial,value:value};
  };

  const consume = (value, serial) => {
    const call = callstack[callstack.length-1];
    if (call[call.length-1].type !== "value")
      throw new Error("["+serial+"] Cannot consume: "+call[call.length-1].type+".");
    if (call[call.length-1].value !== value)
      throw new Error("["+serial+"] Consume mismatch. Expected: "+Print(value)+", got: "+Print(call[call.length-1].value)+".");
    call.length--;
    return value;
  };

  //////////////
  // Specials //
  //////////////

  traps.copy = (position, value, serial) => {
    consume(value, serial);
    produce(value, serial);
    const call = callstack[callstack.length-1];
    position = call.length - position;
    for (let index = call.length; index > position; index--)
      call[index] = call[index-1];
    call[position] = call[stack.length-1];
    return value;
  };

  traps.set = (value1, value2, value3, serial) => {
    consume(value3, serial);
    consume(value2, serial);
    consume(value1, serial);
    value1[value2] = value3;
  };

  ///////////////
  // Producers //
  ///////////////

  traps.read = (identifier, value, serial) => {
    const call = callstack[callstack.length-1];
    let index = call.length;
    while (index--)
      if (call[index].type !== "value" && identifier in call[index].value) {
        if (value !== call[index].value[identifier])
          throw new Error("["+serial"] Environment read mismatch: "+identifier+". Expected: "+Print(value)+", got: "+Print(call[index].value[identifier])+".");
        if (call[index].value === global && Reflect_apply(WeakMap_prototype_has, substitutes, [value]))
          return produce(Reflect_apply(WeakMap_prototype_get, substitutes, [value]));
        return produce(value, serial);
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
        throw new Error("["+serial"] Stack poluted.");
      return result;
    };
    const call = callstack[callstack.length-1];
    let scope = [];
    for (let index = 0; length = call.length; index < length; index++)
      if (call[index].type !== "value")
        scope[scope.length] = call[index];
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

  traps.drop = (value, serial) => consume(value, serial);

  traps.test = (value, serial) => consume(value, serial);

  traps.throw = (value, serial) => consume(value, serial);

  traps.terminate = ((() => {
    const proxies = new WeakMap();
    const bindings = new WeakMap();
    (names || [
      "global",
      "Object.prototype",
      "Array.prototype",
      "Function.prototype",
      "String.prototype",
      "Boolean.prototype",
      "Error.prototype"
    ]).forEach((name) => {
      Reflect_apply(WeakMap_prototype_set, bindings, [$eval(name), ["builtin", name]]);
    });
    Reflect_apply(WeakMap_prototype_set, substitutes, [Proxy, function Proxy (target, traps) {
      if (!new.target)
        throw new TypeError("Constructor Proxy requires 'new'");
      const proxy = new Proxy(target, traps);
      Reflect_apply(WeakMap_prototype_set, proxies, [proxy, {target:target, traps:traps}]);
      return proxy;
    }]);
    const reify = (value) => {
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
        value: value,
        callstack: [],
        store: {}
      };
      if (success)
        state.value = jsonify(value);
      else if (error && stack in error)
        state.message = error.stack;
      else
        state.message = Print(error);
      for (let index1 = 0; length1 = callstack.length; index1 < length1; index1++) {
        let call = callstack[index1] = [];
        for (let index2 = 0; length2 = call.length; index2 < length2; index2++)
          call[index2] = {
            type: call[index2].type,
            serial: call[index2].serial,
            value: jsonify(call[index2].value)
          };
      }
      for (let index = 0; index < store.length; index++) {
        if (typeof store[index] === "symbol") {
          state.store[index] = {
            type: "symbol",
            name: String(store[index])
          };
        } else if (Reflect_apply(WeakMap_prototype_has, proxies, [store[index]])) {
          const inner = Reflect_apply(WeakMap_prototype_get, proxies, [store[index]]);
          state.store[index] = {
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
          if (Reflect_apply(WeakMap_prototype_has, scopes, [store[index]])) {
            const scope = Reflect_apply(WeakMap_prototype_get, scopes, [store[index]]);
            state.store[index].scope = [];
            for (let index = 0; index < scope.length; index++)
              state.store[index].scope[index] = jsonify(scope[index]);
          }
        }
      }
      return state;
    };
    return (success, value, serial) => {
      const launch = callstack[0][0].serial === serial;
      try {
        if (sucess) {
          consume(value, serial);
          if (aran.node(serial).AranParent) {
            leave(aran.node(serial).AranStrict ? "closure" : "block", serial);
            return value;
          }
          leave("with", serial);
          if (callstack[callstack.length-1].length > 0 || (launch && callstack.length > 1))
            throw new Error("["+serial+"] Callstack poluted");
          callstack.length--;
          return launch ? reify(value) : value;
        }
      } catch (error) {
        value = error;
      }
      if (!launch)
        return value;
      value = reify(value);
      callstack.length = 0;
      return value;
    };
  }) ());

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
    throw error("["+serial"] Could not find surrounding closure.");
  };

  traps.write = (identifier, value, serial) => {
    consume(value, serial);
    const call = callstack[callstack.length-1];
    let index = call.length;
    while (index--)
      if (call[index].type !== "value" && identifier in call[index].value) {
        if (call[index].type !== "with")
          call[index].value[identifier] = value;
        return value;
      }
    if (aran.node(serial).AranStrict)
      throw new Error("["+serial+"] Environment write failure: "+identifier+".");
    return value;
  };

  traps.declare = (kind, identifier, value, serial) => {
    consume(value, serial);
    const call = callstack[callstack.length-1];
    let index = call.length;
    if (kind === "var")
      while (index--)
        if (call[index].type === "closure")
          return call[index].value[identifier] = value;
    else
      while (index--)
        if (call[index].type !== "value" && call[index].type !== "with") {
          Reflect_defineProperty(call[index].value, identifier, {
            enumerable: true,
            configurable: false,
            writable: kind !== "const",
            value: value
          });
          return value;
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
    const scope = Reflect_apply(WeakMap_prototype_get, environments, [value]);
    const call = [];
    for (let index = 0; length = scope.length; index < length; index++)
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

  traps.label = (label, boolean, serial) => {
    label = (boolean ? "Continue" : "Break") + (label||"")
    enter("label", serial, Object_create(null))["@label"] = label;
  };

  traps.leave = (type, serial) => {
    leave(type, serial);
  };

  traps.program = (serial) => {
    if (aran.node(serial).AranParent)
      return enter(aran.node(serial).AranStrict ? "closure" : "block", serial, null);
    callstack[callstack.length] = [];
    enter("with", serial, global);
  };

  traps.break = (label, boolean, serial) => {
    label = (boolean ? "Continue" : "Break") + (label||"");
    let node = aran.node(serial);
    const call = callstack[callstack.length-1];
    while (call.length) {
      const frame = call[call.length-1];
      if (frame.type === "closure")
        throw new Error("["+serial"] Could not find surrounding label block: "+label+" (hit closure). ");
      call.length--;
      node = lookup(node, frame.serial);
      if (frame.type === "label" && frame.value["@label"] === label)
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

  exports.delete = (value1, value2, serial) => {
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

  ///////////////
  // Interface //
  ///////////////

  return traps;

};