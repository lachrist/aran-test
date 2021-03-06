(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
const AranTest = require("./main.js");
const Advice = require("/Users/soft/Desktop/workspace/aran-test/advice/shadow.js");
const script = "\nvar o = {\n  set c (v) {}\n};\n\no.c = \"foo\";";
const test = AranTest(Advice, script);
console.log(test.script);
if ('error' in test)
  console.log('Failure', test.error);
else
  console.log('Success', test.value);
},{"./main.js":4,"/Users/soft/Desktop/workspace/aran-test/advice/shadow.js":2}],2:[function(require,module,exports){
(function (global){

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
    if (type !== call[call.length-1].type)
      throw new Error("["+serial+"] Environment type mismatch. Expected: "+type+", got: "+call[call.length-1].type+".");
    if (serial !== call[call.length-1].serial)
      throw new Error("["+serial+"] Environments serial mismatch. Expected: "+serial+", got: "+call[call.length-1].serial+".");
    call.length--;
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
    const call = callstack[callstack.length-1];
    call[call.length] = {type:"value",serial:serial,value:value};
    return value;
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
    call[position] = call[call.length-1];
    return value;
  };

  traps.set = (value1, value2, value3, serial) => {
    debugger;
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
          throw new Error("["+serial+"] Environment read mismatch: "+identifier+". Expected: "+Print(value)+", got: "+Print(call[index].value[identifier])+".");
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
        throw new Error("["+serial+"] Stack poluted.");
      return result;
    };
    const call = callstack[callstack.length-1];
    let scope = [];
    for (let index = 0, length = call.length; index < length; index++)
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
    Reflect_apply(WeakMap_prototype_set, substitutes, [Proxy, function Proxy (target, traps) {
      if (new.target === void 0) // https://github.com/jsdom/webidl2js/issues/78
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
        value: value instanceof Error ? value : jsonify(value),
        callstack: [],
        store: {}
      };
      for (let index1 = 0, length1 = callstack.length; index1 < length1; index1++) {
        let call = callstack[index1];
        state.callstack[index1] = [];
        for (let index2 = 0, length2 = call.length; index2 < length2; index2++) {
          state.callstack[index1][index2] = {
            type: call[index2].type,
            serial: call[index2].serial,
            value: jsonify(call[index2].value)
          };
        }
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
            state.store[index].scope = Reflect_apply(Array_prototype_map, scope, [jsonify]);
          }
        }
      }
      return state;
    };
    return (success, value, serial) => {
      const launch = callstack[0][0].serial === serial;
      if (success) {
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
    throw error("["+serial+"] Could not find surrounding closure.");
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
    if (kind === "var") {
      while (index--) {
        if (call[index].type === "closure") {
          return call[index].value[identifier] = value;
        }
      }
    } else {
      while (index--) {
        if (call[index].type !== "value" && call[index].type !== "with") {
          Reflect_defineProperty(call[index].value, identifier, {
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
    label = (boolean ? "Break" : "Continue") + (label||"")
    enter("label", serial, Object_create(null)).value["@label"] = label;
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

  ///////////////
  // Interface //
  ///////////////

  return traps;

};
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./util/print.js":3}],3:[function(require,module,exports){
(function (global){

const String = global.String;
const String_prototype_substring = global.String.prototype.substring;
const Reflect_apply = global.Reflect.apply;
const Reflect_ownKeys = global.Reflect.ownKeys;
const JSON_stringify = global.JSON.stringify;
const Array_isArray = global.Array.isArray;

const truncate = (string) => string.length > 10 ? Reflect_apply(String_prototype_substring, string, [0, 10]) + "..." : string;

const print = (value, depth) => {
  if (!depth)
    return "...";
  if (typeof value === "string")
    return JSON_stringify(truncate(value));
  if (!value || value === true || typeof value === "number" || typeof value === "symbol")
    return String(value);
  if (typeof value === "function")
    return "function("+truncate(value.name||"")+")";
  if (Array_isArray(value)) {
    if (value.length === 0)
      return "[]";
    return "[" + print(value[0], depth-1) + (value.length === 1 ? "" : "...") + "]";
  }
  const keys = Reflect_ownKeys(value);
  if (keys.length === 0)
    return "{}";
  return "{" + JSON.stringify(truncate(keys[0])) + ":" + print(value[keys[0]], depth-1) + ((keys.length === 1) ? "" : "...") + "}";
};

module.exports = (value) => print(value, 3);

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],4:[function(require,module,exports){
(function (global){

const Acorn = require("acorn");
const Astring = require("astring");
const Aran = require("aran");

module.exports = (Advice, script1) => {
  const aran = Aran({
    namespace: "META",
    output: "EstreeValid"
  });
  const join = (script, parent) => Astring.generate(aran.join(
    Acorn.parse(script, {locations:true}),
    Object.keys(global.META),
    parent));
  global.META = Advice(aran, join);
  const script2 = join(script1, null);
  try {
    return {
      script: script2,
      value: global.eval(script2)
    };
  } catch (error) {
    return {
      script: script2,
      error: error
    };
  }
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"acorn":5,"aran":30,"astring":6}],5:[function(require,module,exports){
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(factory((global.acorn = {})));
}(this, (function (exports) { 'use strict';

// Reserved word lists for various dialects of the language

var reservedWords = {
  3: "abstract boolean byte char class double enum export extends final float goto implements import int interface long native package private protected public short static super synchronized throws transient volatile",
  5: "class enum extends super const export import",
  6: "enum",
  strict: "implements interface let package private protected public static yield",
  strictBind: "eval arguments"
};

// And the keywords

var ecma5AndLessKeywords = "break case catch continue debugger default do else finally for function if return switch throw try var while with null true false instanceof typeof void delete new in this";

var keywords = {
  5: ecma5AndLessKeywords,
  6: ecma5AndLessKeywords + " const class extends export import super"
};

var keywordRelationalOperator = /^in(stanceof)?$/;

// ## Character categories

// Big ugly regular expressions that match characters in the
// whitespace, identifier, and identifier-start categories. These
// are only applied when a character is found to actually have a
// code point above 128.
// Generated by `bin/generate-identifier-regex.js`.

var nonASCIIidentifierStartChars = "\xaa\xb5\xba\xc0-\xd6\xd8-\xf6\xf8-\u02c1\u02c6-\u02d1\u02e0-\u02e4\u02ec\u02ee\u0370-\u0374\u0376\u0377\u037a-\u037d\u037f\u0386\u0388-\u038a\u038c\u038e-\u03a1\u03a3-\u03f5\u03f7-\u0481\u048a-\u052f\u0531-\u0556\u0559\u0561-\u0587\u05d0-\u05ea\u05f0-\u05f2\u0620-\u064a\u066e\u066f\u0671-\u06d3\u06d5\u06e5\u06e6\u06ee\u06ef\u06fa-\u06fc\u06ff\u0710\u0712-\u072f\u074d-\u07a5\u07b1\u07ca-\u07ea\u07f4\u07f5\u07fa\u0800-\u0815\u081a\u0824\u0828\u0840-\u0858\u08a0-\u08b4\u08b6-\u08bd\u0904-\u0939\u093d\u0950\u0958-\u0961\u0971-\u0980\u0985-\u098c\u098f\u0990\u0993-\u09a8\u09aa-\u09b0\u09b2\u09b6-\u09b9\u09bd\u09ce\u09dc\u09dd\u09df-\u09e1\u09f0\u09f1\u0a05-\u0a0a\u0a0f\u0a10\u0a13-\u0a28\u0a2a-\u0a30\u0a32\u0a33\u0a35\u0a36\u0a38\u0a39\u0a59-\u0a5c\u0a5e\u0a72-\u0a74\u0a85-\u0a8d\u0a8f-\u0a91\u0a93-\u0aa8\u0aaa-\u0ab0\u0ab2\u0ab3\u0ab5-\u0ab9\u0abd\u0ad0\u0ae0\u0ae1\u0af9\u0b05-\u0b0c\u0b0f\u0b10\u0b13-\u0b28\u0b2a-\u0b30\u0b32\u0b33\u0b35-\u0b39\u0b3d\u0b5c\u0b5d\u0b5f-\u0b61\u0b71\u0b83\u0b85-\u0b8a\u0b8e-\u0b90\u0b92-\u0b95\u0b99\u0b9a\u0b9c\u0b9e\u0b9f\u0ba3\u0ba4\u0ba8-\u0baa\u0bae-\u0bb9\u0bd0\u0c05-\u0c0c\u0c0e-\u0c10\u0c12-\u0c28\u0c2a-\u0c39\u0c3d\u0c58-\u0c5a\u0c60\u0c61\u0c80\u0c85-\u0c8c\u0c8e-\u0c90\u0c92-\u0ca8\u0caa-\u0cb3\u0cb5-\u0cb9\u0cbd\u0cde\u0ce0\u0ce1\u0cf1\u0cf2\u0d05-\u0d0c\u0d0e-\u0d10\u0d12-\u0d3a\u0d3d\u0d4e\u0d54-\u0d56\u0d5f-\u0d61\u0d7a-\u0d7f\u0d85-\u0d96\u0d9a-\u0db1\u0db3-\u0dbb\u0dbd\u0dc0-\u0dc6\u0e01-\u0e30\u0e32\u0e33\u0e40-\u0e46\u0e81\u0e82\u0e84\u0e87\u0e88\u0e8a\u0e8d\u0e94-\u0e97\u0e99-\u0e9f\u0ea1-\u0ea3\u0ea5\u0ea7\u0eaa\u0eab\u0ead-\u0eb0\u0eb2\u0eb3\u0ebd\u0ec0-\u0ec4\u0ec6\u0edc-\u0edf\u0f00\u0f40-\u0f47\u0f49-\u0f6c\u0f88-\u0f8c\u1000-\u102a\u103f\u1050-\u1055\u105a-\u105d\u1061\u1065\u1066\u106e-\u1070\u1075-\u1081\u108e\u10a0-\u10c5\u10c7\u10cd\u10d0-\u10fa\u10fc-\u1248\u124a-\u124d\u1250-\u1256\u1258\u125a-\u125d\u1260-\u1288\u128a-\u128d\u1290-\u12b0\u12b2-\u12b5\u12b8-\u12be\u12c0\u12c2-\u12c5\u12c8-\u12d6\u12d8-\u1310\u1312-\u1315\u1318-\u135a\u1380-\u138f\u13a0-\u13f5\u13f8-\u13fd\u1401-\u166c\u166f-\u167f\u1681-\u169a\u16a0-\u16ea\u16ee-\u16f8\u1700-\u170c\u170e-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176c\u176e-\u1770\u1780-\u17b3\u17d7\u17dc\u1820-\u1877\u1880-\u18a8\u18aa\u18b0-\u18f5\u1900-\u191e\u1950-\u196d\u1970-\u1974\u1980-\u19ab\u19b0-\u19c9\u1a00-\u1a16\u1a20-\u1a54\u1aa7\u1b05-\u1b33\u1b45-\u1b4b\u1b83-\u1ba0\u1bae\u1baf\u1bba-\u1be5\u1c00-\u1c23\u1c4d-\u1c4f\u1c5a-\u1c7d\u1c80-\u1c88\u1ce9-\u1cec\u1cee-\u1cf1\u1cf5\u1cf6\u1d00-\u1dbf\u1e00-\u1f15\u1f18-\u1f1d\u1f20-\u1f45\u1f48-\u1f4d\u1f50-\u1f57\u1f59\u1f5b\u1f5d\u1f5f-\u1f7d\u1f80-\u1fb4\u1fb6-\u1fbc\u1fbe\u1fc2-\u1fc4\u1fc6-\u1fcc\u1fd0-\u1fd3\u1fd6-\u1fdb\u1fe0-\u1fec\u1ff2-\u1ff4\u1ff6-\u1ffc\u2071\u207f\u2090-\u209c\u2102\u2107\u210a-\u2113\u2115\u2118-\u211d\u2124\u2126\u2128\u212a-\u2139\u213c-\u213f\u2145-\u2149\u214e\u2160-\u2188\u2c00-\u2c2e\u2c30-\u2c5e\u2c60-\u2ce4\u2ceb-\u2cee\u2cf2\u2cf3\u2d00-\u2d25\u2d27\u2d2d\u2d30-\u2d67\u2d6f\u2d80-\u2d96\u2da0-\u2da6\u2da8-\u2dae\u2db0-\u2db6\u2db8-\u2dbe\u2dc0-\u2dc6\u2dc8-\u2dce\u2dd0-\u2dd6\u2dd8-\u2dde\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303c\u3041-\u3096\u309b-\u309f\u30a1-\u30fa\u30fc-\u30ff\u3105-\u312d\u3131-\u318e\u31a0-\u31ba\u31f0-\u31ff\u3400-\u4db5\u4e00-\u9fd5\ua000-\ua48c\ua4d0-\ua4fd\ua500-\ua60c\ua610-\ua61f\ua62a\ua62b\ua640-\ua66e\ua67f-\ua69d\ua6a0-\ua6ef\ua717-\ua71f\ua722-\ua788\ua78b-\ua7ae\ua7b0-\ua7b7\ua7f7-\ua801\ua803-\ua805\ua807-\ua80a\ua80c-\ua822\ua840-\ua873\ua882-\ua8b3\ua8f2-\ua8f7\ua8fb\ua8fd\ua90a-\ua925\ua930-\ua946\ua960-\ua97c\ua984-\ua9b2\ua9cf\ua9e0-\ua9e4\ua9e6-\ua9ef\ua9fa-\ua9fe\uaa00-\uaa28\uaa40-\uaa42\uaa44-\uaa4b\uaa60-\uaa76\uaa7a\uaa7e-\uaaaf\uaab1\uaab5\uaab6\uaab9-\uaabd\uaac0\uaac2\uaadb-\uaadd\uaae0-\uaaea\uaaf2-\uaaf4\uab01-\uab06\uab09-\uab0e\uab11-\uab16\uab20-\uab26\uab28-\uab2e\uab30-\uab5a\uab5c-\uab65\uab70-\uabe2\uac00-\ud7a3\ud7b0-\ud7c6\ud7cb-\ud7fb\uf900-\ufa6d\ufa70-\ufad9\ufb00-\ufb06\ufb13-\ufb17\ufb1d\ufb1f-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb3e\ufb40\ufb41\ufb43\ufb44\ufb46-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe70-\ufe74\ufe76-\ufefc\uff21-\uff3a\uff41-\uff5a\uff66-\uffbe\uffc2-\uffc7\uffca-\uffcf\uffd2-\uffd7\uffda-\uffdc";
var nonASCIIidentifierChars = "\u200c\u200d\xb7\u0300-\u036f\u0387\u0483-\u0487\u0591-\u05bd\u05bf\u05c1\u05c2\u05c4\u05c5\u05c7\u0610-\u061a\u064b-\u0669\u0670\u06d6-\u06dc\u06df-\u06e4\u06e7\u06e8\u06ea-\u06ed\u06f0-\u06f9\u0711\u0730-\u074a\u07a6-\u07b0\u07c0-\u07c9\u07eb-\u07f3\u0816-\u0819\u081b-\u0823\u0825-\u0827\u0829-\u082d\u0859-\u085b\u08d4-\u08e1\u08e3-\u0903\u093a-\u093c\u093e-\u094f\u0951-\u0957\u0962\u0963\u0966-\u096f\u0981-\u0983\u09bc\u09be-\u09c4\u09c7\u09c8\u09cb-\u09cd\u09d7\u09e2\u09e3\u09e6-\u09ef\u0a01-\u0a03\u0a3c\u0a3e-\u0a42\u0a47\u0a48\u0a4b-\u0a4d\u0a51\u0a66-\u0a71\u0a75\u0a81-\u0a83\u0abc\u0abe-\u0ac5\u0ac7-\u0ac9\u0acb-\u0acd\u0ae2\u0ae3\u0ae6-\u0aef\u0b01-\u0b03\u0b3c\u0b3e-\u0b44\u0b47\u0b48\u0b4b-\u0b4d\u0b56\u0b57\u0b62\u0b63\u0b66-\u0b6f\u0b82\u0bbe-\u0bc2\u0bc6-\u0bc8\u0bca-\u0bcd\u0bd7\u0be6-\u0bef\u0c00-\u0c03\u0c3e-\u0c44\u0c46-\u0c48\u0c4a-\u0c4d\u0c55\u0c56\u0c62\u0c63\u0c66-\u0c6f\u0c81-\u0c83\u0cbc\u0cbe-\u0cc4\u0cc6-\u0cc8\u0cca-\u0ccd\u0cd5\u0cd6\u0ce2\u0ce3\u0ce6-\u0cef\u0d01-\u0d03\u0d3e-\u0d44\u0d46-\u0d48\u0d4a-\u0d4d\u0d57\u0d62\u0d63\u0d66-\u0d6f\u0d82\u0d83\u0dca\u0dcf-\u0dd4\u0dd6\u0dd8-\u0ddf\u0de6-\u0def\u0df2\u0df3\u0e31\u0e34-\u0e3a\u0e47-\u0e4e\u0e50-\u0e59\u0eb1\u0eb4-\u0eb9\u0ebb\u0ebc\u0ec8-\u0ecd\u0ed0-\u0ed9\u0f18\u0f19\u0f20-\u0f29\u0f35\u0f37\u0f39\u0f3e\u0f3f\u0f71-\u0f84\u0f86\u0f87\u0f8d-\u0f97\u0f99-\u0fbc\u0fc6\u102b-\u103e\u1040-\u1049\u1056-\u1059\u105e-\u1060\u1062-\u1064\u1067-\u106d\u1071-\u1074\u1082-\u108d\u108f-\u109d\u135d-\u135f\u1369-\u1371\u1712-\u1714\u1732-\u1734\u1752\u1753\u1772\u1773\u17b4-\u17d3\u17dd\u17e0-\u17e9\u180b-\u180d\u1810-\u1819\u18a9\u1920-\u192b\u1930-\u193b\u1946-\u194f\u19d0-\u19da\u1a17-\u1a1b\u1a55-\u1a5e\u1a60-\u1a7c\u1a7f-\u1a89\u1a90-\u1a99\u1ab0-\u1abd\u1b00-\u1b04\u1b34-\u1b44\u1b50-\u1b59\u1b6b-\u1b73\u1b80-\u1b82\u1ba1-\u1bad\u1bb0-\u1bb9\u1be6-\u1bf3\u1c24-\u1c37\u1c40-\u1c49\u1c50-\u1c59\u1cd0-\u1cd2\u1cd4-\u1ce8\u1ced\u1cf2-\u1cf4\u1cf8\u1cf9\u1dc0-\u1df5\u1dfb-\u1dff\u203f\u2040\u2054\u20d0-\u20dc\u20e1\u20e5-\u20f0\u2cef-\u2cf1\u2d7f\u2de0-\u2dff\u302a-\u302f\u3099\u309a\ua620-\ua629\ua66f\ua674-\ua67d\ua69e\ua69f\ua6f0\ua6f1\ua802\ua806\ua80b\ua823-\ua827\ua880\ua881\ua8b4-\ua8c5\ua8d0-\ua8d9\ua8e0-\ua8f1\ua900-\ua909\ua926-\ua92d\ua947-\ua953\ua980-\ua983\ua9b3-\ua9c0\ua9d0-\ua9d9\ua9e5\ua9f0-\ua9f9\uaa29-\uaa36\uaa43\uaa4c\uaa4d\uaa50-\uaa59\uaa7b-\uaa7d\uaab0\uaab2-\uaab4\uaab7\uaab8\uaabe\uaabf\uaac1\uaaeb-\uaaef\uaaf5\uaaf6\uabe3-\uabea\uabec\uabed\uabf0-\uabf9\ufb1e\ufe00-\ufe0f\ufe20-\ufe2f\ufe33\ufe34\ufe4d-\ufe4f\uff10-\uff19\uff3f";

var nonASCIIidentifierStart = new RegExp("[" + nonASCIIidentifierStartChars + "]");
var nonASCIIidentifier = new RegExp("[" + nonASCIIidentifierStartChars + nonASCIIidentifierChars + "]");

nonASCIIidentifierStartChars = nonASCIIidentifierChars = null;

// These are a run-length and offset encoded representation of the
// >0xffff code points that are a valid part of identifiers. The
// offset starts at 0x10000, and each pair of numbers represents an
// offset to the next range, and then a size of the range. They were
// generated by bin/generate-identifier-regex.js

// eslint-disable-next-line comma-spacing
var astralIdentifierStartCodes = [0,11,2,25,2,18,2,1,2,14,3,13,35,122,70,52,268,28,4,48,48,31,17,26,6,37,11,29,3,35,5,7,2,4,43,157,19,35,5,35,5,39,9,51,157,310,10,21,11,7,153,5,3,0,2,43,2,1,4,0,3,22,11,22,10,30,66,18,2,1,11,21,11,25,71,55,7,1,65,0,16,3,2,2,2,26,45,28,4,28,36,7,2,27,28,53,11,21,11,18,14,17,111,72,56,50,14,50,785,52,76,44,33,24,27,35,42,34,4,0,13,47,15,3,22,0,2,0,36,17,2,24,85,6,2,0,2,3,2,14,2,9,8,46,39,7,3,1,3,21,2,6,2,1,2,4,4,0,19,0,13,4,159,52,19,3,54,47,21,1,2,0,185,46,42,3,37,47,21,0,60,42,86,25,391,63,32,0,449,56,264,8,2,36,18,0,50,29,881,921,103,110,18,195,2749,1070,4050,582,8634,568,8,30,114,29,19,47,17,3,32,20,6,18,881,68,12,0,67,12,65,0,32,6124,20,754,9486,1,3071,106,6,12,4,8,8,9,5991,84,2,70,2,1,3,0,3,1,3,3,2,11,2,0,2,6,2,64,2,3,3,7,2,6,2,27,2,3,2,4,2,0,4,6,2,339,3,24,2,24,2,30,2,24,2,30,2,24,2,30,2,24,2,30,2,24,2,7,4149,196,60,67,1213,3,2,26,2,1,2,0,3,0,2,9,2,3,2,0,2,0,7,0,5,0,2,0,2,0,2,2,2,1,2,0,3,0,2,0,2,0,2,0,2,0,2,1,2,0,3,3,2,6,2,3,2,3,2,0,2,9,2,16,6,2,2,4,2,16,4421,42710,42,4148,12,221,3,5761,10591,541];

// eslint-disable-next-line comma-spacing
var astralIdentifierCodes = [509,0,227,0,150,4,294,9,1368,2,2,1,6,3,41,2,5,0,166,1,1306,2,54,14,32,9,16,3,46,10,54,9,7,2,37,13,2,9,52,0,13,2,49,13,10,2,4,9,83,11,7,0,161,11,6,9,7,3,57,0,2,6,3,1,3,2,10,0,11,1,3,6,4,4,193,17,10,9,87,19,13,9,214,6,3,8,28,1,83,16,16,9,82,12,9,9,84,14,5,9,423,9,838,7,2,7,17,9,57,21,2,13,19882,9,135,4,60,6,26,9,1016,45,17,3,19723,1,5319,4,4,5,9,7,3,6,31,3,149,2,1418,49,513,54,5,49,9,0,15,0,23,4,2,14,1361,6,2,16,3,6,2,1,2,4,2214,6,110,6,6,9,792487,239];

// This has a complexity linear to the value of the code. The
// assumption is that looking up astral identifier characters is
// rare.
function isInAstralSet(code, set) {
  var pos = 0x10000;
  for (var i = 0; i < set.length; i += 2) {
    pos += set[i];
    if (pos > code) { return false }
    pos += set[i + 1];
    if (pos >= code) { return true }
  }
}

// Test whether a given character code starts an identifier.

function isIdentifierStart(code, astral) {
  if (code < 65) { return code === 36 }
  if (code < 91) { return true }
  if (code < 97) { return code === 95 }
  if (code < 123) { return true }
  if (code <= 0xffff) { return code >= 0xaa && nonASCIIidentifierStart.test(String.fromCharCode(code)) }
  if (astral === false) { return false }
  return isInAstralSet(code, astralIdentifierStartCodes)
}

// Test whether a given character is part of an identifier.

function isIdentifierChar(code, astral) {
  if (code < 48) { return code === 36 }
  if (code < 58) { return true }
  if (code < 65) { return false }
  if (code < 91) { return true }
  if (code < 97) { return code === 95 }
  if (code < 123) { return true }
  if (code <= 0xffff) { return code >= 0xaa && nonASCIIidentifier.test(String.fromCharCode(code)) }
  if (astral === false) { return false }
  return isInAstralSet(code, astralIdentifierStartCodes) || isInAstralSet(code, astralIdentifierCodes)
}

// ## Token types

// The assignment of fine-grained, information-carrying type objects
// allows the tokenizer to store the information it has about a
// token in a way that is very cheap for the parser to look up.

// All token type variables start with an underscore, to make them
// easy to recognize.

// The `beforeExpr` property is used to disambiguate between regular
// expressions and divisions. It is set on all token types that can
// be followed by an expression (thus, a slash after them would be a
// regular expression).
//
// The `startsExpr` property is used to check if the token ends a
// `yield` expression. It is set on all token types that either can
// directly start an expression (like a quotation mark) or can
// continue an expression (like the body of a string).
//
// `isLoop` marks a keyword as starting a loop, which is important
// to know when parsing a label, in order to allow or disallow
// continue jumps to that label.

var TokenType = function TokenType(label, conf) {
  if ( conf === void 0 ) conf = {};

  this.label = label;
  this.keyword = conf.keyword;
  this.beforeExpr = !!conf.beforeExpr;
  this.startsExpr = !!conf.startsExpr;
  this.isLoop = !!conf.isLoop;
  this.isAssign = !!conf.isAssign;
  this.prefix = !!conf.prefix;
  this.postfix = !!conf.postfix;
  this.binop = conf.binop || null;
  this.updateContext = null;
};

function binop(name, prec) {
  return new TokenType(name, {beforeExpr: true, binop: prec})
}
var beforeExpr = {beforeExpr: true};
var startsExpr = {startsExpr: true};

// Map keyword names to token types.

var keywords$1 = {};

// Succinct definitions of keyword token types
function kw(name, options) {
  if ( options === void 0 ) options = {};

  options.keyword = name;
  return keywords$1[name] = new TokenType(name, options)
}

var types = {
  num: new TokenType("num", startsExpr),
  regexp: new TokenType("regexp", startsExpr),
  string: new TokenType("string", startsExpr),
  name: new TokenType("name", startsExpr),
  eof: new TokenType("eof"),

  // Punctuation token types.
  bracketL: new TokenType("[", {beforeExpr: true, startsExpr: true}),
  bracketR: new TokenType("]"),
  braceL: new TokenType("{", {beforeExpr: true, startsExpr: true}),
  braceR: new TokenType("}"),
  parenL: new TokenType("(", {beforeExpr: true, startsExpr: true}),
  parenR: new TokenType(")"),
  comma: new TokenType(",", beforeExpr),
  semi: new TokenType(";", beforeExpr),
  colon: new TokenType(":", beforeExpr),
  dot: new TokenType("."),
  question: new TokenType("?", beforeExpr),
  arrow: new TokenType("=>", beforeExpr),
  template: new TokenType("template"),
  invalidTemplate: new TokenType("invalidTemplate"),
  ellipsis: new TokenType("...", beforeExpr),
  backQuote: new TokenType("`", startsExpr),
  dollarBraceL: new TokenType("${", {beforeExpr: true, startsExpr: true}),

  // Operators. These carry several kinds of properties to help the
  // parser use them properly (the presence of these properties is
  // what categorizes them as operators).
  //
  // `binop`, when present, specifies that this operator is a binary
  // operator, and will refer to its precedence.
  //
  // `prefix` and `postfix` mark the operator as a prefix or postfix
  // unary operator.
  //
  // `isAssign` marks all of `=`, `+=`, `-=` etcetera, which act as
  // binary operators with a very low precedence, that should result
  // in AssignmentExpression nodes.

  eq: new TokenType("=", {beforeExpr: true, isAssign: true}),
  assign: new TokenType("_=", {beforeExpr: true, isAssign: true}),
  incDec: new TokenType("++/--", {prefix: true, postfix: true, startsExpr: true}),
  prefix: new TokenType("!/~", {beforeExpr: true, prefix: true, startsExpr: true}),
  logicalOR: binop("||", 1),
  logicalAND: binop("&&", 2),
  bitwiseOR: binop("|", 3),
  bitwiseXOR: binop("^", 4),
  bitwiseAND: binop("&", 5),
  equality: binop("==/!=/===/!==", 6),
  relational: binop("</>/<=/>=", 7),
  bitShift: binop("<</>>/>>>", 8),
  plusMin: new TokenType("+/-", {beforeExpr: true, binop: 9, prefix: true, startsExpr: true}),
  modulo: binop("%", 10),
  star: binop("*", 10),
  slash: binop("/", 10),
  starstar: new TokenType("**", {beforeExpr: true}),

  // Keyword token types.
  _break: kw("break"),
  _case: kw("case", beforeExpr),
  _catch: kw("catch"),
  _continue: kw("continue"),
  _debugger: kw("debugger"),
  _default: kw("default", beforeExpr),
  _do: kw("do", {isLoop: true, beforeExpr: true}),
  _else: kw("else", beforeExpr),
  _finally: kw("finally"),
  _for: kw("for", {isLoop: true}),
  _function: kw("function", startsExpr),
  _if: kw("if"),
  _return: kw("return", beforeExpr),
  _switch: kw("switch"),
  _throw: kw("throw", beforeExpr),
  _try: kw("try"),
  _var: kw("var"),
  _const: kw("const"),
  _while: kw("while", {isLoop: true}),
  _with: kw("with"),
  _new: kw("new", {beforeExpr: true, startsExpr: true}),
  _this: kw("this", startsExpr),
  _super: kw("super", startsExpr),
  _class: kw("class", startsExpr),
  _extends: kw("extends", beforeExpr),
  _export: kw("export"),
  _import: kw("import"),
  _null: kw("null", startsExpr),
  _true: kw("true", startsExpr),
  _false: kw("false", startsExpr),
  _in: kw("in", {beforeExpr: true, binop: 7}),
  _instanceof: kw("instanceof", {beforeExpr: true, binop: 7}),
  _typeof: kw("typeof", {beforeExpr: true, prefix: true, startsExpr: true}),
  _void: kw("void", {beforeExpr: true, prefix: true, startsExpr: true}),
  _delete: kw("delete", {beforeExpr: true, prefix: true, startsExpr: true})
};

// Matches a whole line break (where CRLF is considered a single
// line break). Used to count lines.

var lineBreak = /\r\n?|\n|\u2028|\u2029/;
var lineBreakG = new RegExp(lineBreak.source, "g");

function isNewLine(code) {
  return code === 10 || code === 13 || code === 0x2028 || code === 0x2029
}

var nonASCIIwhitespace = /[\u1680\u180e\u2000-\u200a\u202f\u205f\u3000\ufeff]/;

var skipWhiteSpace = /(?:\s|\/\/.*|\/\*[^]*?\*\/)*/g;

var ref = Object.prototype;
var hasOwnProperty = ref.hasOwnProperty;
var toString = ref.toString;

// Checks if an object has a property.

function has(obj, propName) {
  return hasOwnProperty.call(obj, propName)
}

var isArray = Array.isArray || (function (obj) { return (
  toString.call(obj) === "[object Array]"
); });

// These are used when `options.locations` is on, for the
// `startLoc` and `endLoc` properties.

var Position = function Position(line, col) {
  this.line = line;
  this.column = col;
};

Position.prototype.offset = function offset (n) {
  return new Position(this.line, this.column + n)
};

var SourceLocation = function SourceLocation(p, start, end) {
  this.start = start;
  this.end = end;
  if (p.sourceFile !== null) { this.source = p.sourceFile; }
};

// The `getLineInfo` function is mostly useful when the
// `locations` option is off (for performance reasons) and you
// want to find the line/column position for a given character
// offset. `input` should be the code string that the offset refers
// into.

function getLineInfo(input, offset) {
  for (var line = 1, cur = 0;;) {
    lineBreakG.lastIndex = cur;
    var match = lineBreakG.exec(input);
    if (match && match.index < offset) {
      ++line;
      cur = match.index + match[0].length;
    } else {
      return new Position(line, offset - cur)
    }
  }
}

// A second optional argument can be given to further configure
// the parser process. These options are recognized:

var defaultOptions = {
  // `ecmaVersion` indicates the ECMAScript version to parse. Must
  // be either 3, 5, 6 (2015), 7 (2016), or 8 (2017). This influences support
  // for strict mode, the set of reserved words, and support for
  // new syntax features. The default is 7.
  ecmaVersion: 7,
  // `sourceType` indicates the mode the code should be parsed in.
  // Can be either `"script"` or `"module"`. This influences global
  // strict mode and parsing of `import` and `export` declarations.
  sourceType: "script",
  // `onInsertedSemicolon` can be a callback that will be called
  // when a semicolon is automatically inserted. It will be passed
  // th position of the comma as an offset, and if `locations` is
  // enabled, it is given the location as a `{line, column}` object
  // as second argument.
  onInsertedSemicolon: null,
  // `onTrailingComma` is similar to `onInsertedSemicolon`, but for
  // trailing commas.
  onTrailingComma: null,
  // By default, reserved words are only enforced if ecmaVersion >= 5.
  // Set `allowReserved` to a boolean value to explicitly turn this on
  // an off. When this option has the value "never", reserved words
  // and keywords can also not be used as property names.
  allowReserved: null,
  // When enabled, a return at the top level is not considered an
  // error.
  allowReturnOutsideFunction: false,
  // When enabled, import/export statements are not constrained to
  // appearing at the top of the program.
  allowImportExportEverywhere: false,
  // When enabled, hashbang directive in the beginning of file
  // is allowed and treated as a line comment.
  allowHashBang: false,
  // When `locations` is on, `loc` properties holding objects with
  // `start` and `end` properties in `{line, column}` form (with
  // line being 1-based and column 0-based) will be attached to the
  // nodes.
  locations: false,
  // A function can be passed as `onToken` option, which will
  // cause Acorn to call that function with object in the same
  // format as tokens returned from `tokenizer().getToken()`. Note
  // that you are not allowed to call the parser from the
  // callback—that will corrupt its internal state.
  onToken: null,
  // A function can be passed as `onComment` option, which will
  // cause Acorn to call that function with `(block, text, start,
  // end)` parameters whenever a comment is skipped. `block` is a
  // boolean indicating whether this is a block (`/* */`) comment,
  // `text` is the content of the comment, and `start` and `end` are
  // character offsets that denote the start and end of the comment.
  // When the `locations` option is on, two more parameters are
  // passed, the full `{line, column}` locations of the start and
  // end of the comments. Note that you are not allowed to call the
  // parser from the callback—that will corrupt its internal state.
  onComment: null,
  // Nodes have their start and end characters offsets recorded in
  // `start` and `end` properties (directly on the node, rather than
  // the `loc` object, which holds line/column data. To also add a
  // [semi-standardized][range] `range` property holding a `[start,
  // end]` array with the same numbers, set the `ranges` option to
  // `true`.
  //
  // [range]: https://bugzilla.mozilla.org/show_bug.cgi?id=745678
  ranges: false,
  // It is possible to parse multiple files into a single AST by
  // passing the tree produced by parsing the first file as
  // `program` option in subsequent parses. This will add the
  // toplevel forms of the parsed file to the `Program` (top) node
  // of an existing parse tree.
  program: null,
  // When `locations` is on, you can pass this to record the source
  // file in every node's `loc` object.
  sourceFile: null,
  // This value, if given, is stored in every node, whether
  // `locations` is on or off.
  directSourceFile: null,
  // When enabled, parenthesized expressions are represented by
  // (non-standard) ParenthesizedExpression nodes
  preserveParens: false,
  plugins: {}
};

// Interpret and default an options object

function getOptions(opts) {
  var options = {};

  for (var opt in defaultOptions)
    { options[opt] = opts && has(opts, opt) ? opts[opt] : defaultOptions[opt]; }

  if (options.ecmaVersion >= 2015)
    { options.ecmaVersion -= 2009; }

  if (options.allowReserved == null)
    { options.allowReserved = options.ecmaVersion < 5; }

  if (isArray(options.onToken)) {
    var tokens = options.onToken;
    options.onToken = function (token) { return tokens.push(token); };
  }
  if (isArray(options.onComment))
    { options.onComment = pushComment(options, options.onComment); }

  return options
}

function pushComment(options, array) {
  return function(block, text, start, end, startLoc, endLoc) {
    var comment = {
      type: block ? "Block" : "Line",
      value: text,
      start: start,
      end: end
    };
    if (options.locations)
      { comment.loc = new SourceLocation(this, startLoc, endLoc); }
    if (options.ranges)
      { comment.range = [start, end]; }
    array.push(comment);
  }
}

// Registered plugins
var plugins = {};

function keywordRegexp(words) {
  return new RegExp("^(?:" + words.replace(/ /g, "|") + ")$")
}

var Parser = function Parser(options, input, startPos) {
  this.options = options = getOptions(options);
  this.sourceFile = options.sourceFile;
  this.keywords = keywordRegexp(keywords[options.ecmaVersion >= 6 ? 6 : 5]);
  var reserved = "";
  if (!options.allowReserved) {
    for (var v = options.ecmaVersion;; v--)
      { if (reserved = reservedWords[v]) { break } }
    if (options.sourceType == "module") { reserved += " await"; }
  }
  this.reservedWords = keywordRegexp(reserved);
  var reservedStrict = (reserved ? reserved + " " : "") + reservedWords.strict;
  this.reservedWordsStrict = keywordRegexp(reservedStrict);
  this.reservedWordsStrictBind = keywordRegexp(reservedStrict + " " + reservedWords.strictBind);
  this.input = String(input);

  // Used to signal to callers of `readWord1` whether the word
  // contained any escape sequences. This is needed because words with
  // escape sequences must not be interpreted as keywords.
  this.containsEsc = false;

  // Load plugins
  this.loadPlugins(options.plugins);

  // Set up token state

  // The current position of the tokenizer in the input.
  if (startPos) {
    this.pos = startPos;
    this.lineStart = this.input.lastIndexOf("\n", startPos - 1) + 1;
    this.curLine = this.input.slice(0, this.lineStart).split(lineBreak).length;
  } else {
    this.pos = this.lineStart = 0;
    this.curLine = 1;
  }

  // Properties of the current token:
  // Its type
  this.type = types.eof;
  // For tokens that include more information than their type, the value
  this.value = null;
  // Its start and end offset
  this.start = this.end = this.pos;
  // And, if locations are used, the {line, column} object
  // corresponding to those offsets
  this.startLoc = this.endLoc = this.curPosition();

  // Position information for the previous token
  this.lastTokEndLoc = this.lastTokStartLoc = null;
  this.lastTokStart = this.lastTokEnd = this.pos;

  // The context stack is used to superficially track syntactic
  // context to predict whether a regular expression is allowed in a
  // given position.
  this.context = this.initialContext();
  this.exprAllowed = true;

  // Figure out if it's a module code.
  this.inModule = options.sourceType === "module";
  this.strict = this.inModule || this.strictDirective(this.pos);

  // Used to signify the start of a potential arrow function
  this.potentialArrowAt = -1;

  // Flags to track whether we are in a function, a generator, an async function.
  this.inFunction = this.inGenerator = this.inAsync = false;
  // Positions to delayed-check that yield/await does not exist in default parameters.
  this.yieldPos = this.awaitPos = 0;
  // Labels in scope.
  this.labels = [];

  // If enabled, skip leading hashbang line.
  if (this.pos === 0 && options.allowHashBang && this.input.slice(0, 2) === "#!")
    { this.skipLineComment(2); }

  // Scope tracking for duplicate variable names (see scope.js)
  this.scopeStack = [];
  this.enterFunctionScope();
};

// DEPRECATED Kept for backwards compatibility until 3.0 in case a plugin uses them
Parser.prototype.isKeyword = function isKeyword (word) { return this.keywords.test(word) };
Parser.prototype.isReservedWord = function isReservedWord (word) { return this.reservedWords.test(word) };

Parser.prototype.extend = function extend (name, f) {
  this[name] = f(this[name]);
};

Parser.prototype.loadPlugins = function loadPlugins (pluginConfigs) {
    var this$1 = this;

  for (var name in pluginConfigs) {
    var plugin = plugins[name];
    if (!plugin) { throw new Error("Plugin '" + name + "' not found") }
    plugin(this$1, pluginConfigs[name]);
  }
};

Parser.prototype.parse = function parse () {
  var node = this.options.program || this.startNode();
  this.nextToken();
  return this.parseTopLevel(node)
};

var pp = Parser.prototype;

// ## Parser utilities

var literal = /^(?:'((?:\\.|[^'])*?)'|"((?:\\.|[^"])*?)"|;)/;
pp.strictDirective = function(start) {
  var this$1 = this;

  for (;;) {
    skipWhiteSpace.lastIndex = start;
    start += skipWhiteSpace.exec(this$1.input)[0].length;
    var match = literal.exec(this$1.input.slice(start));
    if (!match) { return false }
    if ((match[1] || match[2]) == "use strict") { return true }
    start += match[0].length;
  }
};

// Predicate that tests whether the next token is of the given
// type, and if yes, consumes it as a side effect.

pp.eat = function(type) {
  if (this.type === type) {
    this.next();
    return true
  } else {
    return false
  }
};

// Tests whether parsed token is a contextual keyword.

pp.isContextual = function(name) {
  return this.type === types.name && this.value === name && !this.containsEsc
};

// Consumes contextual keyword if possible.

pp.eatContextual = function(name) {
  if (!this.isContextual(name)) { return false }
  this.next();
  return true
};

// Asserts that following token is given contextual keyword.

pp.expectContextual = function(name) {
  if (!this.eatContextual(name)) { this.unexpected(); }
};

// Test whether a semicolon can be inserted at the current position.

pp.canInsertSemicolon = function() {
  return this.type === types.eof ||
    this.type === types.braceR ||
    lineBreak.test(this.input.slice(this.lastTokEnd, this.start))
};

pp.insertSemicolon = function() {
  if (this.canInsertSemicolon()) {
    if (this.options.onInsertedSemicolon)
      { this.options.onInsertedSemicolon(this.lastTokEnd, this.lastTokEndLoc); }
    return true
  }
};

// Consume a semicolon, or, failing that, see if we are allowed to
// pretend that there is a semicolon at this position.

pp.semicolon = function() {
  if (!this.eat(types.semi) && !this.insertSemicolon()) { this.unexpected(); }
};

pp.afterTrailingComma = function(tokType, notNext) {
  if (this.type == tokType) {
    if (this.options.onTrailingComma)
      { this.options.onTrailingComma(this.lastTokStart, this.lastTokStartLoc); }
    if (!notNext)
      { this.next(); }
    return true
  }
};

// Expect a token of a given type. If found, consume it, otherwise,
// raise an unexpected token error.

pp.expect = function(type) {
  this.eat(type) || this.unexpected();
};

// Raise an unexpected token error.

pp.unexpected = function(pos) {
  this.raise(pos != null ? pos : this.start, "Unexpected token");
};

function DestructuringErrors() {
  this.shorthandAssign =
  this.trailingComma =
  this.parenthesizedAssign =
  this.parenthesizedBind =
  this.doubleProto =
    -1;
}

pp.checkPatternErrors = function(refDestructuringErrors, isAssign) {
  if (!refDestructuringErrors) { return }
  if (refDestructuringErrors.trailingComma > -1)
    { this.raiseRecoverable(refDestructuringErrors.trailingComma, "Comma is not permitted after the rest element"); }
  var parens = isAssign ? refDestructuringErrors.parenthesizedAssign : refDestructuringErrors.parenthesizedBind;
  if (parens > -1) { this.raiseRecoverable(parens, "Parenthesized pattern"); }
};

pp.checkExpressionErrors = function(refDestructuringErrors, andThrow) {
  if (!refDestructuringErrors) { return false }
  var shorthandAssign = refDestructuringErrors.shorthandAssign;
  var doubleProto = refDestructuringErrors.doubleProto;
  if (!andThrow) { return shorthandAssign >= 0 || doubleProto >= 0 }
  if (shorthandAssign >= 0)
    { this.raise(shorthandAssign, "Shorthand property assignments are valid only in destructuring patterns"); }
  if (doubleProto >= 0)
    { this.raiseRecoverable(doubleProto, "Redefinition of __proto__ property"); }
};

pp.checkYieldAwaitInDefaultParams = function() {
  if (this.yieldPos && (!this.awaitPos || this.yieldPos < this.awaitPos))
    { this.raise(this.yieldPos, "Yield expression cannot be a default value"); }
  if (this.awaitPos)
    { this.raise(this.awaitPos, "Await expression cannot be a default value"); }
};

pp.isSimpleAssignTarget = function(expr) {
  if (expr.type === "ParenthesizedExpression")
    { return this.isSimpleAssignTarget(expr.expression) }
  return expr.type === "Identifier" || expr.type === "MemberExpression"
};

var pp$1 = Parser.prototype;

// ### Statement parsing

// Parse a program. Initializes the parser, reads any number of
// statements, and wraps them in a Program node.  Optionally takes a
// `program` argument.  If present, the statements will be appended
// to its body instead of creating a new node.

pp$1.parseTopLevel = function(node) {
  var this$1 = this;

  var exports = {};
  if (!node.body) { node.body = []; }
  while (this.type !== types.eof) {
    var stmt = this$1.parseStatement(true, true, exports);
    node.body.push(stmt);
  }
  this.adaptDirectivePrologue(node.body);
  this.next();
  if (this.options.ecmaVersion >= 6) {
    node.sourceType = this.options.sourceType;
  }
  return this.finishNode(node, "Program")
};

var loopLabel = {kind: "loop"};
var switchLabel = {kind: "switch"};

pp$1.isLet = function() {
  if (this.options.ecmaVersion < 6 || !this.isContextual("let")) { return false }
  skipWhiteSpace.lastIndex = this.pos;
  var skip = skipWhiteSpace.exec(this.input);
  var next = this.pos + skip[0].length, nextCh = this.input.charCodeAt(next);
  if (nextCh === 91 || nextCh == 123) { return true } // '{' and '['
  if (isIdentifierStart(nextCh, true)) {
    var pos = next + 1;
    while (isIdentifierChar(this.input.charCodeAt(pos), true)) { ++pos; }
    var ident = this.input.slice(next, pos);
    if (!keywordRelationalOperator.test(ident)) { return true }
  }
  return false
};

// check 'async [no LineTerminator here] function'
// - 'async /*foo*/ function' is OK.
// - 'async /*\n*/ function' is invalid.
pp$1.isAsyncFunction = function() {
  if (this.options.ecmaVersion < 8 || !this.isContextual("async"))
    { return false }

  skipWhiteSpace.lastIndex = this.pos;
  var skip = skipWhiteSpace.exec(this.input);
  var next = this.pos + skip[0].length;
  return !lineBreak.test(this.input.slice(this.pos, next)) &&
    this.input.slice(next, next + 8) === "function" &&
    (next + 8 == this.input.length || !isIdentifierChar(this.input.charAt(next + 8)))
};

// Parse a single statement.
//
// If expecting a statement and finding a slash operator, parse a
// regular expression literal. This is to handle cases like
// `if (foo) /blah/.exec(foo)`, where looking at the previous token
// does not help.

pp$1.parseStatement = function(declaration, topLevel, exports) {
  var starttype = this.type, node = this.startNode(), kind;

  if (this.isLet()) {
    starttype = types._var;
    kind = "let";
  }

  // Most types of statements are recognized by the keyword they
  // start with. Many are trivial to parse, some require a bit of
  // complexity.

  switch (starttype) {
  case types._break: case types._continue: return this.parseBreakContinueStatement(node, starttype.keyword)
  case types._debugger: return this.parseDebuggerStatement(node)
  case types._do: return this.parseDoStatement(node)
  case types._for: return this.parseForStatement(node)
  case types._function:
    if (!declaration && this.options.ecmaVersion >= 6) { this.unexpected(); }
    return this.parseFunctionStatement(node, false)
  case types._class:
    if (!declaration) { this.unexpected(); }
    return this.parseClass(node, true)
  case types._if: return this.parseIfStatement(node)
  case types._return: return this.parseReturnStatement(node)
  case types._switch: return this.parseSwitchStatement(node)
  case types._throw: return this.parseThrowStatement(node)
  case types._try: return this.parseTryStatement(node)
  case types._const: case types._var:
    kind = kind || this.value;
    if (!declaration && kind != "var") { this.unexpected(); }
    return this.parseVarStatement(node, kind)
  case types._while: return this.parseWhileStatement(node)
  case types._with: return this.parseWithStatement(node)
  case types.braceL: return this.parseBlock()
  case types.semi: return this.parseEmptyStatement(node)
  case types._export:
  case types._import:
    if (!this.options.allowImportExportEverywhere) {
      if (!topLevel)
        { this.raise(this.start, "'import' and 'export' may only appear at the top level"); }
      if (!this.inModule)
        { this.raise(this.start, "'import' and 'export' may appear only with 'sourceType: module'"); }
    }
    return starttype === types._import ? this.parseImport(node) : this.parseExport(node, exports)

    // If the statement does not start with a statement keyword or a
    // brace, it's an ExpressionStatement or LabeledStatement. We
    // simply start parsing an expression, and afterwards, if the
    // next token is a colon and the expression was a simple
    // Identifier node, we switch to interpreting it as a label.
  default:
    if (this.isAsyncFunction()) {
      if (!declaration) { this.unexpected(); }
      this.next();
      return this.parseFunctionStatement(node, true)
    }

    var maybeName = this.value, expr = this.parseExpression();
    if (starttype === types.name && expr.type === "Identifier" && this.eat(types.colon))
      { return this.parseLabeledStatement(node, maybeName, expr) }
    else { return this.parseExpressionStatement(node, expr) }
  }
};

pp$1.parseBreakContinueStatement = function(node, keyword) {
  var this$1 = this;

  var isBreak = keyword == "break";
  this.next();
  if (this.eat(types.semi) || this.insertSemicolon()) { node.label = null; }
  else if (this.type !== types.name) { this.unexpected(); }
  else {
    node.label = this.parseIdent();
    this.semicolon();
  }

  // Verify that there is an actual destination to break or
  // continue to.
  var i = 0;
  for (; i < this.labels.length; ++i) {
    var lab = this$1.labels[i];
    if (node.label == null || lab.name === node.label.name) {
      if (lab.kind != null && (isBreak || lab.kind === "loop")) { break }
      if (node.label && isBreak) { break }
    }
  }
  if (i === this.labels.length) { this.raise(node.start, "Unsyntactic " + keyword); }
  return this.finishNode(node, isBreak ? "BreakStatement" : "ContinueStatement")
};

pp$1.parseDebuggerStatement = function(node) {
  this.next();
  this.semicolon();
  return this.finishNode(node, "DebuggerStatement")
};

pp$1.parseDoStatement = function(node) {
  this.next();
  this.labels.push(loopLabel);
  node.body = this.parseStatement(false);
  this.labels.pop();
  this.expect(types._while);
  node.test = this.parseParenExpression();
  if (this.options.ecmaVersion >= 6)
    { this.eat(types.semi); }
  else
    { this.semicolon(); }
  return this.finishNode(node, "DoWhileStatement")
};

// Disambiguating between a `for` and a `for`/`in` or `for`/`of`
// loop is non-trivial. Basically, we have to parse the init `var`
// statement or expression, disallowing the `in` operator (see
// the second parameter to `parseExpression`), and then check
// whether the next token is `in` or `of`. When there is no init
// part (semicolon immediately after the opening parenthesis), it
// is a regular `for` loop.

pp$1.parseForStatement = function(node) {
  this.next();
  this.labels.push(loopLabel);
  this.enterLexicalScope();
  this.expect(types.parenL);
  if (this.type === types.semi) { return this.parseFor(node, null) }
  var isLet = this.isLet();
  if (this.type === types._var || this.type === types._const || isLet) {
    var init$1 = this.startNode(), kind = isLet ? "let" : this.value;
    this.next();
    this.parseVar(init$1, true, kind);
    this.finishNode(init$1, "VariableDeclaration");
    if ((this.type === types._in || (this.options.ecmaVersion >= 6 && this.isContextual("of"))) && init$1.declarations.length === 1 &&
        !(kind !== "var" && init$1.declarations[0].init))
      { return this.parseForIn(node, init$1) }
    return this.parseFor(node, init$1)
  }
  var refDestructuringErrors = new DestructuringErrors;
  var init = this.parseExpression(true, refDestructuringErrors);
  if (this.type === types._in || (this.options.ecmaVersion >= 6 && this.isContextual("of"))) {
    this.toAssignable(init, false, refDestructuringErrors);
    this.checkLVal(init);
    return this.parseForIn(node, init)
  } else {
    this.checkExpressionErrors(refDestructuringErrors, true);
  }
  return this.parseFor(node, init)
};

pp$1.parseFunctionStatement = function(node, isAsync) {
  this.next();
  return this.parseFunction(node, true, false, isAsync)
};

pp$1.parseIfStatement = function(node) {
  this.next();
  node.test = this.parseParenExpression();
  // allow function declarations in branches, but only in non-strict mode
  node.consequent = this.parseStatement(!this.strict && this.type == types._function);
  node.alternate = this.eat(types._else) ? this.parseStatement(!this.strict && this.type == types._function) : null;
  return this.finishNode(node, "IfStatement")
};

pp$1.parseReturnStatement = function(node) {
  if (!this.inFunction && !this.options.allowReturnOutsideFunction)
    { this.raise(this.start, "'return' outside of function"); }
  this.next();

  // In `return` (and `break`/`continue`), the keywords with
  // optional arguments, we eagerly look for a semicolon or the
  // possibility to insert one.

  if (this.eat(types.semi) || this.insertSemicolon()) { node.argument = null; }
  else { node.argument = this.parseExpression(); this.semicolon(); }
  return this.finishNode(node, "ReturnStatement")
};

pp$1.parseSwitchStatement = function(node) {
  var this$1 = this;

  this.next();
  node.discriminant = this.parseParenExpression();
  node.cases = [];
  this.expect(types.braceL);
  this.labels.push(switchLabel);
  this.enterLexicalScope();

  // Statements under must be grouped (by label) in SwitchCase
  // nodes. `cur` is used to keep the node that we are currently
  // adding statements to.

  var cur;
  for (var sawDefault = false; this.type != types.braceR;) {
    if (this$1.type === types._case || this$1.type === types._default) {
      var isCase = this$1.type === types._case;
      if (cur) { this$1.finishNode(cur, "SwitchCase"); }
      node.cases.push(cur = this$1.startNode());
      cur.consequent = [];
      this$1.next();
      if (isCase) {
        cur.test = this$1.parseExpression();
      } else {
        if (sawDefault) { this$1.raiseRecoverable(this$1.lastTokStart, "Multiple default clauses"); }
        sawDefault = true;
        cur.test = null;
      }
      this$1.expect(types.colon);
    } else {
      if (!cur) { this$1.unexpected(); }
      cur.consequent.push(this$1.parseStatement(true));
    }
  }
  this.exitLexicalScope();
  if (cur) { this.finishNode(cur, "SwitchCase"); }
  this.next(); // Closing brace
  this.labels.pop();
  return this.finishNode(node, "SwitchStatement")
};

pp$1.parseThrowStatement = function(node) {
  this.next();
  if (lineBreak.test(this.input.slice(this.lastTokEnd, this.start)))
    { this.raise(this.lastTokEnd, "Illegal newline after throw"); }
  node.argument = this.parseExpression();
  this.semicolon();
  return this.finishNode(node, "ThrowStatement")
};

// Reused empty array added for node fields that are always empty.

var empty = [];

pp$1.parseTryStatement = function(node) {
  this.next();
  node.block = this.parseBlock();
  node.handler = null;
  if (this.type === types._catch) {
    var clause = this.startNode();
    this.next();
    this.expect(types.parenL);
    clause.param = this.parseBindingAtom();
    this.enterLexicalScope();
    this.checkLVal(clause.param, "let");
    this.expect(types.parenR);
    clause.body = this.parseBlock(false);
    this.exitLexicalScope();
    node.handler = this.finishNode(clause, "CatchClause");
  }
  node.finalizer = this.eat(types._finally) ? this.parseBlock() : null;
  if (!node.handler && !node.finalizer)
    { this.raise(node.start, "Missing catch or finally clause"); }
  return this.finishNode(node, "TryStatement")
};

pp$1.parseVarStatement = function(node, kind) {
  this.next();
  this.parseVar(node, false, kind);
  this.semicolon();
  return this.finishNode(node, "VariableDeclaration")
};

pp$1.parseWhileStatement = function(node) {
  this.next();
  node.test = this.parseParenExpression();
  this.labels.push(loopLabel);
  node.body = this.parseStatement(false);
  this.labels.pop();
  return this.finishNode(node, "WhileStatement")
};

pp$1.parseWithStatement = function(node) {
  if (this.strict) { this.raise(this.start, "'with' in strict mode"); }
  this.next();
  node.object = this.parseParenExpression();
  node.body = this.parseStatement(false);
  return this.finishNode(node, "WithStatement")
};

pp$1.parseEmptyStatement = function(node) {
  this.next();
  return this.finishNode(node, "EmptyStatement")
};

pp$1.parseLabeledStatement = function(node, maybeName, expr) {
  var this$1 = this;

  for (var i$1 = 0, list = this$1.labels; i$1 < list.length; i$1 += 1)
    {
    var label = list[i$1];

    if (label.name === maybeName)
      { this$1.raise(expr.start, "Label '" + maybeName + "' is already declared");
  } }
  var kind = this.type.isLoop ? "loop" : this.type === types._switch ? "switch" : null;
  for (var i = this.labels.length - 1; i >= 0; i--) {
    var label$1 = this$1.labels[i];
    if (label$1.statementStart == node.start) {
      // Update information about previous labels on this node
      label$1.statementStart = this$1.start;
      label$1.kind = kind;
    } else { break }
  }
  this.labels.push({name: maybeName, kind: kind, statementStart: this.start});
  node.body = this.parseStatement(true);
  if (node.body.type == "ClassDeclaration" ||
      node.body.type == "VariableDeclaration" && node.body.kind != "var" ||
      node.body.type == "FunctionDeclaration" && (this.strict || node.body.generator))
    { this.raiseRecoverable(node.body.start, "Invalid labeled declaration"); }
  this.labels.pop();
  node.label = expr;
  return this.finishNode(node, "LabeledStatement")
};

pp$1.parseExpressionStatement = function(node, expr) {
  node.expression = expr;
  this.semicolon();
  return this.finishNode(node, "ExpressionStatement")
};

// Parse a semicolon-enclosed block of statements, handling `"use
// strict"` declarations when `allowStrict` is true (used for
// function bodies).

pp$1.parseBlock = function(createNewLexicalScope) {
  var this$1 = this;
  if ( createNewLexicalScope === void 0 ) createNewLexicalScope = true;

  var node = this.startNode();
  node.body = [];
  this.expect(types.braceL);
  if (createNewLexicalScope) {
    this.enterLexicalScope();
  }
  while (!this.eat(types.braceR)) {
    var stmt = this$1.parseStatement(true);
    node.body.push(stmt);
  }
  if (createNewLexicalScope) {
    this.exitLexicalScope();
  }
  return this.finishNode(node, "BlockStatement")
};

// Parse a regular `for` loop. The disambiguation code in
// `parseStatement` will already have parsed the init statement or
// expression.

pp$1.parseFor = function(node, init) {
  node.init = init;
  this.expect(types.semi);
  node.test = this.type === types.semi ? null : this.parseExpression();
  this.expect(types.semi);
  node.update = this.type === types.parenR ? null : this.parseExpression();
  this.expect(types.parenR);
  this.exitLexicalScope();
  node.body = this.parseStatement(false);
  this.labels.pop();
  return this.finishNode(node, "ForStatement")
};

// Parse a `for`/`in` and `for`/`of` loop, which are almost
// same from parser's perspective.

pp$1.parseForIn = function(node, init) {
  var type = this.type === types._in ? "ForInStatement" : "ForOfStatement";
  this.next();
  if (type == "ForInStatement") {
    if (init.type === "AssignmentPattern" ||
      (init.type === "VariableDeclaration" && init.declarations[0].init != null &&
       (this.strict || init.declarations[0].id.type !== "Identifier")))
      { this.raise(init.start, "Invalid assignment in for-in loop head"); }
  }
  node.left = init;
  node.right = type == "ForInStatement" ? this.parseExpression() : this.parseMaybeAssign();
  this.expect(types.parenR);
  this.exitLexicalScope();
  node.body = this.parseStatement(false);
  this.labels.pop();
  return this.finishNode(node, type)
};

// Parse a list of variable declarations.

pp$1.parseVar = function(node, isFor, kind) {
  var this$1 = this;

  node.declarations = [];
  node.kind = kind;
  for (;;) {
    var decl = this$1.startNode();
    this$1.parseVarId(decl, kind);
    if (this$1.eat(types.eq)) {
      decl.init = this$1.parseMaybeAssign(isFor);
    } else if (kind === "const" && !(this$1.type === types._in || (this$1.options.ecmaVersion >= 6 && this$1.isContextual("of")))) {
      this$1.unexpected();
    } else if (decl.id.type != "Identifier" && !(isFor && (this$1.type === types._in || this$1.isContextual("of")))) {
      this$1.raise(this$1.lastTokEnd, "Complex binding patterns require an initialization value");
    } else {
      decl.init = null;
    }
    node.declarations.push(this$1.finishNode(decl, "VariableDeclarator"));
    if (!this$1.eat(types.comma)) { break }
  }
  return node
};

pp$1.parseVarId = function(decl, kind) {
  decl.id = this.parseBindingAtom(kind);
  this.checkLVal(decl.id, kind, false);
};

// Parse a function declaration or literal (depending on the
// `isStatement` parameter).

pp$1.parseFunction = function(node, isStatement, allowExpressionBody, isAsync) {
  this.initFunction(node);
  if (this.options.ecmaVersion >= 6 && !isAsync)
    { node.generator = this.eat(types.star); }
  if (this.options.ecmaVersion >= 8)
    { node.async = !!isAsync; }

  if (isStatement) {
    node.id = isStatement === "nullableID" && this.type != types.name ? null : this.parseIdent();
    if (node.id) {
      this.checkLVal(node.id, "var");
    }
  }

  var oldInGen = this.inGenerator, oldInAsync = this.inAsync,
      oldYieldPos = this.yieldPos, oldAwaitPos = this.awaitPos, oldInFunc = this.inFunction;
  this.inGenerator = node.generator;
  this.inAsync = node.async;
  this.yieldPos = 0;
  this.awaitPos = 0;
  this.inFunction = true;
  this.enterFunctionScope();

  if (!isStatement)
    { node.id = this.type == types.name ? this.parseIdent() : null; }

  this.parseFunctionParams(node);
  this.parseFunctionBody(node, allowExpressionBody);

  this.inGenerator = oldInGen;
  this.inAsync = oldInAsync;
  this.yieldPos = oldYieldPos;
  this.awaitPos = oldAwaitPos;
  this.inFunction = oldInFunc;
  return this.finishNode(node, isStatement ? "FunctionDeclaration" : "FunctionExpression")
};

pp$1.parseFunctionParams = function(node) {
  this.expect(types.parenL);
  node.params = this.parseBindingList(types.parenR, false, this.options.ecmaVersion >= 8);
  this.checkYieldAwaitInDefaultParams();
};

// Parse a class declaration or literal (depending on the
// `isStatement` parameter).

pp$1.parseClass = function(node, isStatement) {
  var this$1 = this;

  this.next();

  this.parseClassId(node, isStatement);
  this.parseClassSuper(node);
  var classBody = this.startNode();
  var hadConstructor = false;
  classBody.body = [];
  this.expect(types.braceL);
  while (!this.eat(types.braceR)) {
    var member = this$1.parseClassMember(classBody);
    if (member && member.type === "MethodDefinition" && member.kind === "constructor") {
      if (hadConstructor) { this$1.raise(member.start, "Duplicate constructor in the same class"); }
      hadConstructor = true;
    }
  }
  node.body = this.finishNode(classBody, "ClassBody");
  return this.finishNode(node, isStatement ? "ClassDeclaration" : "ClassExpression")
};

pp$1.parseClassMember = function(classBody) {
  var this$1 = this;

  if (this.eat(types.semi)) { return null }

  var method = this.startNode();
  var tryContextual = function (k, noLineBreak) {
    if ( noLineBreak === void 0 ) noLineBreak = false;

    var start = this$1.start, startLoc = this$1.startLoc;
    if (!this$1.eatContextual(k)) { return false }
    if (this$1.type !== types.parenL && (!noLineBreak || !this$1.canInsertSemicolon())) { return true }
    if (method.key) { this$1.unexpected(); }
    method.computed = false;
    method.key = this$1.startNodeAt(start, startLoc);
    method.key.name = k;
    this$1.finishNode(method.key, "Identifier");
    return false
  };

  method.kind = "method";
  method.static = tryContextual("static");
  var isGenerator = this.eat(types.star);
  var isAsync = false;
  if (!isGenerator) {
    if (this.options.ecmaVersion >= 8 && tryContextual("async", true)) {
      isAsync = true;
    } else if (tryContextual("get")) {
      method.kind = "get";
    } else if (tryContextual("set")) {
      method.kind = "set";
    }
  }
  if (!method.key) { this.parsePropertyName(method); }
  var key = method.key;
  if (!method.computed && !method.static && (key.type === "Identifier" && key.name === "constructor" ||
      key.type === "Literal" && key.value === "constructor")) {
    if (method.kind !== "method") { this.raise(key.start, "Constructor can't have get/set modifier"); }
    if (isGenerator) { this.raise(key.start, "Constructor can't be a generator"); }
    if (isAsync) { this.raise(key.start, "Constructor can't be an async method"); }
    method.kind = "constructor";
  } else if (method.static && key.type === "Identifier" && key.name === "prototype") {
    this.raise(key.start, "Classes may not have a static property named prototype");
  }
  this.parseClassMethod(classBody, method, isGenerator, isAsync);
  if (method.kind === "get" && method.value.params.length !== 0)
    { this.raiseRecoverable(method.value.start, "getter should have no params"); }
  if (method.kind === "set" && method.value.params.length !== 1)
    { this.raiseRecoverable(method.value.start, "setter should have exactly one param"); }
  if (method.kind === "set" && method.value.params[0].type === "RestElement")
    { this.raiseRecoverable(method.value.params[0].start, "Setter cannot use rest params"); }
  return method
};

pp$1.parseClassMethod = function(classBody, method, isGenerator, isAsync) {
  method.value = this.parseMethod(isGenerator, isAsync);
  classBody.body.push(this.finishNode(method, "MethodDefinition"));
};

pp$1.parseClassId = function(node, isStatement) {
  node.id = this.type === types.name ? this.parseIdent() : isStatement === true ? this.unexpected() : null;
};

pp$1.parseClassSuper = function(node) {
  node.superClass = this.eat(types._extends) ? this.parseExprSubscripts() : null;
};

// Parses module export declaration.

pp$1.parseExport = function(node, exports) {
  var this$1 = this;

  this.next();
  // export * from '...'
  if (this.eat(types.star)) {
    this.expectContextual("from");
    if (this.type !== types.string) { this.unexpected(); }
    node.source = this.parseExprAtom();
    this.semicolon();
    return this.finishNode(node, "ExportAllDeclaration")
  }
  if (this.eat(types._default)) { // export default ...
    this.checkExport(exports, "default", this.lastTokStart);
    var isAsync;
    if (this.type === types._function || (isAsync = this.isAsyncFunction())) {
      var fNode = this.startNode();
      this.next();
      if (isAsync) { this.next(); }
      node.declaration = this.parseFunction(fNode, "nullableID", false, isAsync);
    } else if (this.type === types._class) {
      var cNode = this.startNode();
      node.declaration = this.parseClass(cNode, "nullableID");
    } else {
      node.declaration = this.parseMaybeAssign();
      this.semicolon();
    }
    return this.finishNode(node, "ExportDefaultDeclaration")
  }
  // export var|const|let|function|class ...
  if (this.shouldParseExportStatement()) {
    node.declaration = this.parseStatement(true);
    if (node.declaration.type === "VariableDeclaration")
      { this.checkVariableExport(exports, node.declaration.declarations); }
    else
      { this.checkExport(exports, node.declaration.id.name, node.declaration.id.start); }
    node.specifiers = [];
    node.source = null;
  } else { // export { x, y as z } [from '...']
    node.declaration = null;
    node.specifiers = this.parseExportSpecifiers(exports);
    if (this.eatContextual("from")) {
      if (this.type !== types.string) { this.unexpected(); }
      node.source = this.parseExprAtom();
    } else {
      // check for keywords used as local names
      for (var i = 0, list = node.specifiers; i < list.length; i += 1) {
        var spec = list[i];

        this$1.checkUnreserved(spec.local);
      }

      node.source = null;
    }
    this.semicolon();
  }
  return this.finishNode(node, "ExportNamedDeclaration")
};

pp$1.checkExport = function(exports, name, pos) {
  if (!exports) { return }
  if (has(exports, name))
    { this.raiseRecoverable(pos, "Duplicate export '" + name + "'"); }
  exports[name] = true;
};

pp$1.checkPatternExport = function(exports, pat) {
  var this$1 = this;

  var type = pat.type;
  if (type == "Identifier")
    { this.checkExport(exports, pat.name, pat.start); }
  else if (type == "ObjectPattern")
    { for (var i = 0, list = pat.properties; i < list.length; i += 1)
      {
        var prop = list[i];

        this$1.checkPatternExport(exports, prop.value);
      } }
  else if (type == "ArrayPattern")
    { for (var i$1 = 0, list$1 = pat.elements; i$1 < list$1.length; i$1 += 1) {
      var elt = list$1[i$1];

        if (elt) { this$1.checkPatternExport(exports, elt); }
    } }
  else if (type == "AssignmentPattern")
    { this.checkPatternExport(exports, pat.left); }
  else if (type == "ParenthesizedExpression")
    { this.checkPatternExport(exports, pat.expression); }
};

pp$1.checkVariableExport = function(exports, decls) {
  var this$1 = this;

  if (!exports) { return }
  for (var i = 0, list = decls; i < list.length; i += 1)
    {
    var decl = list[i];

    this$1.checkPatternExport(exports, decl.id);
  }
};

pp$1.shouldParseExportStatement = function() {
  return this.type.keyword === "var" ||
    this.type.keyword === "const" ||
    this.type.keyword === "class" ||
    this.type.keyword === "function" ||
    this.isLet() ||
    this.isAsyncFunction()
};

// Parses a comma-separated list of module exports.

pp$1.parseExportSpecifiers = function(exports) {
  var this$1 = this;

  var nodes = [], first = true;
  // export { x, y as z } [from '...']
  this.expect(types.braceL);
  while (!this.eat(types.braceR)) {
    if (!first) {
      this$1.expect(types.comma);
      if (this$1.afterTrailingComma(types.braceR)) { break }
    } else { first = false; }

    var node = this$1.startNode();
    node.local = this$1.parseIdent(true);
    node.exported = this$1.eatContextual("as") ? this$1.parseIdent(true) : node.local;
    this$1.checkExport(exports, node.exported.name, node.exported.start);
    nodes.push(this$1.finishNode(node, "ExportSpecifier"));
  }
  return nodes
};

// Parses import declaration.

pp$1.parseImport = function(node) {
  this.next();
  // import '...'
  if (this.type === types.string) {
    node.specifiers = empty;
    node.source = this.parseExprAtom();
  } else {
    node.specifiers = this.parseImportSpecifiers();
    this.expectContextual("from");
    node.source = this.type === types.string ? this.parseExprAtom() : this.unexpected();
  }
  this.semicolon();
  return this.finishNode(node, "ImportDeclaration")
};

// Parses a comma-separated list of module imports.

pp$1.parseImportSpecifiers = function() {
  var this$1 = this;

  var nodes = [], first = true;
  if (this.type === types.name) {
    // import defaultObj, { x, y as z } from '...'
    var node = this.startNode();
    node.local = this.parseIdent();
    this.checkLVal(node.local, "let");
    nodes.push(this.finishNode(node, "ImportDefaultSpecifier"));
    if (!this.eat(types.comma)) { return nodes }
  }
  if (this.type === types.star) {
    var node$1 = this.startNode();
    this.next();
    this.expectContextual("as");
    node$1.local = this.parseIdent();
    this.checkLVal(node$1.local, "let");
    nodes.push(this.finishNode(node$1, "ImportNamespaceSpecifier"));
    return nodes
  }
  this.expect(types.braceL);
  while (!this.eat(types.braceR)) {
    if (!first) {
      this$1.expect(types.comma);
      if (this$1.afterTrailingComma(types.braceR)) { break }
    } else { first = false; }

    var node$2 = this$1.startNode();
    node$2.imported = this$1.parseIdent(true);
    if (this$1.eatContextual("as")) {
      node$2.local = this$1.parseIdent();
    } else {
      this$1.checkUnreserved(node$2.imported);
      node$2.local = node$2.imported;
    }
    this$1.checkLVal(node$2.local, "let");
    nodes.push(this$1.finishNode(node$2, "ImportSpecifier"));
  }
  return nodes
};

// Set `ExpressionStatement#directive` property for directive prologues.
pp$1.adaptDirectivePrologue = function(statements) {
  for (var i = 0; i < statements.length && this.isDirectiveCandidate(statements[i]); ++i) {
    statements[i].directive = statements[i].expression.raw.slice(1, -1);
  }
};
pp$1.isDirectiveCandidate = function(statement) {
  return (
    statement.type === "ExpressionStatement" &&
    statement.expression.type === "Literal" &&
    typeof statement.expression.value === "string" &&
    // Reject parenthesized strings.
    (this.input[statement.start] === "\"" || this.input[statement.start] === "'")
  )
};

var pp$2 = Parser.prototype;

// Convert existing expression atom to assignable pattern
// if possible.

pp$2.toAssignable = function(node, isBinding, refDestructuringErrors) {
  var this$1 = this;

  if (this.options.ecmaVersion >= 6 && node) {
    switch (node.type) {
    case "Identifier":
      if (this.inAsync && node.name === "await")
        { this.raise(node.start, "Can not use 'await' as identifier inside an async function"); }
      break

    case "ObjectPattern":
    case "ArrayPattern":
    case "RestElement":
      break

    case "ObjectExpression":
      node.type = "ObjectPattern";
      if (refDestructuringErrors) { this.checkPatternErrors(refDestructuringErrors, true); }
      for (var i = 0, list = node.properties; i < list.length; i += 1)
        {
      var prop = list[i];

      this$1.toAssignable(prop, isBinding);
    }
      break

    case "Property":
      // AssignmentProperty has type == "Property"
      if (node.kind !== "init") { this.raise(node.key.start, "Object pattern can't contain getter or setter"); }
      this.toAssignable(node.value, isBinding);
      break

    case "ArrayExpression":
      node.type = "ArrayPattern";
      if (refDestructuringErrors) { this.checkPatternErrors(refDestructuringErrors, true); }
      this.toAssignableList(node.elements, isBinding);
      break

    case "SpreadElement":
      node.type = "RestElement";
      this.toAssignable(node.argument, isBinding);
      if (node.argument.type === "AssignmentPattern")
        { this.raise(node.argument.start, "Rest elements cannot have a default value"); }
      break

    case "AssignmentExpression":
      if (node.operator !== "=") { this.raise(node.left.end, "Only '=' operator can be used for specifying default value."); }
      node.type = "AssignmentPattern";
      delete node.operator;
      this.toAssignable(node.left, isBinding);
      // falls through to AssignmentPattern

    case "AssignmentPattern":
      break

    case "ParenthesizedExpression":
      this.toAssignable(node.expression, isBinding);
      break

    case "MemberExpression":
      if (!isBinding) { break }

    default:
      this.raise(node.start, "Assigning to rvalue");
    }
  } else if (refDestructuringErrors) { this.checkPatternErrors(refDestructuringErrors, true); }
  return node
};

// Convert list of expression atoms to binding list.

pp$2.toAssignableList = function(exprList, isBinding) {
  var this$1 = this;

  var end = exprList.length;
  for (var i = 0; i < end; i++) {
    var elt = exprList[i];
    if (elt) { this$1.toAssignable(elt, isBinding); }
  }
  if (end) {
    var last = exprList[end - 1];
    if (this.options.ecmaVersion === 6 && isBinding && last && last.type === "RestElement" && last.argument.type !== "Identifier")
      { this.unexpected(last.argument.start); }
  }
  return exprList
};

// Parses spread element.

pp$2.parseSpread = function(refDestructuringErrors) {
  var node = this.startNode();
  this.next();
  node.argument = this.parseMaybeAssign(false, refDestructuringErrors);
  return this.finishNode(node, "SpreadElement")
};

pp$2.parseRestBinding = function() {
  var node = this.startNode();
  this.next();

  // RestElement inside of a function parameter must be an identifier
  if (this.options.ecmaVersion === 6 && this.type !== types.name)
    { this.unexpected(); }

  node.argument = this.parseBindingAtom();

  return this.finishNode(node, "RestElement")
};

// Parses lvalue (assignable) atom.

pp$2.parseBindingAtom = function() {
  if (this.options.ecmaVersion >= 6) {
    switch (this.type) {
    case types.bracketL:
      var node = this.startNode();
      this.next();
      node.elements = this.parseBindingList(types.bracketR, true, true);
      return this.finishNode(node, "ArrayPattern")

    case types.braceL:
      return this.parseObj(true)
    }
  }
  return this.parseIdent()
};

pp$2.parseBindingList = function(close, allowEmpty, allowTrailingComma) {
  var this$1 = this;

  var elts = [], first = true;
  while (!this.eat(close)) {
    if (first) { first = false; }
    else { this$1.expect(types.comma); }
    if (allowEmpty && this$1.type === types.comma) {
      elts.push(null);
    } else if (allowTrailingComma && this$1.afterTrailingComma(close)) {
      break
    } else if (this$1.type === types.ellipsis) {
      var rest = this$1.parseRestBinding();
      this$1.parseBindingListItem(rest);
      elts.push(rest);
      if (this$1.type === types.comma) { this$1.raise(this$1.start, "Comma is not permitted after the rest element"); }
      this$1.expect(close);
      break
    } else {
      var elem = this$1.parseMaybeDefault(this$1.start, this$1.startLoc);
      this$1.parseBindingListItem(elem);
      elts.push(elem);
    }
  }
  return elts
};

pp$2.parseBindingListItem = function(param) {
  return param
};

// Parses assignment pattern around given atom if possible.

pp$2.parseMaybeDefault = function(startPos, startLoc, left) {
  left = left || this.parseBindingAtom();
  if (this.options.ecmaVersion < 6 || !this.eat(types.eq)) { return left }
  var node = this.startNodeAt(startPos, startLoc);
  node.left = left;
  node.right = this.parseMaybeAssign();
  return this.finishNode(node, "AssignmentPattern")
};

// Verify that a node is an lval — something that can be assigned
// to.
// bindingType can be either:
// 'var' indicating that the lval creates a 'var' binding
// 'let' indicating that the lval creates a lexical ('let' or 'const') binding
// 'none' indicating that the binding should be checked for illegal identifiers, but not for duplicate references

pp$2.checkLVal = function(expr, bindingType, checkClashes) {
  var this$1 = this;

  switch (expr.type) {
  case "Identifier":
    if (this.strict && this.reservedWordsStrictBind.test(expr.name))
      { this.raiseRecoverable(expr.start, (bindingType ? "Binding " : "Assigning to ") + expr.name + " in strict mode"); }
    if (checkClashes) {
      if (has(checkClashes, expr.name))
        { this.raiseRecoverable(expr.start, "Argument name clash"); }
      checkClashes[expr.name] = true;
    }
    if (bindingType && bindingType !== "none") {
      if (
        bindingType === "var" && !this.canDeclareVarName(expr.name) ||
        bindingType !== "var" && !this.canDeclareLexicalName(expr.name)
      ) {
        this.raiseRecoverable(expr.start, ("Identifier '" + (expr.name) + "' has already been declared"));
      }
      if (bindingType === "var") {
        this.declareVarName(expr.name);
      } else {
        this.declareLexicalName(expr.name);
      }
    }
    break

  case "MemberExpression":
    if (bindingType) { this.raiseRecoverable(expr.start, "Binding member expression"); }
    break

  case "ObjectPattern":
    for (var i = 0, list = expr.properties; i < list.length; i += 1)
      {
    var prop = list[i];

    this$1.checkLVal(prop, bindingType, checkClashes);
  }
    break

  case "Property":
    // AssignmentProperty has type == "Property"
    this.checkLVal(expr.value, bindingType, checkClashes);
    break

  case "ArrayPattern":
    for (var i$1 = 0, list$1 = expr.elements; i$1 < list$1.length; i$1 += 1) {
      var elem = list$1[i$1];

    if (elem) { this$1.checkLVal(elem, bindingType, checkClashes); }
    }
    break

  case "AssignmentPattern":
    this.checkLVal(expr.left, bindingType, checkClashes);
    break

  case "RestElement":
    this.checkLVal(expr.argument, bindingType, checkClashes);
    break

  case "ParenthesizedExpression":
    this.checkLVal(expr.expression, bindingType, checkClashes);
    break

  default:
    this.raise(expr.start, (bindingType ? "Binding" : "Assigning to") + " rvalue");
  }
};

// A recursive descent parser operates by defining functions for all
// syntactic elements, and recursively calling those, each function
// advancing the input stream and returning an AST node. Precedence
// of constructs (for example, the fact that `!x[1]` means `!(x[1])`
// instead of `(!x)[1]` is handled by the fact that the parser
// function that parses unary prefix operators is called first, and
// in turn calls the function that parses `[]` subscripts — that
// way, it'll receive the node for `x[1]` already parsed, and wraps
// *that* in the unary operator node.
//
// Acorn uses an [operator precedence parser][opp] to handle binary
// operator precedence, because it is much more compact than using
// the technique outlined above, which uses different, nesting
// functions to specify precedence, for all of the ten binary
// precedence levels that JavaScript defines.
//
// [opp]: http://en.wikipedia.org/wiki/Operator-precedence_parser

var pp$3 = Parser.prototype;

// Check if property name clashes with already added.
// Object/class getters and setters are not allowed to clash —
// either with each other or with an init property — and in
// strict mode, init properties are also not allowed to be repeated.

pp$3.checkPropClash = function(prop, propHash, refDestructuringErrors) {
  if (this.options.ecmaVersion >= 6 && (prop.computed || prop.method || prop.shorthand))
    { return }
  var key = prop.key;
  var name;
  switch (key.type) {
  case "Identifier": name = key.name; break
  case "Literal": name = String(key.value); break
  default: return
  }
  var kind = prop.kind;
  if (this.options.ecmaVersion >= 6) {
    if (name === "__proto__" && kind === "init") {
      if (propHash.proto) {
        if (refDestructuringErrors && refDestructuringErrors.doubleProto < 0) { refDestructuringErrors.doubleProto = key.start; }
        // Backwards-compat kludge. Can be removed in version 6.0
        else { this.raiseRecoverable(key.start, "Redefinition of __proto__ property"); }
      }
      propHash.proto = true;
    }
    return
  }
  name = "$" + name;
  var other = propHash[name];
  if (other) {
    var redefinition;
    if (kind === "init") {
      redefinition = this.strict && other.init || other.get || other.set;
    } else {
      redefinition = other.init || other[kind];
    }
    if (redefinition)
      { this.raiseRecoverable(key.start, "Redefinition of property"); }
  } else {
    other = propHash[name] = {
      init: false,
      get: false,
      set: false
    };
  }
  other[kind] = true;
};

// ### Expression parsing

// These nest, from the most general expression type at the top to
// 'atomic', nondivisible expression types at the bottom. Most of
// the functions will simply let the function(s) below them parse,
// and, *if* the syntactic construct they handle is present, wrap
// the AST node that the inner parser gave them in another node.

// Parse a full expression. The optional arguments are used to
// forbid the `in` operator (in for loops initalization expressions)
// and provide reference for storing '=' operator inside shorthand
// property assignment in contexts where both object expression
// and object pattern might appear (so it's possible to raise
// delayed syntax error at correct position).

pp$3.parseExpression = function(noIn, refDestructuringErrors) {
  var this$1 = this;

  var startPos = this.start, startLoc = this.startLoc;
  var expr = this.parseMaybeAssign(noIn, refDestructuringErrors);
  if (this.type === types.comma) {
    var node = this.startNodeAt(startPos, startLoc);
    node.expressions = [expr];
    while (this.eat(types.comma)) { node.expressions.push(this$1.parseMaybeAssign(noIn, refDestructuringErrors)); }
    return this.finishNode(node, "SequenceExpression")
  }
  return expr
};

// Parse an assignment expression. This includes applications of
// operators like `+=`.

pp$3.parseMaybeAssign = function(noIn, refDestructuringErrors, afterLeftParse) {
  if (this.inGenerator && this.isContextual("yield")) { return this.parseYield() }

  var ownDestructuringErrors = false, oldParenAssign = -1, oldTrailingComma = -1;
  if (refDestructuringErrors) {
    oldParenAssign = refDestructuringErrors.parenthesizedAssign;
    oldTrailingComma = refDestructuringErrors.trailingComma;
    refDestructuringErrors.parenthesizedAssign = refDestructuringErrors.trailingComma = -1;
  } else {
    refDestructuringErrors = new DestructuringErrors;
    ownDestructuringErrors = true;
  }

  var startPos = this.start, startLoc = this.startLoc;
  if (this.type == types.parenL || this.type == types.name)
    { this.potentialArrowAt = this.start; }
  var left = this.parseMaybeConditional(noIn, refDestructuringErrors);
  if (afterLeftParse) { left = afterLeftParse.call(this, left, startPos, startLoc); }
  if (this.type.isAssign) {
    var node = this.startNodeAt(startPos, startLoc);
    node.operator = this.value;
    node.left = this.type === types.eq ? this.toAssignable(left, false, refDestructuringErrors) : left;
    if (!ownDestructuringErrors) { DestructuringErrors.call(refDestructuringErrors); }
    refDestructuringErrors.shorthandAssign = -1; // reset because shorthand default was used correctly
    this.checkLVal(left);
    this.next();
    node.right = this.parseMaybeAssign(noIn);
    return this.finishNode(node, "AssignmentExpression")
  } else {
    if (ownDestructuringErrors) { this.checkExpressionErrors(refDestructuringErrors, true); }
  }
  if (oldParenAssign > -1) { refDestructuringErrors.parenthesizedAssign = oldParenAssign; }
  if (oldTrailingComma > -1) { refDestructuringErrors.trailingComma = oldTrailingComma; }
  return left
};

// Parse a ternary conditional (`?:`) operator.

pp$3.parseMaybeConditional = function(noIn, refDestructuringErrors) {
  var startPos = this.start, startLoc = this.startLoc;
  var expr = this.parseExprOps(noIn, refDestructuringErrors);
  if (this.checkExpressionErrors(refDestructuringErrors)) { return expr }
  if (this.eat(types.question)) {
    var node = this.startNodeAt(startPos, startLoc);
    node.test = expr;
    node.consequent = this.parseMaybeAssign();
    this.expect(types.colon);
    node.alternate = this.parseMaybeAssign(noIn);
    return this.finishNode(node, "ConditionalExpression")
  }
  return expr
};

// Start the precedence parser.

pp$3.parseExprOps = function(noIn, refDestructuringErrors) {
  var startPos = this.start, startLoc = this.startLoc;
  var expr = this.parseMaybeUnary(refDestructuringErrors, false);
  if (this.checkExpressionErrors(refDestructuringErrors)) { return expr }
  return expr.start == startPos && expr.type === "ArrowFunctionExpression" ? expr : this.parseExprOp(expr, startPos, startLoc, -1, noIn)
};

// Parse binary operators with the operator precedence parsing
// algorithm. `left` is the left-hand side of the operator.
// `minPrec` provides context that allows the function to stop and
// defer further parser to one of its callers when it encounters an
// operator that has a lower precedence than the set it is parsing.

pp$3.parseExprOp = function(left, leftStartPos, leftStartLoc, minPrec, noIn) {
  var prec = this.type.binop;
  if (prec != null && (!noIn || this.type !== types._in)) {
    if (prec > minPrec) {
      var logical = this.type === types.logicalOR || this.type === types.logicalAND;
      var op = this.value;
      this.next();
      var startPos = this.start, startLoc = this.startLoc;
      var right = this.parseExprOp(this.parseMaybeUnary(null, false), startPos, startLoc, prec, noIn);
      var node = this.buildBinary(leftStartPos, leftStartLoc, left, right, op, logical);
      return this.parseExprOp(node, leftStartPos, leftStartLoc, minPrec, noIn)
    }
  }
  return left
};

pp$3.buildBinary = function(startPos, startLoc, left, right, op, logical) {
  var node = this.startNodeAt(startPos, startLoc);
  node.left = left;
  node.operator = op;
  node.right = right;
  return this.finishNode(node, logical ? "LogicalExpression" : "BinaryExpression")
};

// Parse unary operators, both prefix and postfix.

pp$3.parseMaybeUnary = function(refDestructuringErrors, sawUnary) {
  var this$1 = this;

  var startPos = this.start, startLoc = this.startLoc, expr;
  if (this.inAsync && this.isContextual("await")) {
    expr = this.parseAwait();
    sawUnary = true;
  } else if (this.type.prefix) {
    var node = this.startNode(), update = this.type === types.incDec;
    node.operator = this.value;
    node.prefix = true;
    this.next();
    node.argument = this.parseMaybeUnary(null, true);
    this.checkExpressionErrors(refDestructuringErrors, true);
    if (update) { this.checkLVal(node.argument); }
    else if (this.strict && node.operator === "delete" &&
             node.argument.type === "Identifier")
      { this.raiseRecoverable(node.start, "Deleting local variable in strict mode"); }
    else { sawUnary = true; }
    expr = this.finishNode(node, update ? "UpdateExpression" : "UnaryExpression");
  } else {
    expr = this.parseExprSubscripts(refDestructuringErrors);
    if (this.checkExpressionErrors(refDestructuringErrors)) { return expr }
    while (this.type.postfix && !this.canInsertSemicolon()) {
      var node$1 = this$1.startNodeAt(startPos, startLoc);
      node$1.operator = this$1.value;
      node$1.prefix = false;
      node$1.argument = expr;
      this$1.checkLVal(expr);
      this$1.next();
      expr = this$1.finishNode(node$1, "UpdateExpression");
    }
  }

  if (!sawUnary && this.eat(types.starstar))
    { return this.buildBinary(startPos, startLoc, expr, this.parseMaybeUnary(null, false), "**", false) }
  else
    { return expr }
};

// Parse call, dot, and `[]`-subscript expressions.

pp$3.parseExprSubscripts = function(refDestructuringErrors) {
  var startPos = this.start, startLoc = this.startLoc;
  var expr = this.parseExprAtom(refDestructuringErrors);
  var skipArrowSubscripts = expr.type === "ArrowFunctionExpression" && this.input.slice(this.lastTokStart, this.lastTokEnd) !== ")";
  if (this.checkExpressionErrors(refDestructuringErrors) || skipArrowSubscripts) { return expr }
  var result = this.parseSubscripts(expr, startPos, startLoc);
  if (refDestructuringErrors && result.type === "MemberExpression") {
    if (refDestructuringErrors.parenthesizedAssign >= result.start) { refDestructuringErrors.parenthesizedAssign = -1; }
    if (refDestructuringErrors.parenthesizedBind >= result.start) { refDestructuringErrors.parenthesizedBind = -1; }
  }
  return result
};

pp$3.parseSubscripts = function(base, startPos, startLoc, noCalls) {
  var this$1 = this;

  var maybeAsyncArrow = this.options.ecmaVersion >= 8 && base.type === "Identifier" && base.name === "async" &&
      this.lastTokEnd == base.end && !this.canInsertSemicolon() && this.input.slice(base.start, base.end) === "async";
  for (var computed = (void 0);;) {
    if ((computed = this$1.eat(types.bracketL)) || this$1.eat(types.dot)) {
      var node = this$1.startNodeAt(startPos, startLoc);
      node.object = base;
      node.property = computed ? this$1.parseExpression() : this$1.parseIdent(true);
      node.computed = !!computed;
      if (computed) { this$1.expect(types.bracketR); }
      base = this$1.finishNode(node, "MemberExpression");
    } else if (!noCalls && this$1.eat(types.parenL)) {
      var refDestructuringErrors = new DestructuringErrors, oldYieldPos = this$1.yieldPos, oldAwaitPos = this$1.awaitPos;
      this$1.yieldPos = 0;
      this$1.awaitPos = 0;
      var exprList = this$1.parseExprList(types.parenR, this$1.options.ecmaVersion >= 8, false, refDestructuringErrors);
      if (maybeAsyncArrow && !this$1.canInsertSemicolon() && this$1.eat(types.arrow)) {
        this$1.checkPatternErrors(refDestructuringErrors, false);
        this$1.checkYieldAwaitInDefaultParams();
        this$1.yieldPos = oldYieldPos;
        this$1.awaitPos = oldAwaitPos;
        return this$1.parseArrowExpression(this$1.startNodeAt(startPos, startLoc), exprList, true)
      }
      this$1.checkExpressionErrors(refDestructuringErrors, true);
      this$1.yieldPos = oldYieldPos || this$1.yieldPos;
      this$1.awaitPos = oldAwaitPos || this$1.awaitPos;
      var node$1 = this$1.startNodeAt(startPos, startLoc);
      node$1.callee = base;
      node$1.arguments = exprList;
      base = this$1.finishNode(node$1, "CallExpression");
    } else if (this$1.type === types.backQuote) {
      var node$2 = this$1.startNodeAt(startPos, startLoc);
      node$2.tag = base;
      node$2.quasi = this$1.parseTemplate({isTagged: true});
      base = this$1.finishNode(node$2, "TaggedTemplateExpression");
    } else {
      return base
    }
  }
};

// Parse an atomic expression — either a single token that is an
// expression, an expression started by a keyword like `function` or
// `new`, or an expression wrapped in punctuation like `()`, `[]`,
// or `{}`.

pp$3.parseExprAtom = function(refDestructuringErrors) {
  var node, canBeArrow = this.potentialArrowAt == this.start;
  switch (this.type) {
  case types._super:
    if (!this.inFunction)
      { this.raise(this.start, "'super' outside of function or class"); }
    node = this.startNode();
    this.next();
    // The `super` keyword can appear at below:
    // SuperProperty:
    //     super [ Expression ]
    //     super . IdentifierName
    // SuperCall:
    //     super Arguments
    if (this.type !== types.dot && this.type !== types.bracketL && this.type !== types.parenL)
      { this.unexpected(); }
    return this.finishNode(node, "Super")

  case types._this:
    node = this.startNode();
    this.next();
    return this.finishNode(node, "ThisExpression")

  case types.name:
    var startPos = this.start, startLoc = this.startLoc, containsEsc = this.containsEsc;
    var id = this.parseIdent(this.type !== types.name);
    if (this.options.ecmaVersion >= 8 && !containsEsc && id.name === "async" && !this.canInsertSemicolon() && this.eat(types._function))
      { return this.parseFunction(this.startNodeAt(startPos, startLoc), false, false, true) }
    if (canBeArrow && !this.canInsertSemicolon()) {
      if (this.eat(types.arrow))
        { return this.parseArrowExpression(this.startNodeAt(startPos, startLoc), [id], false) }
      if (this.options.ecmaVersion >= 8 && id.name === "async" && this.type === types.name && !containsEsc) {
        id = this.parseIdent();
        if (this.canInsertSemicolon() || !this.eat(types.arrow))
          { this.unexpected(); }
        return this.parseArrowExpression(this.startNodeAt(startPos, startLoc), [id], true)
      }
    }
    return id

  case types.regexp:
    var value = this.value;
    node = this.parseLiteral(value.value);
    node.regex = {pattern: value.pattern, flags: value.flags};
    return node

  case types.num: case types.string:
    return this.parseLiteral(this.value)

  case types._null: case types._true: case types._false:
    node = this.startNode();
    node.value = this.type === types._null ? null : this.type === types._true;
    node.raw = this.type.keyword;
    this.next();
    return this.finishNode(node, "Literal")

  case types.parenL:
    var start = this.start, expr = this.parseParenAndDistinguishExpression(canBeArrow);
    if (refDestructuringErrors) {
      if (refDestructuringErrors.parenthesizedAssign < 0 && !this.isSimpleAssignTarget(expr))
        { refDestructuringErrors.parenthesizedAssign = start; }
      if (refDestructuringErrors.parenthesizedBind < 0)
        { refDestructuringErrors.parenthesizedBind = start; }
    }
    return expr

  case types.bracketL:
    node = this.startNode();
    this.next();
    node.elements = this.parseExprList(types.bracketR, true, true, refDestructuringErrors);
    return this.finishNode(node, "ArrayExpression")

  case types.braceL:
    return this.parseObj(false, refDestructuringErrors)

  case types._function:
    node = this.startNode();
    this.next();
    return this.parseFunction(node, false)

  case types._class:
    return this.parseClass(this.startNode(), false)

  case types._new:
    return this.parseNew()

  case types.backQuote:
    return this.parseTemplate()

  default:
    this.unexpected();
  }
};

pp$3.parseLiteral = function(value) {
  var node = this.startNode();
  node.value = value;
  node.raw = this.input.slice(this.start, this.end);
  this.next();
  return this.finishNode(node, "Literal")
};

pp$3.parseParenExpression = function() {
  this.expect(types.parenL);
  var val = this.parseExpression();
  this.expect(types.parenR);
  return val
};

pp$3.parseParenAndDistinguishExpression = function(canBeArrow) {
  var this$1 = this;

  var startPos = this.start, startLoc = this.startLoc, val, allowTrailingComma = this.options.ecmaVersion >= 8;
  if (this.options.ecmaVersion >= 6) {
    this.next();

    var innerStartPos = this.start, innerStartLoc = this.startLoc;
    var exprList = [], first = true, lastIsComma = false;
    var refDestructuringErrors = new DestructuringErrors, oldYieldPos = this.yieldPos, oldAwaitPos = this.awaitPos, spreadStart;
    this.yieldPos = 0;
    this.awaitPos = 0;
    while (this.type !== types.parenR) {
      first ? first = false : this$1.expect(types.comma);
      if (allowTrailingComma && this$1.afterTrailingComma(types.parenR, true)) {
        lastIsComma = true;
        break
      } else if (this$1.type === types.ellipsis) {
        spreadStart = this$1.start;
        exprList.push(this$1.parseParenItem(this$1.parseRestBinding()));
        if (this$1.type === types.comma) { this$1.raise(this$1.start, "Comma is not permitted after the rest element"); }
        break
      } else {
        exprList.push(this$1.parseMaybeAssign(false, refDestructuringErrors, this$1.parseParenItem));
      }
    }
    var innerEndPos = this.start, innerEndLoc = this.startLoc;
    this.expect(types.parenR);

    if (canBeArrow && !this.canInsertSemicolon() && this.eat(types.arrow)) {
      this.checkPatternErrors(refDestructuringErrors, false);
      this.checkYieldAwaitInDefaultParams();
      this.yieldPos = oldYieldPos;
      this.awaitPos = oldAwaitPos;
      return this.parseParenArrowList(startPos, startLoc, exprList)
    }

    if (!exprList.length || lastIsComma) { this.unexpected(this.lastTokStart); }
    if (spreadStart) { this.unexpected(spreadStart); }
    this.checkExpressionErrors(refDestructuringErrors, true);
    this.yieldPos = oldYieldPos || this.yieldPos;
    this.awaitPos = oldAwaitPos || this.awaitPos;

    if (exprList.length > 1) {
      val = this.startNodeAt(innerStartPos, innerStartLoc);
      val.expressions = exprList;
      this.finishNodeAt(val, "SequenceExpression", innerEndPos, innerEndLoc);
    } else {
      val = exprList[0];
    }
  } else {
    val = this.parseParenExpression();
  }

  if (this.options.preserveParens) {
    var par = this.startNodeAt(startPos, startLoc);
    par.expression = val;
    return this.finishNode(par, "ParenthesizedExpression")
  } else {
    return val
  }
};

pp$3.parseParenItem = function(item) {
  return item
};

pp$3.parseParenArrowList = function(startPos, startLoc, exprList) {
  return this.parseArrowExpression(this.startNodeAt(startPos, startLoc), exprList)
};

// New's precedence is slightly tricky. It must allow its argument to
// be a `[]` or dot subscript expression, but not a call — at least,
// not without wrapping it in parentheses. Thus, it uses the noCalls
// argument to parseSubscripts to prevent it from consuming the
// argument list.

var empty$1 = [];

pp$3.parseNew = function() {
  var node = this.startNode();
  var meta = this.parseIdent(true);
  if (this.options.ecmaVersion >= 6 && this.eat(types.dot)) {
    node.meta = meta;
    var containsEsc = this.containsEsc;
    node.property = this.parseIdent(true);
    if (node.property.name !== "target" || containsEsc)
      { this.raiseRecoverable(node.property.start, "The only valid meta property for new is new.target"); }
    if (!this.inFunction)
      { this.raiseRecoverable(node.start, "new.target can only be used in functions"); }
    return this.finishNode(node, "MetaProperty")
  }
  var startPos = this.start, startLoc = this.startLoc;
  node.callee = this.parseSubscripts(this.parseExprAtom(), startPos, startLoc, true);
  if (this.eat(types.parenL)) { node.arguments = this.parseExprList(types.parenR, this.options.ecmaVersion >= 8, false); }
  else { node.arguments = empty$1; }
  return this.finishNode(node, "NewExpression")
};

// Parse template expression.

pp$3.parseTemplateElement = function(ref) {
  var isTagged = ref.isTagged;

  var elem = this.startNode();
  if (this.type === types.invalidTemplate) {
    if (!isTagged) {
      this.raiseRecoverable(this.start, "Bad escape sequence in untagged template literal");
    }
    elem.value = {
      raw: this.value,
      cooked: null
    };
  } else {
    elem.value = {
      raw: this.input.slice(this.start, this.end).replace(/\r\n?/g, "\n"),
      cooked: this.value
    };
  }
  this.next();
  elem.tail = this.type === types.backQuote;
  return this.finishNode(elem, "TemplateElement")
};

pp$3.parseTemplate = function(ref) {
  var this$1 = this;
  if ( ref === void 0 ) ref = {};
  var isTagged = ref.isTagged; if ( isTagged === void 0 ) isTagged = false;

  var node = this.startNode();
  this.next();
  node.expressions = [];
  var curElt = this.parseTemplateElement({isTagged: isTagged});
  node.quasis = [curElt];
  while (!curElt.tail) {
    this$1.expect(types.dollarBraceL);
    node.expressions.push(this$1.parseExpression());
    this$1.expect(types.braceR);
    node.quasis.push(curElt = this$1.parseTemplateElement({isTagged: isTagged}));
  }
  this.next();
  return this.finishNode(node, "TemplateLiteral")
};

pp$3.isAsyncProp = function(prop) {
  return !prop.computed && prop.key.type === "Identifier" && prop.key.name === "async" &&
    (this.type === types.name || this.type === types.num || this.type === types.string || this.type === types.bracketL || this.type.keyword) &&
    !lineBreak.test(this.input.slice(this.lastTokEnd, this.start))
};

// Parse an object literal or binding pattern.

pp$3.parseObj = function(isPattern, refDestructuringErrors) {
  var this$1 = this;

  var node = this.startNode(), first = true, propHash = {};
  node.properties = [];
  this.next();
  while (!this.eat(types.braceR)) {
    if (!first) {
      this$1.expect(types.comma);
      if (this$1.afterTrailingComma(types.braceR)) { break }
    } else { first = false; }

    var prop = this$1.parseProperty(isPattern, refDestructuringErrors);
    if (!isPattern) { this$1.checkPropClash(prop, propHash, refDestructuringErrors); }
    node.properties.push(prop);
  }
  return this.finishNode(node, isPattern ? "ObjectPattern" : "ObjectExpression")
};

pp$3.parseProperty = function(isPattern, refDestructuringErrors) {
  var prop = this.startNode(), isGenerator, isAsync, startPos, startLoc;
  if (this.options.ecmaVersion >= 6) {
    prop.method = false;
    prop.shorthand = false;
    if (isPattern || refDestructuringErrors) {
      startPos = this.start;
      startLoc = this.startLoc;
    }
    if (!isPattern)
      { isGenerator = this.eat(types.star); }
  }
  var containsEsc = this.containsEsc;
  this.parsePropertyName(prop);
  if (!isPattern && !containsEsc && this.options.ecmaVersion >= 8 && !isGenerator && this.isAsyncProp(prop)) {
    isAsync = true;
    this.parsePropertyName(prop, refDestructuringErrors);
  } else {
    isAsync = false;
  }
  this.parsePropertyValue(prop, isPattern, isGenerator, isAsync, startPos, startLoc, refDestructuringErrors, containsEsc);
  return this.finishNode(prop, "Property")
};

pp$3.parsePropertyValue = function(prop, isPattern, isGenerator, isAsync, startPos, startLoc, refDestructuringErrors, containsEsc) {
  if ((isGenerator || isAsync) && this.type === types.colon)
    { this.unexpected(); }

  if (this.eat(types.colon)) {
    prop.value = isPattern ? this.parseMaybeDefault(this.start, this.startLoc) : this.parseMaybeAssign(false, refDestructuringErrors);
    prop.kind = "init";
  } else if (this.options.ecmaVersion >= 6 && this.type === types.parenL) {
    if (isPattern) { this.unexpected(); }
    prop.kind = "init";
    prop.method = true;
    prop.value = this.parseMethod(isGenerator, isAsync);
  } else if (!isPattern && !containsEsc &&
             this.options.ecmaVersion >= 5 && !prop.computed && prop.key.type === "Identifier" &&
             (prop.key.name === "get" || prop.key.name === "set") &&
             (this.type != types.comma && this.type != types.braceR)) {
    if (isGenerator || isAsync) { this.unexpected(); }
    prop.kind = prop.key.name;
    this.parsePropertyName(prop);
    prop.value = this.parseMethod(false);
    var paramCount = prop.kind === "get" ? 0 : 1;
    if (prop.value.params.length !== paramCount) {
      var start = prop.value.start;
      if (prop.kind === "get")
        { this.raiseRecoverable(start, "getter should have no params"); }
      else
        { this.raiseRecoverable(start, "setter should have exactly one param"); }
    } else {
      if (prop.kind === "set" && prop.value.params[0].type === "RestElement")
        { this.raiseRecoverable(prop.value.params[0].start, "Setter cannot use rest params"); }
    }
  } else if (this.options.ecmaVersion >= 6 && !prop.computed && prop.key.type === "Identifier") {
    this.checkUnreserved(prop.key);
    prop.kind = "init";
    if (isPattern) {
      prop.value = this.parseMaybeDefault(startPos, startLoc, prop.key);
    } else if (this.type === types.eq && refDestructuringErrors) {
      if (refDestructuringErrors.shorthandAssign < 0)
        { refDestructuringErrors.shorthandAssign = this.start; }
      prop.value = this.parseMaybeDefault(startPos, startLoc, prop.key);
    } else {
      prop.value = prop.key;
    }
    prop.shorthand = true;
  } else { this.unexpected(); }
};

pp$3.parsePropertyName = function(prop) {
  if (this.options.ecmaVersion >= 6) {
    if (this.eat(types.bracketL)) {
      prop.computed = true;
      prop.key = this.parseMaybeAssign();
      this.expect(types.bracketR);
      return prop.key
    } else {
      prop.computed = false;
    }
  }
  return prop.key = this.type === types.num || this.type === types.string ? this.parseExprAtom() : this.parseIdent(true)
};

// Initialize empty function node.

pp$3.initFunction = function(node) {
  node.id = null;
  if (this.options.ecmaVersion >= 6) {
    node.generator = false;
    node.expression = false;
  }
  if (this.options.ecmaVersion >= 8)
    { node.async = false; }
};

// Parse object or class method.

pp$3.parseMethod = function(isGenerator, isAsync) {
  var node = this.startNode(), oldInGen = this.inGenerator, oldInAsync = this.inAsync,
      oldYieldPos = this.yieldPos, oldAwaitPos = this.awaitPos, oldInFunc = this.inFunction;

  this.initFunction(node);
  if (this.options.ecmaVersion >= 6)
    { node.generator = isGenerator; }
  if (this.options.ecmaVersion >= 8)
    { node.async = !!isAsync; }

  this.inGenerator = node.generator;
  this.inAsync = node.async;
  this.yieldPos = 0;
  this.awaitPos = 0;
  this.inFunction = true;
  this.enterFunctionScope();

  this.expect(types.parenL);
  node.params = this.parseBindingList(types.parenR, false, this.options.ecmaVersion >= 8);
  this.checkYieldAwaitInDefaultParams();
  this.parseFunctionBody(node, false);

  this.inGenerator = oldInGen;
  this.inAsync = oldInAsync;
  this.yieldPos = oldYieldPos;
  this.awaitPos = oldAwaitPos;
  this.inFunction = oldInFunc;
  return this.finishNode(node, "FunctionExpression")
};

// Parse arrow function expression with given parameters.

pp$3.parseArrowExpression = function(node, params, isAsync) {
  var oldInGen = this.inGenerator, oldInAsync = this.inAsync,
      oldYieldPos = this.yieldPos, oldAwaitPos = this.awaitPos, oldInFunc = this.inFunction;

  this.enterFunctionScope();
  this.initFunction(node);
  if (this.options.ecmaVersion >= 8)
    { node.async = !!isAsync; }

  this.inGenerator = false;
  this.inAsync = node.async;
  this.yieldPos = 0;
  this.awaitPos = 0;
  this.inFunction = true;

  node.params = this.toAssignableList(params, true);
  this.parseFunctionBody(node, true);

  this.inGenerator = oldInGen;
  this.inAsync = oldInAsync;
  this.yieldPos = oldYieldPos;
  this.awaitPos = oldAwaitPos;
  this.inFunction = oldInFunc;
  return this.finishNode(node, "ArrowFunctionExpression")
};

// Parse function body and check parameters.

pp$3.parseFunctionBody = function(node, isArrowFunction) {
  var isExpression = isArrowFunction && this.type !== types.braceL;
  var oldStrict = this.strict, useStrict = false;

  if (isExpression) {
    node.body = this.parseMaybeAssign();
    node.expression = true;
    this.checkParams(node, false);
  } else {
    var nonSimple = this.options.ecmaVersion >= 7 && !this.isSimpleParamList(node.params);
    if (!oldStrict || nonSimple) {
      useStrict = this.strictDirective(this.end);
      // If this is a strict mode function, verify that argument names
      // are not repeated, and it does not try to bind the words `eval`
      // or `arguments`.
      if (useStrict && nonSimple)
        { this.raiseRecoverable(node.start, "Illegal 'use strict' directive in function with non-simple parameter list"); }
    }
    // Start a new scope with regard to labels and the `inFunction`
    // flag (restore them to their old value afterwards).
    var oldLabels = this.labels;
    this.labels = [];
    if (useStrict) { this.strict = true; }

    // Add the params to varDeclaredNames to ensure that an error is thrown
    // if a let/const declaration in the function clashes with one of the params.
    this.checkParams(node, !oldStrict && !useStrict && !isArrowFunction && this.isSimpleParamList(node.params));
    node.body = this.parseBlock(false);
    node.expression = false;
    this.adaptDirectivePrologue(node.body.body);
    this.labels = oldLabels;
  }
  this.exitFunctionScope();

  if (this.strict && node.id) {
    // Ensure the function name isn't a forbidden identifier in strict mode, e.g. 'eval'
    this.checkLVal(node.id, "none");
  }
  this.strict = oldStrict;
};

pp$3.isSimpleParamList = function(params) {
  for (var i = 0, list = params; i < list.length; i += 1)
    {
    var param = list[i];

    if (param.type !== "Identifier") { return false
  } }
  return true
};

// Checks function params for various disallowed patterns such as using "eval"
// or "arguments" and duplicate parameters.

pp$3.checkParams = function(node, allowDuplicates) {
  var this$1 = this;

  var nameHash = {};
  for (var i = 0, list = node.params; i < list.length; i += 1)
    {
    var param = list[i];

    this$1.checkLVal(param, "var", allowDuplicates ? null : nameHash);
  }
};

// Parses a comma-separated list of expressions, and returns them as
// an array. `close` is the token type that ends the list, and
// `allowEmpty` can be turned on to allow subsequent commas with
// nothing in between them to be parsed as `null` (which is needed
// for array literals).

pp$3.parseExprList = function(close, allowTrailingComma, allowEmpty, refDestructuringErrors) {
  var this$1 = this;

  var elts = [], first = true;
  while (!this.eat(close)) {
    if (!first) {
      this$1.expect(types.comma);
      if (allowTrailingComma && this$1.afterTrailingComma(close)) { break }
    } else { first = false; }

    var elt = (void 0);
    if (allowEmpty && this$1.type === types.comma)
      { elt = null; }
    else if (this$1.type === types.ellipsis) {
      elt = this$1.parseSpread(refDestructuringErrors);
      if (refDestructuringErrors && this$1.type === types.comma && refDestructuringErrors.trailingComma < 0)
        { refDestructuringErrors.trailingComma = this$1.start; }
    } else {
      elt = this$1.parseMaybeAssign(false, refDestructuringErrors);
    }
    elts.push(elt);
  }
  return elts
};

pp$3.checkUnreserved = function(ref) {
  var start = ref.start;
  var end = ref.end;
  var name = ref.name;

  if (this.inGenerator && name === "yield")
    { this.raiseRecoverable(start, "Can not use 'yield' as identifier inside a generator"); }
  if (this.inAsync && name === "await")
    { this.raiseRecoverable(start, "Can not use 'await' as identifier inside an async function"); }
  if (this.isKeyword(name))
    { this.raise(start, ("Unexpected keyword '" + name + "'")); }
  if (this.options.ecmaVersion < 6 &&
    this.input.slice(start, end).indexOf("\\") != -1) { return }
  var re = this.strict ? this.reservedWordsStrict : this.reservedWords;
  if (re.test(name)) {
    if (!this.inAsync && name === "await")
      { this.raiseRecoverable(start, "Can not use keyword 'await' outside an async function"); }
    this.raiseRecoverable(start, ("The keyword '" + name + "' is reserved"));
  }
};

// Parse the next token as an identifier. If `liberal` is true (used
// when parsing properties), it will also convert keywords into
// identifiers.

pp$3.parseIdent = function(liberal, isBinding) {
  var node = this.startNode();
  if (liberal && this.options.allowReserved == "never") { liberal = false; }
  if (this.type === types.name) {
    node.name = this.value;
  } else if (this.type.keyword) {
    node.name = this.type.keyword;

    // To fix https://github.com/acornjs/acorn/issues/575
    // `class` and `function` keywords push new context into this.context.
    // But there is no chance to pop the context if the keyword is consumed as an identifier such as a property name.
    // If the previous token is a dot, this does not apply because the context-managing code already ignored the keyword
    if ((node.name === "class" || node.name === "function") &&
        (this.lastTokEnd !== this.lastTokStart + 1 || this.input.charCodeAt(this.lastTokStart) !== 46)) {
      this.context.pop();
    }
  } else {
    this.unexpected();
  }
  this.next();
  this.finishNode(node, "Identifier");
  if (!liberal) { this.checkUnreserved(node); }
  return node
};

// Parses yield expression inside generator.

pp$3.parseYield = function() {
  if (!this.yieldPos) { this.yieldPos = this.start; }

  var node = this.startNode();
  this.next();
  if (this.type == types.semi || this.canInsertSemicolon() || (this.type != types.star && !this.type.startsExpr)) {
    node.delegate = false;
    node.argument = null;
  } else {
    node.delegate = this.eat(types.star);
    node.argument = this.parseMaybeAssign();
  }
  return this.finishNode(node, "YieldExpression")
};

pp$3.parseAwait = function() {
  if (!this.awaitPos) { this.awaitPos = this.start; }

  var node = this.startNode();
  this.next();
  node.argument = this.parseMaybeUnary(null, true);
  return this.finishNode(node, "AwaitExpression")
};

var pp$4 = Parser.prototype;

// This function is used to raise exceptions on parse errors. It
// takes an offset integer (into the current `input`) to indicate
// the location of the error, attaches the position to the end
// of the error message, and then raises a `SyntaxError` with that
// message.

pp$4.raise = function(pos, message) {
  var loc = getLineInfo(this.input, pos);
  message += " (" + loc.line + ":" + loc.column + ")";
  var err = new SyntaxError(message);
  err.pos = pos; err.loc = loc; err.raisedAt = this.pos;
  throw err
};

pp$4.raiseRecoverable = pp$4.raise;

pp$4.curPosition = function() {
  if (this.options.locations) {
    return new Position(this.curLine, this.pos - this.lineStart)
  }
};

var pp$5 = Parser.prototype;

// Object.assign polyfill
var assign = Object.assign || function(target) {
  var sources = [], len = arguments.length - 1;
  while ( len-- > 0 ) sources[ len ] = arguments[ len + 1 ];

  for (var i = 0, list = sources; i < list.length; i += 1) {
    var source = list[i];

    for (var key in source) {
      if (has(source, key)) {
        target[key] = source[key];
      }
    }
  }
  return target
};

// The functions in this module keep track of declared variables in the current scope in order to detect duplicate variable names.

pp$5.enterFunctionScope = function() {
  // var: a hash of var-declared names in the current lexical scope
  // lexical: a hash of lexically-declared names in the current lexical scope
  // childVar: a hash of var-declared names in all child lexical scopes of the current lexical scope (within the current function scope)
  // parentLexical: a hash of lexically-declared names in all parent lexical scopes of the current lexical scope (within the current function scope)
  this.scopeStack.push({var: {}, lexical: {}, childVar: {}, parentLexical: {}});
};

pp$5.exitFunctionScope = function() {
  this.scopeStack.pop();
};

pp$5.enterLexicalScope = function() {
  var parentScope = this.scopeStack[this.scopeStack.length - 1];
  var childScope = {var: {}, lexical: {}, childVar: {}, parentLexical: {}};

  this.scopeStack.push(childScope);
  assign(childScope.parentLexical, parentScope.lexical, parentScope.parentLexical);
};

pp$5.exitLexicalScope = function() {
  var childScope = this.scopeStack.pop();
  var parentScope = this.scopeStack[this.scopeStack.length - 1];

  assign(parentScope.childVar, childScope.var, childScope.childVar);
};

/**
 * A name can be declared with `var` if there are no variables with the same name declared with `let`/`const`
 * in the current lexical scope or any of the parent lexical scopes in this function.
 */
pp$5.canDeclareVarName = function(name) {
  var currentScope = this.scopeStack[this.scopeStack.length - 1];

  return !has(currentScope.lexical, name) && !has(currentScope.parentLexical, name)
};

/**
 * A name can be declared with `let`/`const` if there are no variables with the same name declared with `let`/`const`
 * in the current scope, and there are no variables with the same name declared with `var` in the current scope or in
 * any child lexical scopes in this function.
 */
pp$5.canDeclareLexicalName = function(name) {
  var currentScope = this.scopeStack[this.scopeStack.length - 1];

  return !has(currentScope.lexical, name) && !has(currentScope.var, name) && !has(currentScope.childVar, name)
};

pp$5.declareVarName = function(name) {
  this.scopeStack[this.scopeStack.length - 1].var[name] = true;
};

pp$5.declareLexicalName = function(name) {
  this.scopeStack[this.scopeStack.length - 1].lexical[name] = true;
};

var Node = function Node(parser, pos, loc) {
  this.type = "";
  this.start = pos;
  this.end = 0;
  if (parser.options.locations)
    { this.loc = new SourceLocation(parser, loc); }
  if (parser.options.directSourceFile)
    { this.sourceFile = parser.options.directSourceFile; }
  if (parser.options.ranges)
    { this.range = [pos, 0]; }
};

// Start an AST node, attaching a start offset.

var pp$6 = Parser.prototype;

pp$6.startNode = function() {
  return new Node(this, this.start, this.startLoc)
};

pp$6.startNodeAt = function(pos, loc) {
  return new Node(this, pos, loc)
};

// Finish an AST node, adding `type` and `end` properties.

function finishNodeAt(node, type, pos, loc) {
  node.type = type;
  node.end = pos;
  if (this.options.locations)
    { node.loc.end = loc; }
  if (this.options.ranges)
    { node.range[1] = pos; }
  return node
}

pp$6.finishNode = function(node, type) {
  return finishNodeAt.call(this, node, type, this.lastTokEnd, this.lastTokEndLoc)
};

// Finish node at given position

pp$6.finishNodeAt = function(node, type, pos, loc) {
  return finishNodeAt.call(this, node, type, pos, loc)
};

// The algorithm used to determine whether a regexp can appear at a
// given point in the program is loosely based on sweet.js' approach.
// See https://github.com/mozilla/sweet.js/wiki/design

var TokContext = function TokContext(token, isExpr, preserveSpace, override, generator) {
  this.token = token;
  this.isExpr = !!isExpr;
  this.preserveSpace = !!preserveSpace;
  this.override = override;
  this.generator = !!generator;
};

var types$1 = {
  b_stat: new TokContext("{", false),
  b_expr: new TokContext("{", true),
  b_tmpl: new TokContext("${", false),
  p_stat: new TokContext("(", false),
  p_expr: new TokContext("(", true),
  q_tmpl: new TokContext("`", true, true, function (p) { return p.tryReadTemplateToken(); }),
  f_stat: new TokContext("function", false),
  f_expr: new TokContext("function", true),
  f_expr_gen: new TokContext("function", true, false, null, true),
  f_gen: new TokContext("function", false, false, null, true)
};

var pp$7 = Parser.prototype;

pp$7.initialContext = function() {
  return [types$1.b_stat]
};

pp$7.braceIsBlock = function(prevType) {
  var parent = this.curContext();
  if (parent === types$1.f_expr || parent === types$1.f_stat)
    { return true }
  if (prevType === types.colon && (parent === types$1.b_stat || parent === types$1.b_expr))
    { return !parent.isExpr }

  // The check for `tt.name && exprAllowed` detects whether we are
  // after a `yield` or `of` construct. See the `updateContext` for
  // `tt.name`.
  if (prevType === types._return || prevType == types.name && this.exprAllowed)
    { return lineBreak.test(this.input.slice(this.lastTokEnd, this.start)) }
  if (prevType === types._else || prevType === types.semi || prevType === types.eof || prevType === types.parenR || prevType == types.arrow)
    { return true }
  if (prevType == types.braceL)
    { return parent === types$1.b_stat }
  if (prevType == types._var || prevType == types.name)
    { return false }
  return !this.exprAllowed
};

pp$7.inGeneratorContext = function() {
  var this$1 = this;

  for (var i = this.context.length - 1; i >= 1; i--) {
    var context = this$1.context[i];
    if (context.token === "function")
      { return context.generator }
  }
  return false
};

pp$7.updateContext = function(prevType) {
  var update, type = this.type;
  if (type.keyword && prevType == types.dot)
    { this.exprAllowed = false; }
  else if (update = type.updateContext)
    { update.call(this, prevType); }
  else
    { this.exprAllowed = type.beforeExpr; }
};

// Token-specific context update code

types.parenR.updateContext = types.braceR.updateContext = function() {
  if (this.context.length == 1) {
    this.exprAllowed = true;
    return
  }
  var out = this.context.pop();
  if (out === types$1.b_stat && this.curContext().token === "function") {
    out = this.context.pop();
  }
  this.exprAllowed = !out.isExpr;
};

types.braceL.updateContext = function(prevType) {
  this.context.push(this.braceIsBlock(prevType) ? types$1.b_stat : types$1.b_expr);
  this.exprAllowed = true;
};

types.dollarBraceL.updateContext = function() {
  this.context.push(types$1.b_tmpl);
  this.exprAllowed = true;
};

types.parenL.updateContext = function(prevType) {
  var statementParens = prevType === types._if || prevType === types._for || prevType === types._with || prevType === types._while;
  this.context.push(statementParens ? types$1.p_stat : types$1.p_expr);
  this.exprAllowed = true;
};

types.incDec.updateContext = function() {
  // tokExprAllowed stays unchanged
};

types._function.updateContext = types._class.updateContext = function(prevType) {
  if (prevType.beforeExpr && prevType !== types.semi && prevType !== types._else &&
      !((prevType === types.colon || prevType === types.braceL) && this.curContext() === types$1.b_stat))
    { this.context.push(types$1.f_expr); }
  else
    { this.context.push(types$1.f_stat); }
  this.exprAllowed = false;
};

types.backQuote.updateContext = function() {
  if (this.curContext() === types$1.q_tmpl)
    { this.context.pop(); }
  else
    { this.context.push(types$1.q_tmpl); }
  this.exprAllowed = false;
};

types.star.updateContext = function(prevType) {
  if (prevType == types._function) {
    var index = this.context.length - 1;
    if (this.context[index] === types$1.f_expr)
      { this.context[index] = types$1.f_expr_gen; }
    else
      { this.context[index] = types$1.f_gen; }
  }
  this.exprAllowed = true;
};

types.name.updateContext = function(prevType) {
  var allowed = false;
  if (this.options.ecmaVersion >= 6) {
    if (this.value == "of" && !this.exprAllowed ||
        this.value == "yield" && this.inGeneratorContext())
      { allowed = true; }
  }
  this.exprAllowed = allowed;
};

// Object type used to represent tokens. Note that normally, tokens
// simply exist as properties on the parser object. This is only
// used for the onToken callback and the external tokenizer.

var Token = function Token(p) {
  this.type = p.type;
  this.value = p.value;
  this.start = p.start;
  this.end = p.end;
  if (p.options.locations)
    { this.loc = new SourceLocation(p, p.startLoc, p.endLoc); }
  if (p.options.ranges)
    { this.range = [p.start, p.end]; }
};

// ## Tokenizer

var pp$8 = Parser.prototype;

// Are we running under Rhino?
var isRhino = typeof Packages == "object" && Object.prototype.toString.call(Packages) == "[object JavaPackage]";

// Move to the next token

pp$8.next = function() {
  if (this.options.onToken)
    { this.options.onToken(new Token(this)); }

  this.lastTokEnd = this.end;
  this.lastTokStart = this.start;
  this.lastTokEndLoc = this.endLoc;
  this.lastTokStartLoc = this.startLoc;
  this.nextToken();
};

pp$8.getToken = function() {
  this.next();
  return new Token(this)
};

// If we're in an ES6 environment, make parsers iterable
if (typeof Symbol !== "undefined")
  { pp$8[Symbol.iterator] = function() {
    var this$1 = this;

    return {
      next: function () {
        var token = this$1.getToken();
        return {
          done: token.type === types.eof,
          value: token
        }
      }
    }
  }; }

// Toggle strict mode. Re-reads the next number or string to please
// pedantic tests (`"use strict"; 010;` should fail).

pp$8.curContext = function() {
  return this.context[this.context.length - 1]
};

// Read a single token, updating the parser object's token-related
// properties.

pp$8.nextToken = function() {
  var curContext = this.curContext();
  if (!curContext || !curContext.preserveSpace) { this.skipSpace(); }

  this.start = this.pos;
  if (this.options.locations) { this.startLoc = this.curPosition(); }
  if (this.pos >= this.input.length) { return this.finishToken(types.eof) }

  if (curContext.override) { return curContext.override(this) }
  else { this.readToken(this.fullCharCodeAtPos()); }
};

pp$8.readToken = function(code) {
  // Identifier or keyword. '\uXXXX' sequences are allowed in
  // identifiers, so '\' also dispatches to that.
  if (isIdentifierStart(code, this.options.ecmaVersion >= 6) || code === 92 /* '\' */)
    { return this.readWord() }

  return this.getTokenFromCode(code)
};

pp$8.fullCharCodeAtPos = function() {
  var code = this.input.charCodeAt(this.pos);
  if (code <= 0xd7ff || code >= 0xe000) { return code }
  var next = this.input.charCodeAt(this.pos + 1);
  return (code << 10) + next - 0x35fdc00
};

pp$8.skipBlockComment = function() {
  var this$1 = this;

  var startLoc = this.options.onComment && this.curPosition();
  var start = this.pos, end = this.input.indexOf("*/", this.pos += 2);
  if (end === -1) { this.raise(this.pos - 2, "Unterminated comment"); }
  this.pos = end + 2;
  if (this.options.locations) {
    lineBreakG.lastIndex = start;
    var match;
    while ((match = lineBreakG.exec(this.input)) && match.index < this.pos) {
      ++this$1.curLine;
      this$1.lineStart = match.index + match[0].length;
    }
  }
  if (this.options.onComment)
    { this.options.onComment(true, this.input.slice(start + 2, end), start, this.pos,
                           startLoc, this.curPosition()); }
};

pp$8.skipLineComment = function(startSkip) {
  var this$1 = this;

  var start = this.pos;
  var startLoc = this.options.onComment && this.curPosition();
  var ch = this.input.charCodeAt(this.pos += startSkip);
  while (this.pos < this.input.length && !isNewLine(ch)) {
    ch = this$1.input.charCodeAt(++this$1.pos);
  }
  if (this.options.onComment)
    { this.options.onComment(false, this.input.slice(start + startSkip, this.pos), start, this.pos,
                           startLoc, this.curPosition()); }
};

// Called at the start of the parse and after every token. Skips
// whitespace and comments, and.

pp$8.skipSpace = function() {
  var this$1 = this;

  loop: while (this.pos < this.input.length) {
    var ch = this$1.input.charCodeAt(this$1.pos);
    switch (ch) {
    case 32: case 160: // ' '
      ++this$1.pos;
      break
    case 13:
      if (this$1.input.charCodeAt(this$1.pos + 1) === 10) {
        ++this$1.pos;
      }
    case 10: case 8232: case 8233:
      ++this$1.pos;
      if (this$1.options.locations) {
        ++this$1.curLine;
        this$1.lineStart = this$1.pos;
      }
      break
    case 47: // '/'
      switch (this$1.input.charCodeAt(this$1.pos + 1)) {
      case 42: // '*'
        this$1.skipBlockComment();
        break
      case 47:
        this$1.skipLineComment(2);
        break
      default:
        break loop
      }
      break
    default:
      if (ch > 8 && ch < 14 || ch >= 5760 && nonASCIIwhitespace.test(String.fromCharCode(ch))) {
        ++this$1.pos;
      } else {
        break loop
      }
    }
  }
};

// Called at the end of every token. Sets `end`, `val`, and
// maintains `context` and `exprAllowed`, and skips the space after
// the token, so that the next one's `start` will point at the
// right position.

pp$8.finishToken = function(type, val) {
  this.end = this.pos;
  if (this.options.locations) { this.endLoc = this.curPosition(); }
  var prevType = this.type;
  this.type = type;
  this.value = val;

  this.updateContext(prevType);
};

// ### Token reading

// This is the function that is called to fetch the next token. It
// is somewhat obscure, because it works in character codes rather
// than characters, and because operator parsing has been inlined
// into it.
//
// All in the name of speed.
//
pp$8.readToken_dot = function() {
  var next = this.input.charCodeAt(this.pos + 1);
  if (next >= 48 && next <= 57) { return this.readNumber(true) }
  var next2 = this.input.charCodeAt(this.pos + 2);
  if (this.options.ecmaVersion >= 6 && next === 46 && next2 === 46) { // 46 = dot '.'
    this.pos += 3;
    return this.finishToken(types.ellipsis)
  } else {
    ++this.pos;
    return this.finishToken(types.dot)
  }
};

pp$8.readToken_slash = function() { // '/'
  var next = this.input.charCodeAt(this.pos + 1);
  if (this.exprAllowed) { ++this.pos; return this.readRegexp() }
  if (next === 61) { return this.finishOp(types.assign, 2) }
  return this.finishOp(types.slash, 1)
};

pp$8.readToken_mult_modulo_exp = function(code) { // '%*'
  var next = this.input.charCodeAt(this.pos + 1);
  var size = 1;
  var tokentype = code === 42 ? types.star : types.modulo;

  // exponentiation operator ** and **=
  if (this.options.ecmaVersion >= 7 && code == 42 && next === 42) {
    ++size;
    tokentype = types.starstar;
    next = this.input.charCodeAt(this.pos + 2);
  }

  if (next === 61) { return this.finishOp(types.assign, size + 1) }
  return this.finishOp(tokentype, size)
};

pp$8.readToken_pipe_amp = function(code) { // '|&'
  var next = this.input.charCodeAt(this.pos + 1);
  if (next === code) { return this.finishOp(code === 124 ? types.logicalOR : types.logicalAND, 2) }
  if (next === 61) { return this.finishOp(types.assign, 2) }
  return this.finishOp(code === 124 ? types.bitwiseOR : types.bitwiseAND, 1)
};

pp$8.readToken_caret = function() { // '^'
  var next = this.input.charCodeAt(this.pos + 1);
  if (next === 61) { return this.finishOp(types.assign, 2) }
  return this.finishOp(types.bitwiseXOR, 1)
};

pp$8.readToken_plus_min = function(code) { // '+-'
  var next = this.input.charCodeAt(this.pos + 1);
  if (next === code) {
    if (next == 45 && !this.inModule && this.input.charCodeAt(this.pos + 2) == 62 &&
        (this.lastTokEnd === 0 || lineBreak.test(this.input.slice(this.lastTokEnd, this.pos)))) {
      // A `-->` line comment
      this.skipLineComment(3);
      this.skipSpace();
      return this.nextToken()
    }
    return this.finishOp(types.incDec, 2)
  }
  if (next === 61) { return this.finishOp(types.assign, 2) }
  return this.finishOp(types.plusMin, 1)
};

pp$8.readToken_lt_gt = function(code) { // '<>'
  var next = this.input.charCodeAt(this.pos + 1);
  var size = 1;
  if (next === code) {
    size = code === 62 && this.input.charCodeAt(this.pos + 2) === 62 ? 3 : 2;
    if (this.input.charCodeAt(this.pos + size) === 61) { return this.finishOp(types.assign, size + 1) }
    return this.finishOp(types.bitShift, size)
  }
  if (next == 33 && code == 60 && !this.inModule && this.input.charCodeAt(this.pos + 2) == 45 &&
      this.input.charCodeAt(this.pos + 3) == 45) {
    // `<!--`, an XML-style comment that should be interpreted as a line comment
    this.skipLineComment(4);
    this.skipSpace();
    return this.nextToken()
  }
  if (next === 61) { size = 2; }
  return this.finishOp(types.relational, size)
};

pp$8.readToken_eq_excl = function(code) { // '=!'
  var next = this.input.charCodeAt(this.pos + 1);
  if (next === 61) { return this.finishOp(types.equality, this.input.charCodeAt(this.pos + 2) === 61 ? 3 : 2) }
  if (code === 61 && next === 62 && this.options.ecmaVersion >= 6) { // '=>'
    this.pos += 2;
    return this.finishToken(types.arrow)
  }
  return this.finishOp(code === 61 ? types.eq : types.prefix, 1)
};

pp$8.getTokenFromCode = function(code) {
  switch (code) {
  // The interpretation of a dot depends on whether it is followed
  // by a digit or another two dots.
  case 46: // '.'
    return this.readToken_dot()

  // Punctuation tokens.
  case 40: ++this.pos; return this.finishToken(types.parenL)
  case 41: ++this.pos; return this.finishToken(types.parenR)
  case 59: ++this.pos; return this.finishToken(types.semi)
  case 44: ++this.pos; return this.finishToken(types.comma)
  case 91: ++this.pos; return this.finishToken(types.bracketL)
  case 93: ++this.pos; return this.finishToken(types.bracketR)
  case 123: ++this.pos; return this.finishToken(types.braceL)
  case 125: ++this.pos; return this.finishToken(types.braceR)
  case 58: ++this.pos; return this.finishToken(types.colon)
  case 63: ++this.pos; return this.finishToken(types.question)

  case 96: // '`'
    if (this.options.ecmaVersion < 6) { break }
    ++this.pos;
    return this.finishToken(types.backQuote)

  case 48: // '0'
    var next = this.input.charCodeAt(this.pos + 1);
    if (next === 120 || next === 88) { return this.readRadixNumber(16) } // '0x', '0X' - hex number
    if (this.options.ecmaVersion >= 6) {
      if (next === 111 || next === 79) { return this.readRadixNumber(8) } // '0o', '0O' - octal number
      if (next === 98 || next === 66) { return this.readRadixNumber(2) } // '0b', '0B' - binary number
    }

  // Anything else beginning with a digit is an integer, octal
  // number, or float.
  case 49: case 50: case 51: case 52: case 53: case 54: case 55: case 56: case 57: // 1-9
    return this.readNumber(false)

  // Quotes produce strings.
  case 34: case 39: // '"', "'"
    return this.readString(code)

  // Operators are parsed inline in tiny state machines. '=' (61) is
  // often referred to. `finishOp` simply skips the amount of
  // characters it is given as second argument, and returns a token
  // of the type given by its first argument.

  case 47: // '/'
    return this.readToken_slash()

  case 37: case 42: // '%*'
    return this.readToken_mult_modulo_exp(code)

  case 124: case 38: // '|&'
    return this.readToken_pipe_amp(code)

  case 94: // '^'
    return this.readToken_caret()

  case 43: case 45: // '+-'
    return this.readToken_plus_min(code)

  case 60: case 62: // '<>'
    return this.readToken_lt_gt(code)

  case 61: case 33: // '=!'
    return this.readToken_eq_excl(code)

  case 126: // '~'
    return this.finishOp(types.prefix, 1)
  }

  this.raise(this.pos, "Unexpected character '" + codePointToString(code) + "'");
};

pp$8.finishOp = function(type, size) {
  var str = this.input.slice(this.pos, this.pos + size);
  this.pos += size;
  return this.finishToken(type, str)
};

// Parse a regular expression. Some context-awareness is necessary,
// since a '/' inside a '[]' set does not end the expression.

function tryCreateRegexp(src, flags, throwErrorAt, parser) {
  try {
    return new RegExp(src, flags)
  } catch (e) {
    if (throwErrorAt !== undefined) {
      if (e instanceof SyntaxError) { parser.raise(throwErrorAt, "Error parsing regular expression: " + e.message); }
      throw e
    }
  }
}

var regexpUnicodeSupport = !!tryCreateRegexp("\uffff", "u");

pp$8.readRegexp = function() {
  var this$1 = this;

  var escaped, inClass, start = this.pos;
  for (;;) {
    if (this$1.pos >= this$1.input.length) { this$1.raise(start, "Unterminated regular expression"); }
    var ch = this$1.input.charAt(this$1.pos);
    if (lineBreak.test(ch)) { this$1.raise(start, "Unterminated regular expression"); }
    if (!escaped) {
      if (ch === "[") { inClass = true; }
      else if (ch === "]" && inClass) { inClass = false; }
      else if (ch === "/" && !inClass) { break }
      escaped = ch === "\\";
    } else { escaped = false; }
    ++this$1.pos;
  }
  var content = this.input.slice(start, this.pos);
  ++this.pos;
  // Need to use `readWord1` because '\uXXXX' sequences are allowed
  // here (don't ask).
  var mods = this.readWord1();
  var tmp = content, tmpFlags = "";
  if (mods) {
    var validFlags = /^[gim]*$/;
    if (this.options.ecmaVersion >= 6) { validFlags = /^[gimuy]*$/; }
    if (this.options.ecmaVersion >= 9) { validFlags = /^[gimsuy]*$/; }
    if (!validFlags.test(mods)) { this.raise(start, "Invalid regular expression flag"); }
    if (mods.indexOf("u") >= 0) {
      if (regexpUnicodeSupport) {
        tmpFlags = "u";
      } else {
        // Replace each astral symbol and every Unicode escape sequence that
        // possibly represents an astral symbol or a paired surrogate with a
        // single ASCII symbol to avoid throwing on regular expressions that
        // are only valid in combination with the `/u` flag.
        // Note: replacing with the ASCII symbol `x` might cause false
        // negatives in unlikely scenarios. For example, `[\u{61}-b]` is a
        // perfectly valid pattern that is equivalent to `[a-b]`, but it would
        // be replaced by `[x-b]` which throws an error.
        tmp = tmp.replace(/\\u\{([0-9a-fA-F]+)\}/g, function (_match, code, offset) {
          code = Number("0x" + code);
          if (code > 0x10FFFF) { this$1.raise(start + offset + 3, "Code point out of bounds"); }
          return "x"
        });
        tmp = tmp.replace(/\\u([a-fA-F0-9]{4})|[\uD800-\uDBFF][\uDC00-\uDFFF]/g, "x");
        tmpFlags = tmpFlags.replace("u", "");
      }
    }
  }
  // Detect invalid regular expressions.
  var value = null;
  // Rhino's regular expression parser is flaky and throws uncatchable exceptions,
  // so don't do detection if we are running under Rhino
  if (!isRhino) {
    tryCreateRegexp(tmp, tmpFlags, start, this);
    // Get a regular expression object for this pattern-flag pair, or `null` in
    // case the current environment doesn't support the flags it uses.
    value = tryCreateRegexp(content, mods);
  }
  return this.finishToken(types.regexp, {pattern: content, flags: mods, value: value})
};

// Read an integer in the given radix. Return null if zero digits
// were read, the integer value otherwise. When `len` is given, this
// will return `null` unless the integer has exactly `len` digits.

pp$8.readInt = function(radix, len) {
  var this$1 = this;

  var start = this.pos, total = 0;
  for (var i = 0, e = len == null ? Infinity : len; i < e; ++i) {
    var code = this$1.input.charCodeAt(this$1.pos), val = (void 0);
    if (code >= 97) { val = code - 97 + 10; } // a
    else if (code >= 65) { val = code - 65 + 10; } // A
    else if (code >= 48 && code <= 57) { val = code - 48; } // 0-9
    else { val = Infinity; }
    if (val >= radix) { break }
    ++this$1.pos;
    total = total * radix + val;
  }
  if (this.pos === start || len != null && this.pos - start !== len) { return null }

  return total
};

pp$8.readRadixNumber = function(radix) {
  this.pos += 2; // 0x
  var val = this.readInt(radix);
  if (val == null) { this.raise(this.start + 2, "Expected number in radix " + radix); }
  if (isIdentifierStart(this.fullCharCodeAtPos())) { this.raise(this.pos, "Identifier directly after number"); }
  return this.finishToken(types.num, val)
};

// Read an integer, octal integer, or floating-point number.

pp$8.readNumber = function(startsWithDot) {
  var start = this.pos;
  if (!startsWithDot && this.readInt(10) === null) { this.raise(start, "Invalid number"); }
  var octal = this.pos - start >= 2 && this.input.charCodeAt(start) === 48;
  if (octal && this.strict) { this.raise(start, "Invalid number"); }
  if (octal && /[89]/.test(this.input.slice(start, this.pos))) { octal = false; }
  var next = this.input.charCodeAt(this.pos);
  if (next === 46 && !octal) { // '.'
    ++this.pos;
    this.readInt(10);
    next = this.input.charCodeAt(this.pos);
  }
  if ((next === 69 || next === 101) && !octal) { // 'eE'
    next = this.input.charCodeAt(++this.pos);
    if (next === 43 || next === 45) { ++this.pos; } // '+-'
    if (this.readInt(10) === null) { this.raise(start, "Invalid number"); }
  }
  if (isIdentifierStart(this.fullCharCodeAtPos())) { this.raise(this.pos, "Identifier directly after number"); }

  var str = this.input.slice(start, this.pos);
  var val = octal ? parseInt(str, 8) : parseFloat(str);
  return this.finishToken(types.num, val)
};

// Read a string value, interpreting backslash-escapes.

pp$8.readCodePoint = function() {
  var ch = this.input.charCodeAt(this.pos), code;

  if (ch === 123) { // '{'
    if (this.options.ecmaVersion < 6) { this.unexpected(); }
    var codePos = ++this.pos;
    code = this.readHexChar(this.input.indexOf("}", this.pos) - this.pos);
    ++this.pos;
    if (code > 0x10FFFF) { this.invalidStringToken(codePos, "Code point out of bounds"); }
  } else {
    code = this.readHexChar(4);
  }
  return code
};

function codePointToString(code) {
  // UTF-16 Decoding
  if (code <= 0xFFFF) { return String.fromCharCode(code) }
  code -= 0x10000;
  return String.fromCharCode((code >> 10) + 0xD800, (code & 1023) + 0xDC00)
}

pp$8.readString = function(quote) {
  var this$1 = this;

  var out = "", chunkStart = ++this.pos;
  for (;;) {
    if (this$1.pos >= this$1.input.length) { this$1.raise(this$1.start, "Unterminated string constant"); }
    var ch = this$1.input.charCodeAt(this$1.pos);
    if (ch === quote) { break }
    if (ch === 92) { // '\'
      out += this$1.input.slice(chunkStart, this$1.pos);
      out += this$1.readEscapedChar(false);
      chunkStart = this$1.pos;
    } else {
      if (isNewLine(ch)) { this$1.raise(this$1.start, "Unterminated string constant"); }
      ++this$1.pos;
    }
  }
  out += this.input.slice(chunkStart, this.pos++);
  return this.finishToken(types.string, out)
};

// Reads template string tokens.

var INVALID_TEMPLATE_ESCAPE_ERROR = {};

pp$8.tryReadTemplateToken = function() {
  this.inTemplateElement = true;
  try {
    this.readTmplToken();
  } catch (err) {
    if (err === INVALID_TEMPLATE_ESCAPE_ERROR) {
      this.readInvalidTemplateToken();
    } else {
      throw err
    }
  }

  this.inTemplateElement = false;
};

pp$8.invalidStringToken = function(position, message) {
  if (this.inTemplateElement && this.options.ecmaVersion >= 9) {
    throw INVALID_TEMPLATE_ESCAPE_ERROR
  } else {
    this.raise(position, message);
  }
};

pp$8.readTmplToken = function() {
  var this$1 = this;

  var out = "", chunkStart = this.pos;
  for (;;) {
    if (this$1.pos >= this$1.input.length) { this$1.raise(this$1.start, "Unterminated template"); }
    var ch = this$1.input.charCodeAt(this$1.pos);
    if (ch === 96 || ch === 36 && this$1.input.charCodeAt(this$1.pos + 1) === 123) { // '`', '${'
      if (this$1.pos === this$1.start && (this$1.type === types.template || this$1.type === types.invalidTemplate)) {
        if (ch === 36) {
          this$1.pos += 2;
          return this$1.finishToken(types.dollarBraceL)
        } else {
          ++this$1.pos;
          return this$1.finishToken(types.backQuote)
        }
      }
      out += this$1.input.slice(chunkStart, this$1.pos);
      return this$1.finishToken(types.template, out)
    }
    if (ch === 92) { // '\'
      out += this$1.input.slice(chunkStart, this$1.pos);
      out += this$1.readEscapedChar(true);
      chunkStart = this$1.pos;
    } else if (isNewLine(ch)) {
      out += this$1.input.slice(chunkStart, this$1.pos);
      ++this$1.pos;
      switch (ch) {
      case 13:
        if (this$1.input.charCodeAt(this$1.pos) === 10) { ++this$1.pos; }
      case 10:
        out += "\n";
        break
      default:
        out += String.fromCharCode(ch);
        break
      }
      if (this$1.options.locations) {
        ++this$1.curLine;
        this$1.lineStart = this$1.pos;
      }
      chunkStart = this$1.pos;
    } else {
      ++this$1.pos;
    }
  }
};

// Reads a template token to search for the end, without validating any escape sequences
pp$8.readInvalidTemplateToken = function() {
  var this$1 = this;

  for (; this.pos < this.input.length; this.pos++) {
    switch (this$1.input[this$1.pos]) {
    case "\\":
      ++this$1.pos;
      break

    case "$":
      if (this$1.input[this$1.pos + 1] !== "{") {
        break
      }
    // falls through

    case "`":
      return this$1.finishToken(types.invalidTemplate, this$1.input.slice(this$1.start, this$1.pos))

    // no default
    }
  }
  this.raise(this.start, "Unterminated template");
};

// Used to read escaped characters

pp$8.readEscapedChar = function(inTemplate) {
  var ch = this.input.charCodeAt(++this.pos);
  ++this.pos;
  switch (ch) {
  case 110: return "\n" // 'n' -> '\n'
  case 114: return "\r" // 'r' -> '\r'
  case 120: return String.fromCharCode(this.readHexChar(2)) // 'x'
  case 117: return codePointToString(this.readCodePoint()) // 'u'
  case 116: return "\t" // 't' -> '\t'
  case 98: return "\b" // 'b' -> '\b'
  case 118: return "\u000b" // 'v' -> '\u000b'
  case 102: return "\f" // 'f' -> '\f'
  case 13: if (this.input.charCodeAt(this.pos) === 10) { ++this.pos; } // '\r\n'
  case 10: // ' \n'
    if (this.options.locations) { this.lineStart = this.pos; ++this.curLine; }
    return ""
  default:
    if (ch >= 48 && ch <= 55) {
      var octalStr = this.input.substr(this.pos - 1, 3).match(/^[0-7]+/)[0];
      var octal = parseInt(octalStr, 8);
      if (octal > 255) {
        octalStr = octalStr.slice(0, -1);
        octal = parseInt(octalStr, 8);
      }
      if (octalStr !== "0" && (this.strict || inTemplate)) {
        this.invalidStringToken(this.pos - 2, "Octal literal in strict mode");
      }
      this.pos += octalStr.length - 1;
      return String.fromCharCode(octal)
    }
    return String.fromCharCode(ch)
  }
};

// Used to read character escape sequences ('\x', '\u', '\U').

pp$8.readHexChar = function(len) {
  var codePos = this.pos;
  var n = this.readInt(16, len);
  if (n === null) { this.invalidStringToken(codePos, "Bad character escape sequence"); }
  return n
};

// Read an identifier, and return it as a string. Sets `this.containsEsc`
// to whether the word contained a '\u' escape.
//
// Incrementally adds only escaped chars, adding other chunks as-is
// as a micro-optimization.

pp$8.readWord1 = function() {
  var this$1 = this;

  this.containsEsc = false;
  var word = "", first = true, chunkStart = this.pos;
  var astral = this.options.ecmaVersion >= 6;
  while (this.pos < this.input.length) {
    var ch = this$1.fullCharCodeAtPos();
    if (isIdentifierChar(ch, astral)) {
      this$1.pos += ch <= 0xffff ? 1 : 2;
    } else if (ch === 92) { // "\"
      this$1.containsEsc = true;
      word += this$1.input.slice(chunkStart, this$1.pos);
      var escStart = this$1.pos;
      if (this$1.input.charCodeAt(++this$1.pos) != 117) // "u"
        { this$1.invalidStringToken(this$1.pos, "Expecting Unicode escape sequence \\uXXXX"); }
      ++this$1.pos;
      var esc = this$1.readCodePoint();
      if (!(first ? isIdentifierStart : isIdentifierChar)(esc, astral))
        { this$1.invalidStringToken(escStart, "Invalid Unicode escape"); }
      word += codePointToString(esc);
      chunkStart = this$1.pos;
    } else {
      break
    }
    first = false;
  }
  return word + this.input.slice(chunkStart, this.pos)
};

// Read an identifier or keyword token. Will check for reserved
// words when necessary.

pp$8.readWord = function() {
  var word = this.readWord1();
  var type = types.name;
  if (this.keywords.test(word)) {
    if (this.containsEsc) { this.raiseRecoverable(this.start, "Escape sequence in keyword " + word); }
    type = keywords$1[word];
  }
  return this.finishToken(type, word)
};

// Acorn is a tiny, fast JavaScript parser written in JavaScript.
//
// Acorn was written by Marijn Haverbeke, Ingvar Stepanyan, and
// various contributors and released under an MIT license.
//
// Git repositories for Acorn are available at
//
//     http://marijnhaverbeke.nl/git/acorn
//     https://github.com/acornjs/acorn.git
//
// Please use the [github bug tracker][ghbt] to report issues.
//
// [ghbt]: https://github.com/acornjs/acorn/issues
//
// This file defines the main parser interface. The library also comes
// with a [error-tolerant parser][dammit] and an
// [abstract syntax tree walker][walk], defined in other files.
//
// [dammit]: acorn_loose.js
// [walk]: util/walk.js

var version = "5.3.0";

// The main exported interface (under `self.acorn` when in the
// browser) is a `parse` function that takes a code string and
// returns an abstract syntax tree as specified by [Mozilla parser
// API][api].
//
// [api]: https://developer.mozilla.org/en-US/docs/SpiderMonkey/Parser_API

function parse(input, options) {
  return new Parser(options, input).parse()
}

// This function tries to parse a single expression at a given
// offset in a string. Useful for parsing mixed-language formats
// that embed JavaScript expressions.

function parseExpressionAt(input, pos, options) {
  var p = new Parser(options, input, pos);
  p.nextToken();
  return p.parseExpression()
}

// Acorn is organized as a tokenizer and a recursive-descent parser.
// The `tokenizer` export provides an interface to the tokenizer.

function tokenizer(input, options) {
  return new Parser(options, input)
}

// This is a terrible kludge to support the existing, pre-ES6
// interface where the loose parser module retroactively adds exports
// to this module.
 // eslint-disable-line camelcase
function addLooseExports(parse, Parser$$1, plugins$$1) {
  exports.parse_dammit = parse; // eslint-disable-line camelcase
  exports.LooseParser = Parser$$1;
  exports.pluginsLoose = plugins$$1;
}

exports.version = version;
exports.parse = parse;
exports.parseExpressionAt = parseExpressionAt;
exports.tokenizer = tokenizer;
exports.addLooseExports = addLooseExports;
exports.Parser = Parser;
exports.plugins = plugins;
exports.defaultOptions = defaultOptions;
exports.Position = Position;
exports.SourceLocation = SourceLocation;
exports.getLineInfo = getLineInfo;
exports.Node = Node;
exports.TokenType = TokenType;
exports.tokTypes = types;
exports.keywordTypes = keywords$1;
exports.TokContext = TokContext;
exports.tokContexts = types$1;
exports.isIdentifierChar = isIdentifierChar;
exports.isIdentifierStart = isIdentifierStart;
exports.Token = Token;
exports.isNewLine = isNewLine;
exports.lineBreak = lineBreak;
exports.lineBreakG = lineBreakG;
exports.nonASCIIwhitespace = nonASCIIwhitespace;

Object.defineProperty(exports, '__esModule', { value: true });

})));

},{}],6:[function(require,module,exports){
(function (global, factory) {
  if (typeof define === "function" && define.amd) {
    define(['exports'], factory);
  } else if (typeof exports !== "undefined") {
    factory(exports);
  } else {
    var mod = {
      exports: {}
    };
    factory(mod.exports);
    global.astring = mod.exports;
  }
})(this, function (exports) {
  'use strict';

  exports.__esModule = true;
  exports.generate = generate;

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  var stringify = JSON.stringify;


  /* istanbul ignore if */
  if (!String.prototype.repeat) {
    /* istanbul ignore next */
    throw new Error('String.prototype.repeat is undefined, see https://github.com/davidbonnet/astring#installation');
  }

  /* istanbul ignore if */
  if (!String.prototype.endsWith) {
    /* istanbul ignore next */
    throw new Error('String.prototype.endsWith is undefined, see https://github.com/davidbonnet/astring#installation');
  }

  var OPERATOR_PRECEDENCE = {
    '||': 3,
    '&&': 4,
    '|': 5,
    '^': 6,
    '&': 7,
    '==': 8,
    '!=': 8,
    '===': 8,
    '!==': 8,
    '<': 9,
    '>': 9,
    '<=': 9,
    '>=': 9,
    in: 9,
    instanceof: 9,
    '<<': 10,
    '>>': 10,
    '>>>': 10,
    '+': 11,
    '-': 11,
    '*': 12,
    '%': 12,
    '/': 12,
    '**': 13

    // Enables parenthesis regardless of precedence
  };var NEEDS_PARENTHESES = 17;

  var EXPRESSIONS_PRECEDENCE = {
    // Definitions
    ArrayExpression: 20,
    TaggedTemplateExpression: 20,
    ThisExpression: 20,
    Identifier: 20,
    Literal: 18,
    TemplateLiteral: 20,
    Super: 20,
    SequenceExpression: 20,
    // Operations
    MemberExpression: 19,
    CallExpression: 19,
    NewExpression: 19,
    // Other definitions
    ArrowFunctionExpression: NEEDS_PARENTHESES,
    ClassExpression: NEEDS_PARENTHESES,
    FunctionExpression: NEEDS_PARENTHESES,
    ObjectExpression: NEEDS_PARENTHESES,
    // Other operations
    UpdateExpression: 16,
    UnaryExpression: 15,
    BinaryExpression: 14,
    LogicalExpression: 13,
    ConditionalExpression: 4,
    AssignmentExpression: 3,
    AwaitExpression: 2,
    YieldExpression: 2,
    RestElement: 1
  };

  function formatSequence(state, nodes) {
    var generator = state.generator;

    state.write('(');
    if (nodes != null && nodes.length > 0) {
      generator[nodes[0].type](nodes[0], state);
      var length = nodes.length;

      for (var i = 1; i < length; i++) {
        var param = nodes[i];
        state.write(', ');
        generator[param.type](param, state);
      }
    }
    state.write(')');
  }

  function expressionNeedsParenthesis(node, parentNode, isRightHand) {
    var nodePrecedence = EXPRESSIONS_PRECEDENCE[node.type];
    if (nodePrecedence === NEEDS_PARENTHESES) {
      return true;
    }
    var parentNodePrecedence = EXPRESSIONS_PRECEDENCE[parentNode.type];
    if (nodePrecedence !== parentNodePrecedence) {
      // Different node types
      return nodePrecedence < parentNodePrecedence;
    }
    if (nodePrecedence !== 13 && nodePrecedence !== 14) {
      // Not a `LogicalExpression` or `BinaryExpression`
      return false;
    }
    if (node.operator === '**' && parentNode.operator === '**') {
      // Exponentiation operator has right-to-left associativity
      return !isRightHand;
    }
    if (isRightHand) {
      // Parenthesis are used if both operators have the same precedence
      return OPERATOR_PRECEDENCE[node.operator] <= OPERATOR_PRECEDENCE[parentNode.operator];
    }
    return OPERATOR_PRECEDENCE[node.operator] < OPERATOR_PRECEDENCE[parentNode.operator];
  }

  function formatBinaryExpressionPart(state, node, parentNode, isRightHand) {
    var generator = state.generator;

    if (expressionNeedsParenthesis(node, parentNode, isRightHand)) {
      state.write('(');
      generator[node.type](node, state);
      state.write(')');
    } else {
      generator[node.type](node, state);
    }
  }

  function reindent(state, text, indent, lineEnd) {
    /*
    Writes into `state` the `text` string reindented with the provided `indent`.
    */
    var lines = text.split('\n');
    var end = lines.length - 1;
    state.write(lines[0].trim());
    if (end > 0) {
      state.write(lineEnd);
      for (var i = 1; i < end; i++) {
        state.write(indent + lines[i].trim() + lineEnd);
      }
      state.write(indent + lines[end].trim());
    }
  }

  function formatComments(state, comments, indent, lineEnd) {
    var length = comments.length;

    for (var i = 0; i < length; i++) {
      var comment = comments[i];
      state.write(indent);
      if (comment.type[0] === 'L') {
        // Line comment
        state.write('// ' + comment.value.trim() + '\n');
      } else {
        // Block comment
        state.write('/*');
        reindent(state, comment.value, indent, lineEnd);
        state.write('*/' + lineEnd);
      }
    }
  }

  function hasCallExpression(node) {
    /*
    Returns `true` if the provided `node` contains a call expression and `false` otherwise.
    */
    var currentNode = node;
    while (currentNode != null) {
      var _currentNode = currentNode,
          type = _currentNode.type;

      if (type[0] === 'C' && type[1] === 'a') {
        // Is CallExpression
        return true;
      } else if (type[0] === 'M' && type[1] === 'e' && type[2] === 'm') {
        // Is MemberExpression
        currentNode = currentNode.object;
      } else {
        return false;
      }
    }
  }

  function formatVariableDeclaration(state, node) {
    var generator = state.generator;
    var declarations = node.declarations;

    state.write(node.kind + ' ');
    var length = declarations.length;

    if (length > 0) {
      generator.VariableDeclarator(declarations[0], state);
      for (var i = 1; i < length; i++) {
        state.write(', ');
        generator.VariableDeclarator(declarations[i], state);
      }
    }
  }

  var ForInStatement = void 0,
      FunctionDeclaration = void 0,
      RestElement = void 0,
      BinaryExpression = void 0,
      ArrayExpression = void 0,
      BlockStatement = void 0;

  var baseGenerator = exports.baseGenerator = {
    Program: function Program(node, state) {
      var indent = state.indent.repeat(state.indentLevel);
      var lineEnd = state.lineEnd,
          writeComments = state.writeComments;

      if (writeComments && node.comments != null) {
        formatComments(state, node.comments, indent, lineEnd);
      }
      var statements = node.body;
      var length = statements.length;

      for (var i = 0; i < length; i++) {
        var statement = statements[i];
        if (writeComments && statement.comments != null) {
          formatComments(state, statement.comments, indent, lineEnd);
        }
        state.write(indent);
        this[statement.type](statement, state);
        state.write(lineEnd);
      }
      if (writeComments && node.trailingComments != null) {
        formatComments(state, node.trailingComments, indent, lineEnd);
      }
    },

    BlockStatement: BlockStatement = function BlockStatement(node, state) {
      var indent = state.indent.repeat(state.indentLevel++);
      var lineEnd = state.lineEnd,
          writeComments = state.writeComments;

      var statementIndent = indent + state.indent;
      state.write('{');
      var statements = node.body;
      if (statements != null && statements.length > 0) {
        state.write(lineEnd);
        if (writeComments && node.comments != null) {
          formatComments(state, node.comments, statementIndent, lineEnd);
        }
        var length = statements.length;

        for (var i = 0; i < length; i++) {
          var statement = statements[i];
          if (writeComments && statement.comments != null) {
            formatComments(state, statement.comments, statementIndent, lineEnd);
          }
          state.write(statementIndent);
          this[statement.type](statement, state);
          state.write(lineEnd);
        }
        state.write(indent);
      } else {
        if (writeComments && node.comments != null) {
          state.write(lineEnd);
          formatComments(state, node.comments, statementIndent, lineEnd);
          state.write(indent);
        }
      }
      if (writeComments && node.trailingComments != null) {
        formatComments(state, node.trailingComments, statementIndent, lineEnd);
      }
      state.write('}');
      state.indentLevel--;
    },
    ClassBody: BlockStatement,
    EmptyStatement: function EmptyStatement(node, state) {
      state.write(';');
    },
    ExpressionStatement: function ExpressionStatement(node, state) {
      var precedence = EXPRESSIONS_PRECEDENCE[node.expression.type];
      if (precedence === NEEDS_PARENTHESES || precedence === 3 && node.expression.left.type[0] === 'O') {
        // Should always have parentheses or is an AssignmentExpression to an ObjectPattern
        state.write('(');
        this[node.expression.type](node.expression, state);
        state.write(')');
      } else {
        this[node.expression.type](node.expression, state);
      }
      state.write(';');
    },
    IfStatement: function IfStatement(node, state) {
      state.write('if (');
      this[node.test.type](node.test, state);
      state.write(') ');
      this[node.consequent.type](node.consequent, state);
      if (node.alternate != null) {
        state.write(' else ');
        this[node.alternate.type](node.alternate, state);
      }
    },
    LabeledStatement: function LabeledStatement(node, state) {
      this[node.label.type](node.label, state);
      state.write(': ');
      this[node.body.type](node.body, state);
    },
    BreakStatement: function BreakStatement(node, state) {
      state.write('break');
      if (node.label != null) {
        state.write(' ');
        this[node.label.type](node.label, state);
      }
      state.write(';');
    },
    ContinueStatement: function ContinueStatement(node, state) {
      state.write('continue');
      if (node.label != null) {
        state.write(' ');
        this[node.label.type](node.label, state);
      }
      state.write(';');
    },
    WithStatement: function WithStatement(node, state) {
      state.write('with (');
      this[node.object.type](node.object, state);
      state.write(') ');
      this[node.body.type](node.body, state);
    },
    SwitchStatement: function SwitchStatement(node, state) {
      var indent = state.indent.repeat(state.indentLevel++);
      var lineEnd = state.lineEnd,
          writeComments = state.writeComments;

      state.indentLevel++;
      var caseIndent = indent + state.indent;
      var statementIndent = caseIndent + state.indent;
      state.write('switch (');
      this[node.discriminant.type](node.discriminant, state);
      state.write(') {' + lineEnd);
      var occurences = node.cases;
      var occurencesCount = occurences.length;

      for (var i = 0; i < occurencesCount; i++) {
        var occurence = occurences[i];
        if (writeComments && occurence.comments != null) {
          formatComments(state, occurence.comments, caseIndent, lineEnd);
        }
        if (occurence.test) {
          state.write(caseIndent + 'case ');
          this[occurence.test.type](occurence.test, state);
          state.write(':' + lineEnd);
        } else {
          state.write(caseIndent + 'default:' + lineEnd);
        }
        var consequent = occurence.consequent;
        var consequentCount = consequent.length;

        for (var _i = 0; _i < consequentCount; _i++) {
          var statement = consequent[_i];
          if (writeComments && statement.comments != null) {
            formatComments(state, statement.comments, statementIndent, lineEnd);
          }
          state.write(statementIndent);
          this[statement.type](statement, state);
          state.write(lineEnd);
        }
      }
      state.indentLevel -= 2;
      state.write(indent + '}');
    },
    ReturnStatement: function ReturnStatement(node, state) {
      state.write('return');
      if (node.argument) {
        state.write(' ');
        this[node.argument.type](node.argument, state);
      }
      state.write(';');
    },
    ThrowStatement: function ThrowStatement(node, state) {
      state.write('throw ');
      this[node.argument.type](node.argument, state);
      state.write(';');
    },
    TryStatement: function TryStatement(node, state) {
      state.write('try ');
      this[node.block.type](node.block, state);
      if (node.handler) {
        var handler = node.handler;

        state.write(' catch (');
        this[handler.param.type](handler.param, state);
        state.write(') ');
        this[handler.body.type](handler.body, state);
      }
      if (node.finalizer) {
        state.write(' finally ');
        this[node.finalizer.type](node.finalizer, state);
      }
    },
    WhileStatement: function WhileStatement(node, state) {
      state.write('while (');
      this[node.test.type](node.test, state);
      state.write(') ');
      this[node.body.type](node.body, state);
    },
    DoWhileStatement: function DoWhileStatement(node, state) {
      state.write('do ');
      this[node.body.type](node.body, state);
      state.write(' while (');
      this[node.test.type](node.test, state);
      state.write(');');
    },
    ForStatement: function ForStatement(node, state) {
      state.write('for (');
      if (node.init != null) {
        var init = node.init;

        if (init.type[0] === 'V') {
          formatVariableDeclaration(state, init);
        } else {
          this[init.type](init, state);
        }
      }
      state.write('; ');
      if (node.test) {
        this[node.test.type](node.test, state);
      }
      state.write('; ');
      if (node.update) {
        this[node.update.type](node.update, state);
      }
      state.write(') ');
      this[node.body.type](node.body, state);
    },

    ForInStatement: ForInStatement = function ForInStatement(node, state) {
      state.write('for (');
      var left = node.left;

      if (left.type[0] === 'V') {
        formatVariableDeclaration(state, left);
      } else {
        this[left.type](left, state);
      }
      // Identifying whether node.type is `ForInStatement` or `ForOfStatement`
      state.write(node.type[3] === 'I' ? ' in ' : ' of ');
      this[node.right.type](node.right, state);
      state.write(') ');
      this[node.body.type](node.body, state);
    },
    ForOfStatement: ForInStatement,
    DebuggerStatement: function DebuggerStatement(node, state) {
      state.write('debugger;' + state.lineEnd);
    },

    FunctionDeclaration: FunctionDeclaration = function FunctionDeclaration(node, state) {
      state.write((node.async ? 'async ' : '') + (node.generator ? 'function* ' : 'function ') + (node.id ? node.id.name : ''), node);
      formatSequence(state, node.params);
      state.write(' ');
      this[node.body.type](node.body, state);
    },
    FunctionExpression: FunctionDeclaration,
    VariableDeclaration: function VariableDeclaration(node, state) {
      formatVariableDeclaration(state, node);
      state.write(';');
    },
    VariableDeclarator: function VariableDeclarator(node, state) {
      this[node.id.type](node.id, state);
      if (node.init != null) {
        state.write(' = ');
        this[node.init.type](node.init, state);
      }
    },
    ClassDeclaration: function ClassDeclaration(node, state) {
      state.write('class ' + (node.id ? node.id.name + ' ' : ''), node);
      if (node.superClass) {
        state.write('extends ');
        this[node.superClass.type](node.superClass, state);
        state.write(' ');
      }
      this.ClassBody(node.body, state);
    },
    ImportDeclaration: function ImportDeclaration(node, state) {
      state.write('import ');
      var specifiers = node.specifiers;
      var length = specifiers.length;
      // NOTE: Once babili is fixed, put this after condition
      // https://github.com/babel/babili/issues/430

      var i = 0;
      if (length > 0) {
        for (; i < length;) {
          if (i > 0) {
            state.write(', ');
          }
          var specifier = specifiers[i];
          var type = specifier.type[6];
          if (type === 'D') {
            // ImportDefaultSpecifier
            state.write(specifier.local.name, specifier);
            i++;
          } else if (type === 'N') {
            // ImportNamespaceSpecifier
            state.write('* as ' + specifier.local.name, specifier);
            i++;
          } else {
            // ImportSpecifier
            break;
          }
        }
        if (i < length) {
          state.write('{');
          for (;;) {
            var _specifier = specifiers[i];
            var name = _specifier.imported.name;

            state.write(name, _specifier);
            if (name !== _specifier.local.name) {
              state.write(' as ' + _specifier.local.name);
            }
            if (++i < length) {
              state.write(', ');
            } else {
              break;
            }
          }
          state.write('}');
        }
        state.write(' from ');
      }
      this.Literal(node.source, state);
      state.write(';');
    },
    ExportDefaultDeclaration: function ExportDefaultDeclaration(node, state) {
      state.write('export default ');
      this[node.declaration.type](node.declaration, state);
      if (EXPRESSIONS_PRECEDENCE[node.declaration.type] && node.declaration.type[0] !== 'F') {
        // All expression nodes except `FunctionExpression`
        state.write(';');
      }
    },
    ExportNamedDeclaration: function ExportNamedDeclaration(node, state) {
      state.write('export ');
      if (node.declaration) {
        this[node.declaration.type](node.declaration, state);
      } else {
        state.write('{');
        var specifiers = node.specifiers,
            length = specifiers.length;

        if (length > 0) {
          for (var i = 0;;) {
            var specifier = specifiers[i];
            var name = specifier.local.name;

            state.write(name, specifier);
            if (name !== specifier.exported.name) {
              state.write(' as ' + specifier.exported.name);
            }
            if (++i < length) {
              state.write(', ');
            } else {
              break;
            }
          }
        }
        state.write('}');
        if (node.source) {
          state.write(' from ');
          this.Literal(node.source, state);
        }
        state.write(';');
      }
    },
    ExportAllDeclaration: function ExportAllDeclaration(node, state) {
      state.write('export * from ');
      this.Literal(node.source, state);
      state.write(';');
    },
    MethodDefinition: function MethodDefinition(node, state) {
      if (node.static) {
        state.write('static ');
      }
      var kind = node.kind[0];
      if (kind === 'g' || kind === 's') {
        // Getter or setter
        state.write(node.kind + ' ');
      }
      if (node.value.async) {
        state.write('async ');
      }
      if (node.value.generator) {
        state.write('*');
      }
      if (node.computed) {
        state.write('[');
        this[node.key.type](node.key, state);
        state.write(']');
      } else {
        this[node.key.type](node.key, state);
      }
      formatSequence(state, node.value.params);
      state.write(' ');
      this[node.value.body.type](node.value.body, state);
    },
    ClassExpression: function ClassExpression(node, state) {
      this.ClassDeclaration(node, state);
    },
    ArrowFunctionExpression: function ArrowFunctionExpression(node, state) {
      state.write(node.async ? 'async ' : '', node);
      var params = node.params;

      if (params != null) {
        // Omit parenthesis if only one named parameter
        if (params.length === 1 && params[0].type[0] === 'I') {
          // If params[0].type[0] starts with 'I', it can't be `ImportDeclaration` nor `IfStatement` and thus is `Identifier`
          state.write(params[0].name, params[0]);
        } else {
          formatSequence(state, node.params);
        }
      }
      state.write(' => ');
      if (node.body.type[0] === 'O') {
        // Body is an object expression
        state.write('(');
        this.ObjectExpression(node.body, state);
        state.write(')');
      } else {
        this[node.body.type](node.body, state);
      }
    },
    ThisExpression: function ThisExpression(node, state) {
      state.write('this', node);
    },
    Super: function Super(node, state) {
      state.write('super', node);
    },

    RestElement: RestElement = function RestElement(node, state) {
      state.write('...');
      this[node.argument.type](node.argument, state);
    },
    SpreadElement: RestElement,
    YieldExpression: function YieldExpression(node, state) {
      state.write(node.delegate ? 'yield*' : 'yield');
      if (node.argument) {
        state.write(' ');
        this[node.argument.type](node.argument, state);
      }
    },
    AwaitExpression: function AwaitExpression(node, state) {
      state.write('await ');
      if (node.argument) {
        this[node.argument.type](node.argument, state);
      }
    },
    TemplateLiteral: function TemplateLiteral(node, state) {
      var quasis = node.quasis,
          expressions = node.expressions;

      state.write('`');
      var length = expressions.length;

      for (var i = 0; i < length; i++) {
        var expression = expressions[i];
        state.write(quasis[i].value.raw);
        state.write('${');
        this[expression.type](expression, state);
        state.write('}');
      }
      state.write(quasis[quasis.length - 1].value.raw);
      state.write('`');
    },
    TaggedTemplateExpression: function TaggedTemplateExpression(node, state) {
      this[node.tag.type](node.tag, state);
      this[node.quasi.type](node.quasi, state);
    },

    ArrayExpression: ArrayExpression = function ArrayExpression(node, state) {
      state.write('[');
      if (node.elements.length > 0) {
        var elements = node.elements,
            length = elements.length;

        for (var i = 0;;) {
          var element = elements[i];
          if (element != null) {
            this[element.type](element, state);
          }
          if (++i < length) {
            state.write(', ');
          } else {
            if (element == null) {
              state.write(', ');
            }
            break;
          }
        }
      }
      state.write(']');
    },
    ArrayPattern: ArrayExpression,
    ObjectExpression: function ObjectExpression(node, state) {
      var indent = state.indent.repeat(state.indentLevel++);
      var lineEnd = state.lineEnd,
          writeComments = state.writeComments;

      var propertyIndent = indent + state.indent;
      state.write('{');
      if (node.properties.length > 0) {
        state.write(lineEnd);
        if (writeComments && node.comments != null) {
          formatComments(state, node.comments, propertyIndent, lineEnd);
        }
        var comma = ',' + lineEnd;
        var properties = node.properties,
            length = properties.length;

        for (var i = 0;;) {
          var property = properties[i];
          if (writeComments && property.comments != null) {
            formatComments(state, property.comments, propertyIndent, lineEnd);
          }
          state.write(propertyIndent);
          this.Property(property, state);
          if (++i < length) {
            state.write(comma);
          } else {
            break;
          }
        }
        state.write(lineEnd);
        if (writeComments && node.trailingComments != null) {
          formatComments(state, node.trailingComments, propertyIndent, lineEnd);
        }
        state.write(indent + '}');
      } else if (writeComments) {
        if (node.comments != null) {
          state.write(lineEnd);
          formatComments(state, node.comments, propertyIndent, lineEnd);
          if (node.trailingComments != null) {
            formatComments(state, node.trailingComments, propertyIndent, lineEnd);
          }
          state.write(indent + '}');
        } else if (node.trailingComments != null) {
          state.write(lineEnd);
          formatComments(state, node.trailingComments, propertyIndent, lineEnd);
          state.write(indent + '}');
        } else {
          state.write('}');
        }
      } else {
        state.write('}');
      }
      state.indentLevel--;
    },
    Property: function Property(node, state) {
      if (node.method || node.kind[0] !== 'i') {
        // Either a method or of kind `set` or `get` (not `init`)
        this.MethodDefinition(node, state);
      } else {
        if (!node.shorthand) {
          if (node.computed) {
            state.write('[');
            this[node.key.type](node.key, state);
            state.write(']');
          } else {
            this[node.key.type](node.key, state);
          }
          state.write(': ');
        }
        this[node.value.type](node.value, state);
      }
    },
    ObjectPattern: function ObjectPattern(node, state) {
      state.write('{');
      if (node.properties.length > 0) {
        var properties = node.properties,
            length = properties.length;

        for (var i = 0;;) {
          this[properties[i].type](properties[i], state);
          if (++i < length) {
            state.write(', ');
          } else {
            break;
          }
        }
      }
      state.write('}');
    },
    SequenceExpression: function SequenceExpression(node, state) {
      formatSequence(state, node.expressions);
    },
    UnaryExpression: function UnaryExpression(node, state) {
      if (node.prefix) {
        state.write(node.operator);
        if (node.operator.length > 1) {
          state.write(' ');
        }
        if (EXPRESSIONS_PRECEDENCE[node.argument.type] < EXPRESSIONS_PRECEDENCE.UnaryExpression) {
          state.write('(');
          this[node.argument.type](node.argument, state);
          state.write(')');
        } else {
          this[node.argument.type](node.argument, state);
        }
      } else {
        // FIXME: This case never occurs
        this[node.argument.type](node.argument, state);
        state.write(node.operator);
      }
    },
    UpdateExpression: function UpdateExpression(node, state) {
      // Always applied to identifiers or members, no parenthesis check needed
      if (node.prefix) {
        state.write(node.operator);
        this[node.argument.type](node.argument, state);
      } else {
        this[node.argument.type](node.argument, state);
        state.write(node.operator);
      }
    },
    AssignmentExpression: function AssignmentExpression(node, state) {
      this[node.left.type](node.left, state);
      state.write(' ' + node.operator + ' ');
      this[node.right.type](node.right, state);
    },
    AssignmentPattern: function AssignmentPattern(node, state) {
      this[node.left.type](node.left, state);
      state.write(' = ');
      this[node.right.type](node.right, state);
    },

    BinaryExpression: BinaryExpression = function BinaryExpression(node, state) {
      if (node.operator === 'in') {
        // Avoids confusion in `for` loops initializers
        state.write('(');
        formatBinaryExpressionPart(state, node.left, node, false);
        state.write(' ' + node.operator + ' ');
        formatBinaryExpressionPart(state, node.right, node, true);
        state.write(')');
      } else {
        formatBinaryExpressionPart(state, node.left, node, false);
        state.write(' ' + node.operator + ' ');
        formatBinaryExpressionPart(state, node.right, node, true);
      }
    },
    LogicalExpression: BinaryExpression,
    ConditionalExpression: function ConditionalExpression(node, state) {
      if (EXPRESSIONS_PRECEDENCE[node.test.type] > EXPRESSIONS_PRECEDENCE.ConditionalExpression) {
        this[node.test.type](node.test, state);
      } else {
        state.write('(');
        this[node.test.type](node.test, state);
        state.write(')');
      }
      state.write(' ? ');
      this[node.consequent.type](node.consequent, state);
      state.write(' : ');
      this[node.alternate.type](node.alternate, state);
    },
    NewExpression: function NewExpression(node, state) {
      state.write('new ');
      if (EXPRESSIONS_PRECEDENCE[node.callee.type] < EXPRESSIONS_PRECEDENCE.CallExpression || hasCallExpression(node.callee)) {
        state.write('(');
        this[node.callee.type](node.callee, state);
        state.write(')');
      } else {
        this[node.callee.type](node.callee, state);
      }
      formatSequence(state, node['arguments']);
    },
    CallExpression: function CallExpression(node, state) {
      if (EXPRESSIONS_PRECEDENCE[node.callee.type] < EXPRESSIONS_PRECEDENCE.CallExpression) {
        state.write('(');
        this[node.callee.type](node.callee, state);
        state.write(')');
      } else {
        this[node.callee.type](node.callee, state);
      }
      formatSequence(state, node['arguments']);
    },
    MemberExpression: function MemberExpression(node, state) {
      if (EXPRESSIONS_PRECEDENCE[node.object.type] < EXPRESSIONS_PRECEDENCE.MemberExpression) {
        state.write('(');
        this[node.object.type](node.object, state);
        state.write(')');
      } else {
        this[node.object.type](node.object, state);
      }
      if (node.computed) {
        state.write('[');
        this[node.property.type](node.property, state);
        state.write(']');
      } else {
        state.write('.');
        this[node.property.type](node.property, state);
      }
    },
    MetaProperty: function MetaProperty(node, state) {
      state.write(node.meta.name + '.' + node.property.name, node);
    },
    Identifier: function Identifier(node, state) {
      state.write(node.name, node);
    },
    Literal: function Literal(node, state) {
      if (node.raw != null) {
        state.write(node.raw, node);
      } else if (node.regex != null) {
        this.RegExpLiteral(node, state);
      } else {
        state.write(stringify(node.value), node);
      }
    },
    RegExpLiteral: function RegExpLiteral(node, state) {
      var regex = node.regex;

      state.write('/' + regex.pattern + '/' + regex.flags, node);
    }
  };

  var EMPTY_OBJECT = {};

  var State = function () {
    function State(options) {
      _classCallCheck(this, State);

      var setup = options == null ? EMPTY_OBJECT : options;
      this.output = '';
      // Functional options
      if (setup.output != null) {
        this.output = setup.output;
        this.write = this.writeToStream;
      } else {
        this.output = '';
      }
      this.generator = setup.generator != null ? setup.generator : baseGenerator;
      // Formating setup
      this.indent = setup.indent != null ? setup.indent : '  ';
      this.lineEnd = setup.lineEnd != null ? setup.lineEnd : '\n';
      this.indentLevel = setup.startingIndentLevel != null ? setup.startingIndentLevel : 0;
      this.writeComments = setup.comments ? setup.comments : false;
      // Source map
      if (setup.sourceMap != null) {
        this.write = setup.output == null ? this.writeAndMap : this.writeToStreamAndMap;
        this.sourceMap = setup.sourceMap;
        this.line = 1;
        this.column = 0;
        this.lineEndSize = this.lineEnd.split('\n').length - 1;
        this.mapping = {
          original: null,
          generated: this,
          name: undefined,
          source: setup.sourceMap.file || setup.sourceMap._file
        };
      }
    }

    State.prototype.write = function write(code) {
      this.output += code;
    };

    State.prototype.writeToStream = function writeToStream(code) {
      this.output.write(code);
    };

    State.prototype.writeAndMap = function writeAndMap(code, node) {
      this.output += code;
      this.map(code, node);
    };

    State.prototype.writeToStreamAndMap = function writeToStreamAndMap(code, node) {
      this.output.write(code);
      this.map(code, node);
    };

    State.prototype.map = function map(code, node) {
      if (node != null && node.loc != null) {
        var mapping = this.mapping;

        mapping.original = node.loc.start;
        mapping.name = node.name;
        this.sourceMap.addMapping(mapping);
      }
      if (code.length > 0) {
        if (this.lineEndSize > 0) {
          if (code.endsWith(this.lineEnd)) {
            this.line += this.lineEndSize;
            this.column = 0;
          } else if (code[code.length - 1] === '\n') {
            // Case of inline comment
            this.line++;
            this.column = 0;
          } else {
            this.column += code.length;
          }
        } else {
          if (code[code.length - 1] === '\n') {
            // Case of inline comment
            this.line++;
            this.column = 0;
          } else {
            this.column += code.length;
          }
        }
      }
    };

    State.prototype.toString = function toString() {
      return this.output;
    };

    return State;
  }();

  function generate(node, options) {
    /*
    Returns a string representing the rendered code of the provided AST `node`.
    The `options` are:
     - `indent`: string to use for indentation (defaults to `␣␣`)
    - `lineEnd`: string to use for line endings (defaults to `\n`)
    - `startingIndentLevel`: indent level to start from (defaults to `0`)
    - `comments`: generate comments if `true` (defaults to `false`)
    - `output`: output stream to write the rendered code to (defaults to `null`)
    - `generator`: custom code generator (defaults to `baseGenerator`)
    */
    var state = new State(options);
    // Travel through the AST node and generate the code
    state.generator[node.type](node, state);
    return state.output;
  }
});


},{}],7:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],8:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],9:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],10:[function(require,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./support/isBuffer":9,"_process":7,"inherits":8}],11:[function(require,module,exports){

exports.join = function (array, separator) {
  if (array.length === 0)
    return "";
  var last = array.length-1;
  var index = 0;
  var result = "";
  while (index < last) {
    result += array[index++] + separator; 
  }
  return result + array[last];
};

exports.flaten = function (array1) {
  var result = [];
  var length = 0
  var index1 = 0;
  var length1 = array1.length;
  while (index1 < length1) {
    var array2 = array1[index1++];
    var index2 = 0;
    var length2 = array2.length;
    while (index2 < length2) {
      result[length++] = array2[index2++];
    }
  }
  return result;
};

exports.concat = function () {
  var result = [];
  var index1 = 0;
  var length1 = arguments.length;
  while (index1 < length1) {
    var array2 = arguments[index1++];
    var index2 = 0;
    var length2 = array2.length;
    while (index2 < length2) {
      result[result.length] = array2[index2++];
    }
  }
  return result;
};

exports.some = function (array, predicate) {
  var index = 0;
  var length = array.length;
  while (index < length) {
    if (predicate(array[index], index++, array)) {
      return true
    }
  }
  return false;
};

exports.every = function (array, predicate) {
  var index = 0;
  var length = array.length;
  while (index < length) {
    if (!predicate(array[index], index++, array)) {
      return false;
    }
  }
  return true;
};

exports.includes = function (array, element) {
  var index = 0;
  var length = array.length;
  while (index<length) {
    if (array[index++] === element) {
      return true
    }
  }
  return false;
};

exports.reverse = function (array) {
  var index = array.length-1;
  var result = [];
  var length = 0;
  while (index >= 0) {
    result[length++] = array[index--];
  }
  return result;
};

exports.map = function (array, transform) {
  var result = [];
  var index = 0;
  var length = array.length;
  while (index < length) {
    result[index] = transform(array[index], index++, array);
  }
  return result;
};

exports.flatenMap = function (array1, transform) {
  var result = [];
  var length = 0;
  var index1 = 0;
  var length1 = array1.length;
  while (index1 < length1) {
    var array2 = transform(array1[index1], index1++, array1);
    var index2 = 0;
    var length2 = array2.length;
    while (index2 < length2) {
      result[length++] = array2[index2++];
    }
  }
  return result;
}

exports.zipMap = function (array, transformers) {
  var result = [];
  var index = 0;
  var length = array.length;
  while (index < length) {
    var transform = transformers[index];
    result[index] = transform ? transform(array[index], index++, array) : array[index++];
  }
  return result;
};

exports.filter = function (array, predicate) {
  var result = [];
  var index = 0;
  var length = array.length;
  while (index < length) {
    if (predicate(array[index], index, array)) {
      result[result.length] = array[index++];
    } else {
      index++;
    }
  }
  return result;
};

exports.forEach = function (array, procedure) {
  var index = 0;
  var length = array.length;
  while (index < length) {
    procedure(array[index], index++, array);
  }
};

exports.reduce = function (array, accumulator, result) {
  var index = 0;
  var length = array.length;
  while (index < length) {
    result = accumulator(result, array[index], index++, array);
  }
  return result;
};

exports.indexOf = function (array, value) {
  var index = 0;
  var length = array.length;
  while (index < length) {
    if (array[index] === value) {
      return index;
    }
    index++;
  }
  return -1;
};

exports.find = function (array, predicate) {
  var index = 0;
  var length = array.length;
  while (index < length) {
    if (predicate(array[index], index, array)) {
      return array[index];
    }
    index++;
  }
};

exports.findIndex = function (array, predicate) {
  var index = 0;
  var length = array.length;
  while (index < length) {
    if (predicate(array[index], index, array)) {
      return index;
    }
    index++
  }
  return -1;
}

exports.lastIndexOf = function (array, value) {
  var index = array.length-1;
  while (index >= 0) {
    if (array[index] === value) {
      return index;
    }
    index--;
  }
  return -1;
};

exports.slice = function (array, index, length) {
  var result = [];
  if (!index) {
    index = 0;
  }
  if (!length || length > array.length) {
    length = array.length
  }
  while (index < length) {
    result[result.length] = array[index++];
  }
  return result;
};

},{}],12:[function(require,module,exports){

/////////////
// Program //
/////////////

exports.PROGRAM = ["boolean", ["statement"]];

////////////////
// Expression //
////////////////

exports.read = ["identifier"];
exports.write = ["identifier", "expression"];
exports.array = [["expression"]];
exports.object = [[{0:"expression",1:"expression"}]];
exports.closure = ["boolean", ["statement"]];
exports.primitive = ["primitive"];
exports.regexp = ["string", "string"];
exports.get = ["expression", "expression"];
exports.set = ["expression", "expression", "expression"];
exports.conditional = ["expression", "expression", "expression"];
exports.binary = ["binary", "expression", "expression"];
exports.unary = ["unary", "expression"];
exports.delete = ["expression", "expression"];
exports.discard = ["identifier"];
exports.construct = ["expression", ["expression"]];
exports.apply = ["expression", ["expression"]];
exports.invoke = ["expression", "expression", ["expression"]];
exports.sequence = [["expression"]];
exports.eval = ["expression"];

///////////////
// Statement //
///////////////

exports.Block = [["statement"]];
exports.Statement = ["expression"];
exports.Return = ["expression"];
exports.Throw = ["expression"];
exports.Try = [["statement"], ["statement"], ["statement"]];
exports.Declare = ["kind", "identifier", "expression"];
exports.If = ["expression", ["statement"], ["statement"]];
exports.Label = ["label", ["statement"]];
exports.Break = ["label"];
exports.While = ["expression", ["statement"]];
exports.Debugger = [];
exports.Switch = [[{0:"expression", 1:["statement"]}]];
exports.With = ["expression", ["statement"]];

},{}],13:[function(require,module,exports){

const Util = require("util");
const ArrayLite = require("array-lite");

const etypes = [
  "MetaProperty",
  "ThisExpression",
  "Identifier",
  "AssignmentExpression",
  "ArrayExpression",
  "ObjectExpression",
  "FunctionExpression",
  "UnaryExpression",
  "Literal",
  "MemberExpression",
  "ConditionalExpression",
  "BinaryExpression",
  "UnaryExpression",
  "NewExpression",
  "CallExpression",
  "SequenceExpression"
];

const stypes = [
  "BlockStatement",
  "ExpressionStatement",
  "ReturnStatement",
  "ThrowStatement",
  "TryStatement",
  "VariableDeclaration",
  "IfStatement",
  "LabeledStatement",
  "BreakStatement",
  "WhileStatement",
  "DebuggerStatement",
  "SwitchStatement",
  "WithStatement"
];

const kinds = ["var", "let", "const"];

const unaries = [
  "-",
  "+",
  "!",
  "~",
  "typeof",
  "void"
];

const binaries = [
  "==",
  "!=",
  "===",
  "!==",
  "<",
  "<=",
  ">",
  ">=",
  "<<",
  ">>",
  ">>>",
  "+",
  "-",
  "*",
  "/",
  "%",
  "|",
  "^",
  "&",
  "in",
  "instanceof",
  ".."
];

exports.identifier = (value) => {
  if (typeof value !== "string")
    throw new Error("[identifier] is not a string: "+Util.inspect(value));
  if (!/^[$_a-zA-Z][$_a-zA-Z0-9]*$/.test(value) && value !== "new.target")
    throw new Error("[identifier] invalid: "+Util.inspect(value))
};

exports.label = (value) => {
  if (typeof value !== "string")
    throw new Error("[label] is not a string: "+Util.inspect(value));
  if (!/^[$_a-zA-Z][$_a-zA-Z0-9]*$/.test(value))
    throw new Error("[label] invalid: "+Util.inspect(value))
};

exports.expression = (value) => {
  if (typeof value !== "object" || value === null)
    throw new Error("[expression] not an object: "+Util.inspect(value));
  if (!ArrayLite.includes(etypes, value.type))
    throw new Error("[expression] unknwon type: "+Util.inspect(value));
};

exports.statement = (value) => {
  if (typeof value !== "object" || value === null)
    throw new Error("[statement] not an object: "+Util.inspect(value));
  if (!ArrayLite.includes(stypes, value.type))
    throw new Error("[statement] unknown type: "+Util.inspect(value));
};

exports.primitive = (value) => {
  if (value && value !== true && typeof value !== "number" && typeof value !== "string")
    throw new Error("[primitive] type error: "+Util.inspect(value));
};

exports.null = (value) => {
  if (value !== null)
    throw new Error("[null] not null: "+Utio.inspect(value))
};

exports.boolean = (value) => {
  if (typeof value !== "boolean")
    throw new Error("[boolean] type error: "+Util.inspect(value));
};

exports.string = (value) => {
  if (typeof value !== "string")
    throw new Error("[string] type error: "+Util.inspect(value));
}

exports.unary = (value) => {
  if (!ArrayLite.includes(unaries, value))
    throw new Error("[unary] unknown: "+Util.inspect(value));
};

exports.binary = (value) => {
  if (!ArrayLite.includes(binaries, value))
    throw new Error("[binary] unknown: "+Util.inspect(value));
};

exports.kind = (kind) => {
  if (!ArrayLite.includes(kinds, kind))
    throw new Error("[kind] unknown: "+Util.inspect(kind));
};

},{"array-lite":11,"util":10}],14:[function(require,module,exports){

const Util = require("util");
const ArrayLite = require("array-lite");
const Estree = require("../estree.js");
const Check = require("./check.js");
const ArgumentsType = require("./arguments-type.js");
const isArray = Array.isArray;
const keys = Object.keys;
const apply = Reflect.apply;

ArrayLite.forEach(keys(Estree), (key) => {
  exports[key] = function () {
    if (arguments.length !== ArgumentsType[key].length)
      throw new Error("Arguments number mismatch, ["+key+"] expected "+ArgumentsType[key].length+", got: "+Util.inspect(arguments));
    for (var index = 0; index<ArgumentsType[key].length; index++)
      duck(ArgumentsType[key][index], arguments[index]);
    return apply(Estree[key], null, arguments);
  };
});

const duck = (type, value) => {
  if (isArray(type) && type.length === 1) {
    if (typeof value !== "object" || value === null || typeof value.length !== "number")
      throw new Error("Not an array: "+Util.inspect(value));
    ArrayLite.forEach(
      value,
      (value) => duck(type[0], value));
  } else if (typeof type === "object" && type !== null) {
    if (typeof value !== "object" || value === null)
      throw new Error("Not an object: "+Util.inspect(value));
    for (var key in type)
      duck(type[key], value[key]);
  } else if (typeof type === "string") {
    Check[type](value);
  } else {
    throw new Error("Unknown type: "+Util.inspect(type));
  }
};

},{"../estree.js":15,"./arguments-type.js":12,"./check.js":13,"array-lite":11,"util":10}],15:[function(require,module,exports){

const ArrayLite = require("array-lite");

/////////////
// Program //
/////////////

exports.PROGRAM = (strict, statements) => ({
  type: "Program",
  body: ArrayLite.concat(
    (
      strict ?
      [
        {
          type: "ExpressionStatement",
          expression: {
            type: "Literal",
            value: "use strict"}}] :
      []),
    statements)});

////////////////
// Expression //
////////////////

exports.read = (identifier) => (
  identifier === "this" ?
  {
    type: "ThisExpression"} :
  (
    identifier === "new.target" ?
    {
      type: "MetaProperty",
      meta: {
        type: "Identifier",
        name: "new"},
      property: {
        type: "Identifier",
        name: "target"}} :
    {
      type: "Identifier",
      name: identifier}));

exports.write = (identifier, expression) => ({
  type: "AssignmentExpression",
  operator: "=",
  left: {
    type: "Identifier",
    name: identifier},
  right: expression});

exports.array = (expressions) => ({
  type: "ArrayExpression",
  elements: expressions});

exports.object = (properties) => ({
  type: "ObjectExpression",
  properties: properties.map((property) => ({
    type: "Property",
    computed: true,
    shorthand: false,
    method: false,
    kind: "init",
    key: property[0],
    value: property[1]
  }))});

exports.closure = (strict, statements) => ({
  type: "FunctionExpression",
  generator: false,
  async: false,
  expression: false,
  id: null,
  params: [],
  defaults: [],
  rest: null,
  body: {
    type: "BlockStatement",
    body: ArrayLite.concat(
      (
        strict ?
        [
          {
            type: "ExpressionStatement",
            expression: {
              type: "Literal",
              value: "use strict"}}] :
        []),
      statements)}});

exports.primitive = (primitive) => (
  primitive === void 0 ?
  {
    type: "UnaryExpression",
    operator: "void",
    prefix: true,
    argument: {
      type: "Literal",
      value: 0}} :
  {
    type: "Literal",
    value: primitive});

exports.regexp = (string1, string2) => ({
  type: "Literal",
  regex: {
    pattern: string1,
    flags: string2}});

exports.get = (expression1, expression2) => ({
  type: "MemberExpression",
  computed: true,
  object: expression1,
  property: expression2});

exports.set = (expression1, expression2, expression3) => ({
  type: "AssignmentExpression",
  operator: "=",
  left: {
    type: "MemberExpression",
    computed: true,
    object: expression1,
    property: expression2},
  right: expression3});

exports.conditional = (expression1, expression2, expression3) => ({
  type: "ConditionalExpression",
  test: expression1,
  consequent: expression2,
  alternate: expression3});

exports.binary = (operator, expression1, expression2) => ({
  type: "BinaryExpression",
  operator: operator,
  left: expression1,
  right: expression2});

exports.unary = (operator, expression) => ({
  type: "UnaryExpression",
  prefix: true,
  operator: operator,
  argument: expression});

exports.delete = (expression1, expression2) => {
  throw new Error("kaka");
  return ({
  type: "UnaryExpression",
  prefix: true,
  operator: "delete",
  argument: {
    type: "MemberExpression",
    computed: true,
    object: expression1,
    property: expression2}});
}

exports.discard = (identifier) => ({
  type: "UnaryExpression",
  prefix: true,
  operator: "delete",
  argument: {
    type: "Identifier",
    name: identifier}});

exports.construct = (expression, expressions) => ({
  type: "NewExpression",
  callee: expression,
  arguments: expressions});

exports.apply = (expression, expressions) => ({
  type: "CallExpression",
  callee: expression,
  arguments: expressions});

exports.invoke = (expression1, expression2, expressions) => ({
  type: "CallExpression",
  callee: {
    type: "MemberExpression",
    computed: true,
    object: expression1,
    property: expression2},
  arguments: expressions});

exports.sequence = (expressions) => (
  expressions.length === 0 ?
  {
    type: "UnaryExpression",
    operator: "void",
    argument: {
      type: "Literal",
      value: 0}} :
  (  
    expressions.length === 1 ?
    expressions[0] :
    ({
      type: "SequenceExpression",
      expressions: expressions})));

exports.eval = (expression) => ({
  type: "CallExpression",
  callee: {
    type: "Identifier",
    name: "eval" },
  arguments: [
    expression]})

///////////////
// Statement //
///////////////

exports.Block = (statements) => [
  {
    type: "BlockStatement",
    body: statements}];

exports.Statement = (expression) => [
  {
    type: "ExpressionStatement",
    expression: expression}];

exports.Return = (expression) => [
  {
    type: "ReturnStatement",
    argument: expression}];

exports.Throw = (expression) => [
  {
    type: "ThrowStatement",
    argument: expression}];

exports.Try = (statements1, statements2, statements3) => [
  {
    type: "TryStatement",
    block: {
      type: "BlockStatement",
      body: statements1},
    handler: {
      type: "CatchClause",
      param: {
        type: "Identifier",
        name: "error"},
      body: {
        type: "BlockStatement",
        body: statements2}},
    finalizer: {
      type: "BlockStatement",
      body: statements3}}];

exports.Declare = (kind, identifier, expression) => [
  {
    type: "VariableDeclaration",
    kind: kind,
    declarations: [
      {
        type: "VariableDeclarator",
        id: {
          type: "Identifier",
          name: identifier},
        init: expression}]}];

exports.If = (expression, statements1, statements2) => [
  {
    type: "IfStatement",
    test: expression,
    consequent: {
      type: "BlockStatement",
      body: statements1},
    alternate: {
      type: "BlockStatement",
      body: statements2}}];

exports.Label = (label, statements) => [
  {
    type: "LabeledStatement",
    label: {
      type: "Identifier",
      name: label},
    body: {
      type: "BlockStatement",
      body: statements}}];

exports.Break = (label) => [
  {
    type:"BreakStatement",
    label: {
      type: "Identifier",
      name: label}}];

exports.While = (expression, statements) => [
  {
    type: "WhileStatement",
    test: expression,
    body: {
      type: "BlockStatement",
      body: statements}}];

exports.Debugger = () => [
  {
    type: "DebuggerStatement"}];

exports.Switch = (clauses) => [
  {
    type: "SwitchStatement",
    discriminant: {
      type: "Literal",
      value: true
    },
    cases: clauses.map((clause) => ({
      type: "SwitchCase",
      test: clause[0],
      consequent: clause[1]}))}];

exports.With = (expression, statements) => [
  {
    type: "WithStatement",
    object: expression,
    body: {
      type: "BlockStatement",
      body: statements}}];

},{"array-lite":11}],16:[function(require,module,exports){

// Optimizations:
//   - object["key"]                         -> object.key
//   - (identifier, expression)              -> expression
//   - { statement1 identifier; statement2 } -> { statement1 statement2 }
//   - try { statements } finally {}         -> statements

exports.String = require("./string.js");
exports.Estree = require("./estree.js");
exports.EstreeValid = require("./estree-valid");

},{"./estree-valid":14,"./estree.js":15,"./string.js":17}],17:[function(require,module,exports){

const ArrayLite = require("array-lite");
const stringify = JSON.stringify;

/////////////
// Program //
/////////////

exports.PROGRAM = (strict, statements) => (
  (strict ? "\"use strict\";" : "") + 
  ArrayLite.join(statements, "")) +
  ";";

////////////////
// Expression //
////////////////

exports.read = (identifier) => identifier;

exports.write = (identifier, expression) => (
  "(" +
  identifier +
  "=" +
  expression +
  ")");

exports.array = (expressions) => (
  "[" +
  ArrayLite.join(expressions, ",") +
  "]");

exports.object = (properties) => (
  "{" +
  ArrayLite.join(
    ArrayLite.map(
      properties,
      (property) => property[0] + ":" + property[1]),
    ",") +
  "}");

exports.closure = (strict, statements) => (
  "function(){" +
  (strict ? "\"use-strict\";" : "") +
  ArrayLite.join(statements, "") +
  "}");

exports.primitive = (primitive) => (
  primitive === void 0 ?
  "(void 0)" :
  stringify(primitive));

exports.regexp = (string1, string2) => (
  "/" +
  string1 +
  "/" +
  string2);

exports.get = (expression1, expression2) => (
  expression1 +
  "[" +
  expression2 +
  "]");

exports.set = (expression1, expression2, expression3) => (
  "(" +
  expression1 +
  "[" +
  expression2 +
  "]=" +
  expression3 +
  ")");

exports.conditional = (expression1, expression2, expression3) => (
  "(" +
  expression1 +
  "?" +
  expression2 +
  ":" +
  expression3 +
  ")");

exports.binary = (operator, expression1, expression2) => (
  "(" +
  expression1 +
  " " +
  operator +
  " " +
  expression2 +
  ")");

exports.unary = (operator, expression) => (
  "(" +
  operator +
  " " +
  expression +
  ")");

exports.delete = (expression1, expression2) => (
  "(delete "+
  expression1 +
  "[" +
  expression2 +
  "])");

exports.discard = (identifier) => (
  "(delete " +
  identifier +
  ")");

exports.construct = (expression, expressions) => (
  "(new " +
  expression +
  "(" +
  ArrayLite.join(expressions, ",") +
  "))");

exports.apply = (expression, expressions) => (
  "(" +
  expression +
  "(" +
  ArrayLite.join(expressions, ",") +
  "))");

exports.invoke = (expression1, expression2, expressions) => (
  "(" +
  expression1 +
  "[" +
  expression2 +
  "](" +
  ArrayLite.join(expressions, ",") +
  "))");

exports.sequence = (expressions) => (
  expressions.length === 0 ?
  "(void 0)" :
  (
    expressions.length === 1 ?
    expressions[0] :
    (
      "(" +
      ArrayLite.join(expressions, ",") +
      ")")));

exports.eval = (expression) => (
  "eval(" +
  expression +
  ")");

///////////////
// Statement //
///////////////

exports.Block = (statements) => [
  (
    "{" +
    ArrayLite.join(statements, "") +
    "}")];

exports.Statement = (expression) => [
  (
    expression +
    ";")];

exports.Return = (expression) => [
  (
    "return " +
    expression +
    ";")];

exports.Throw = (expression) => [
  (
    "throw " +
    expression +
    ";")];

exports.Try = (statements1, statements2, statements3) => [
  (
    "try{" +
    ArrayLite.join(statements1, "") +
    "}catch(error){" +
    ArrayLite.join(statements2, "") +
    "}finally{" +
    ArrayLite.join(statements3, "") +
    "}")];

exports.Declare = (kind, identifier, expression) => [
  (
    kind +
    " " +
    identifier +
    "=" +
    expression +
    ";")];

exports.If = (expression, statements1, statements2) => [
  (
    "if(" +
    expression +
    "){" +
    ArrayLite.join(statements1, "") +
    "}else{" +
    ArrayLite.join(statements2, "") +
    "}")];

exports.Label = (boolean, label, statements) => [
  (
    (boolean ? "Continue" : "Break") +
    label +
    ":{" +
    ArrayLite.join(statements, "") +
    "}")];

exports.Break = (boolean, label) => [
  (
    "break " +
    (boolean ? "Continue" : "Break") +
    label +
    ";")];

exports.While = (expression, label, statements) => [
  (
    "while(" +
    expression +
    ")" +
    (label ? label + ":" : ""),
    "{" +
    ArrayLite.join(statements, "") +
    "}")];

// exports.For = (statements1, expression1, expression2, label, statements2) => [
//   (
//     "{" +
//     ArrayLite.join(statements1, "") +
//     "for(;" +
//     expression1 +
//     ";" +
//     expression2 +
//     ")" +
//     (label ? label + ":" : ""),
//     "{" +
//     ArrayLite.join(statements2, "") +
//     "}")];

exports.Debugger = () => [
  (
    "debugger;")];

exports.Switch = (clauses) => [
  (
    "switch(true){" +
    ArrayLite.join(
      ArrayLite.map(
        clauses,
        (clause) => (
          "case " +
          clause[0] +
          ":" +
          ArrayLite.join(clause[1], ""))),
      "") +
    "}")];

exports.With = (expression, statements) => [
  (
    "with("+
    expression +
    "){" +
    ArrayLite.join(statements, "") +
    "}")];

},{"array-lite":11}],18:[function(require,module,exports){
(function (global){

const Error = global.Error;

module.exports = (patterns) => {
  let index1 = 0;
  for (let index1 = 0; index1 < patterns.length; index1++) {
    const pattern = patterns[index1];
    if (pattern.type === "Identifier") {
      if (pattern.name === "arguments")
        return true;
    } else if (pattern.type === "RestElement") {
      patterns[patterns.length] = pattern.argument;
    } else if (pattern.type === "AssignmentPattern") {
      patterns[patterns.length] = pattern.left;
    } else if (pattern.type === "ArrayPattern") {
      for (let index2=0, length2=pattern.elements.length; index2<length2; index2++)
        if (pattern.elements[index2])
          patterns[patterns.length] = pattern.elements[index2];
    } else if (pattern.type === "ObjectPattern") {
      for (let index2=0, length2=patterns.properties.length; index2<length2; index2++)
        patterns[patterns.length] = pattern.properties[index2].value;
    } else {
      throw new Error("Unknown pattern type: "+pattern.type);
    }
  }
  return false;
}


}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],19:[function(require,module,exports){

const ArrayLite = require("array-lite");
const Traps = require("./traps");
const Escape = require("../escape.js");
const apply = Reflect.apply;
const substring = String.prototype.substring;
const toUpperCase = String.prototype.toUpperCase;
const Inform = require("./inform.js");
const ParseLabel = require("./parse-label.js");
const SanitizeIdentifier = require("./sanitize-identifier.js");
const ContainArguments = require("./contain-arguments.js");

module.exports = (pointcut) => {

  const traps = Traps(pointcut);

  const cut = {};

  /////////////////
  // Compilation //
  /////////////////

  cut.$builtin = (name) => traps.builtin(
    name,
    ARAN.build.read(
      Escape(name)));

  cut.$copy = traps.copy;

  cut.$drop = traps.drop;

  ///////////////
  // Combiners //
  ///////////////

  ArrayLite.forEach(
    [
      "object",
      "array",
      "get",
      "set",
      "delete",
      "enumerate",
      "invoke",
      "apply",
      "construct",
      "unary",
      "binary"],
    (key) => cut[key] = traps[key]);

  ///////////////
  // Informers //
  ///////////////

  cut.Label = (label, statements) => ArrayLite.concat(
    Inform(traps.label(ParseLabel.split(label) , ParseLabel.core(label))),
    ARAN.build.Label(
      label,
      ArrayLite.concat(
        statements,
        Inform(traps.leave("label")))));

  cut.Break = (label) => ArrayLite.concat(
    Inform(traps.break(ParseLabel.split(label) , ParseLabel.core(label))),
    ARAN.build.Break(label));

  cut.Block = (statements) => ARAN.build.Block(
    ArrayLite.concat(
      Inform(traps.block()),
      statements,
      Inform(traps.leave("block"))));

  ///////////////
  // Producers //
  ///////////////

  cut.Try = (statements1, statements2, statements3) => ARAN.build.Try(
    ArrayLite.concat(
      Inform(traps.try()),
      statements1,
      Inform(traps.leave("try"))),
    ArrayLite.concat(
      ARAN.build.Declare(
        "const",
        Escape("error"),
        traps.catch(
          ARAN.build.read("error"))),
      statements2,
      Inform(traps.leave("catch"))),
    ArrayLite.concat(
      Inform(traps.finally()),
      statements3,
      Inform(traps.leave("finally"))));

  cut.closure = (strict, statements) => ARAN.build.apply(
    ARAN.build.closure(
      strict,
      ArrayLite.concat(
        ARAN.build.Declare(
          "const",
          Escape("callee"),
          traps.closure(
            ARAN.build.closure(
              strict,
              ArrayLite.concat(
                (
                  ARAN.parent.type === "ArrowFunctionExpression" ?
                  ARAN.build.If(
                    ARAN.build.read("new.target"),
                    ARAN.build.Throw(
                      ARAN.build.construct(
                        ARAN.build.read(
                          Escape("TypeError")),
                        [
                          ARAN.build.primitive("arrow is not a constructor")])),
                    []) :
                  []),
                Inform(
                  traps.callee(
                    ARAN.build.read(
                      Escape("callee")))),
                (
                  ARAN.parent.type === "ArrowFunctionExpression" ?
                  (
                    traps.drop(
                      traps.this(
                        ARAN.build.read("this")))) :
                  ARAN.build.Declare(
                    "const",
                    SanitizeIdentifier("this"),
                    traps.declare(
                      "const",
                      "this",
                      traps.this(
                        ARAN.build.read("this"))))),
                (
                  ARAN.parent.type === "ArrowFunctionExpression" ?
                  (
                    traps.drop(
                      traps.newtarget(
                        ARAN.build.read("new.target")))) :
                  ARAN.build.Declare(
                    "const",
                    SanitizeIdentifier("new.target"),
                    traps.declare(
                      "const",
                      "new.target",
                      traps.newtarget(
                        ARAN.build.read("new.target"))))),
                ARAN.build.Declare(
                  "const",
                  Escape("arguments"),
                  traps.arguments(
                    ARAN.build.read("arguments"))),
                (
                  (
                    ARAN.parent.type === "ArrowFunctionExpression" ||
                    ContainArguments(
                      ArrayLite.slice(ARAN.parent.params))) ?
                  [] :
                  ARAN.build.Declare(
                    "let",
                    SanitizeIdentifier("arguments"),
                    traps.declare(
                      "let",
                      "arguments",
                      traps.copy(
                        0,
                        ARAN.build.read(
                          Escape("arguments")))))),
                statements)))),
        ARAN.build.Return(
          ARAN.build.read(
            Escape("callee"))))),
    []);

  cut.read = (identifier) => traps.read(
    identifier,
    ARAN.build.read(
      SanitizeIdentifier(identifier)));

  cut.discard = (identifier) => traps.discard(
    identifier,
    ARAN.build.discard(
      SanitizeIdentifier(identifier)));

  cut.primitive = (primitive) => traps.primitive(
    ARAN.build.primitive(primitive));

  cut.regexp = (pattern, flags) => traps.regexp(
    ARAN.build.regexp(pattern, flags));

  ///////////////
  // Consumers //
  ///////////////

  // eval in strict mode is block-scoped 
  // eval in normal mode is closure-scoped
  cut.PROGRAM = (strict, statements) => ARAN.build.PROGRAM(
    strict,
    ARAN.build.Try(
      ArrayLite.concat(
        Inform(traps.program()),
        ARAN.build.Declare(
          "let",
          Escape("terminate"),
          traps.primitive(
            ARAN.build.primitive(void 0))),
        statements,
        ARAN.build.Statement(
          traps.terminate(
            true,
            ARAN.build.read(
              Escape("terminate"))))),
      ARAN.build.Throw(
        traps.terminate(
          false,
          ARAN.build.read("error"))),
      []));

  cut.write = (identifier, expression) => ARAN.build.write(
    SanitizeIdentifier(identifier),
    traps.write(identifier, expression));

  cut.Declare = (kind, identifier, expression) => ARAN.build.Declare(
    kind,
    SanitizeIdentifier(identifier),
    traps.declare(kind, identifier, expression));

  cut.Return = (expression) => ARAN.build.Return(
    traps.return(expression));

  cut.eval = (expression) => ARAN.build.eval(
    traps.eval(expression));

  cut.With = (expression, statements) => ARAN.build.With(
    traps.with(expression),
    ArrayLite.concat(
      statements,
      Inform(traps.leave("with"))));

  cut.Throw = (expression) => ARAN.build.Throw(
    traps.throw(expression));

  cut.While = (expression, statements) => ArrayLite.concat(
    ARAN.build.While(
      traps.test(expression),
      statements));

    // Inform(
    //   traps.label(null, false)),
    // ARAN.build.While(
    //   traps.test(expression),
    //   (
    //     label &&
    //     SanitizeLabel.continue(label)),
    //   ArrayLite.concat(
    //     Inform(
    //       traps.label(null, true)),
    //     (
    //       label ?
    //       Inform(
    //         traps.label(label, true)) :
    //       []),
    //     statements,
    //     (
    //       label ?
    //       Inform(
    //         traps.leave("label")) :
    //       []),
    //     Inform(
    //       traps.leave("label")))),
    // Inform(traps.leave("label")));

  // cut.For = (statements1, expression1, expression2, label, statements2) => ArrayLite.concat(
  //   Inform(traps.label(null, false)),
  //   ARAN.build.For(
  //     statements1,
  //     traps.test(expression1),
  //     expression2,
  //     (
  //       label &&
  //       SanitizeLabel.continue(label)),
  //     ArrayLite.concat(
  //       Inform(
  //         traps.label(null, true)),
  //       (
  //         label ?
  //         Inform(
  //           traps.label(label, true)) :
  //         []),
  //       statements2,
  //       (
  //         label ?
  //         Inform(
  //           traps.leave("label")) :
  //         []),
  //       Inform(traps.leave("label")))),
  //   Inform(traps.leave("label")));

  cut.If = (expression, statements1, statements2) => ARAN.build.If(
    traps.test(expression),
    ArrayLite.concat(
      Inform(traps.block()),
      statements1,
      Inform(traps.leave("block"))),
    ArrayLite.concat(
      Inform(traps.block()),
      statements2,
      Inform(traps.leave("block"))));

  cut.conditional = (expression1, expression2, expression3) => ARAN.build.conditional(
    traps.test(expression1),
    expression2,
    expression3);

  cut.Switch = (clauses) => ARAN.build.Switch(
    ArrayLite.map(
      clauses,
      (clause) => [
        traps.test(clause[0]),
        clause[1]]));

  ////////////
  // Return //
  ////////////

  return cut;

};

},{"../escape.js":29,"./contain-arguments.js":18,"./inform.js":20,"./parse-label.js":21,"./sanitize-identifier.js":22,"./traps":27,"array-lite":11}],20:[function(require,module,exports){

const ArrayLite = require("array-lite");
const identity = (argument0) => argument0;

module.exports = ($expression) => (
  $expression ?
  ARAN.build.Statement($expression) :
  []);

// exports.last = function () {
//   return ARAN.build.sequence(
//     ArrayLite.filter(identity, arguments));
// };

// exports.first = function () {
//   return ARAN.build.get(
//     ARAN.build.array(
//       ArrayLite.filter(identity, arguments)),
//     ARAN.build.primitive(0));
// };

},{"array-lite":11}],21:[function(require,module,exports){

const apply = Reflect.apply;
const substring = String.prototype.substring;

exports.split = (label) => label[0] === "b" || label[0] === "B";

exports.core = (label) => label[0] === "B" || label[0] === "C" ? null : apply(substring, label, [1]);

},{}],22:[function(require,module,exports){

const apply = Reflect.apply;
const startsWith = String.prototype.startsWith;

module.exports = (identifier) => (
  identifier === "new.target" ?
  "$newtarget" :
  (
    (
      identifier === "this" ||
      identifier === "arguments" ||
      identifier === "error" ||
      identifier[0] === (ARAN.namespace === "$" ? "_" : "$") ||
      apply(startsWith, identifier, [ARAN.namespace])) ?
    (ARAN.namespace === "$" ? "_" : "$") + identifier :
    identifier));

},{}],23:[function(require,module,exports){
const ArrayLite = require("array-lite");
const TrapArguments = require("./trap-arguments.js");

const empty = () => null;
function last () { return arguments[arguments.length-1] }

ArrayLite.forEach(
  Object.keys(TrapArguments.combiners),
  (key) => exports[key] = (
    TrapArguments.combiners[key].length === 1 ?
    (argument0) => ARAN.build[key](argument0) :
    (
      TrapArguments.combiners[key].length === 2 ?
      (argument0, argument1) => ARAN.build[key](argument0, argument1) :
      (argument0, argument1, argument2) => ARAN.build[key](argument0, argument1, argument2))));

ArrayLite.forEach(
  Object.keys(TrapArguments.informers),
  (key) => exports[key] = empty);

ArrayLite.forEach(
  ArrayLite.concat(
    Object.keys(TrapArguments.producers),
    Object.keys(TrapArguments.consumers)),
  (key) => exports[key] = last);

},{"./trap-arguments.js":26,"array-lite":11}],24:[function(require,module,exports){

exports.true = require("./intercept.js");
exports.false = require("./forward.js");

},{"./forward.js":23,"./intercept.js":25}],25:[function(require,module,exports){

const ArrayLite = require("array-lite");
const TrapArguments = require("./trap-arguments");

const keys = Object.keys;

ArrayLite.forEach(
  ["consumers", "producers", "informers", "combiners"],
  (category) => ArrayLite.forEach(
    keys(TrapArguments[category]),
    (key) => exports[key] = function () {
      const array = [];
      for (var index=0; index<arguments.length; index++)
        array[index] = TrapArguments[category][key][index](arguments[index]);
      array[index] = ARAN.build.primitive(ARAN.parent.AranSerial);
      return ARAN.build.invoke(
        ARAN.build.read(ARAN.namespace),
        ARAN.build.primitive(key),
        array);
    }));

},{"./trap-arguments":26,"array-lite":11}],26:[function(require,module,exports){

const ArrayLite = require("array-lite");
const Escape = require("../../../escape.js");

const identity = (argument) => argument;
const primitive = (primitive) => ARAN.build.primitive(primitive);
const array = (expressions) => ARAN.build.array(expressions);
const object = (expressions) => ARAN.build.array(
  ArrayLite.map(
    expressions,
    array));

exports.combiners = {
  object: [object],
  array: [array],
  get: [identity, identity],
  set: [identity, identity, identity],
  delete: [identity, identity],
  invoke: [identity, identity, array],
  apply: [identity, array],
  construct: [identity, array],
  unary: [primitive, identity],
  binary: [primitive, identity, identity]};

exports.producers = {
  copy: [primitive, identity],
  read: [primitive, identity],
  discard: [primitive, identity],
  builtin: [primitive, identity],
  newtarget: [identity],
  this: [identity],
  arguments: [identity],
  catch: [identity],
  primitive: [identity],
  regexp: [identity],
  closure: [identity]};

exports.consumers = {
  drop: [identity],
  declare: [primitive, primitive, identity],
  write: [primitive, identity],
  test: [identity],
  with: [identity],
  throw: [identity],
  return: [identity],
  eval: [identity],
  terminate: [primitive, identity]};

exports.informers = {
  try: [],
  finally: [],
  block: [],
  program: [],
  callee: [identity],
  label: [primitive, primitive],
  leave: [primitive],
  break: [primitive, primitive]};

},{"../../../escape.js":29,"array-lite":11}],27:[function(require,module,exports){

const ArrayLite = require("array-lite");
const Fork = require("./fork");
const TrapNames = require("./trap-names.js");

const isArray = Array.isArray;
const apply = Reflect.apply;

module.exports = (pointcut) => {
  const make = (
    isArray(pointcut) ?
    (key) => Fork[Boolean(ArrayLite.includes(pointcut, key))][key] :
    (
      typeof pointcut === "function" ?
      (key) => function () { return apply(
        Fork[Boolean(pointcut(key, arguments[arguments.length-1]))][key],
        null,
        arguments) } :
      (
        typeof pointcut === "object" && pointcut !== null ?
        (key) => (
          typeof pointcut[key] === "function" ? 
          function () { return apply(
            Fork[Boolean(pointcut[key](arguments[arguments.length-1]))][key],
            null,
            arguments) } :
          Fork[Boolean(pointcut[key])][key]) :
        (key) => Fork[false][key])));
  const cut = {};
  ArrayLite.forEach(
    TrapNames,
    (name) => cut[name] = make(name));
  return cut;
};

},{"./fork":24,"./trap-names.js":28,"array-lite":11}],28:[function(require,module,exports){

module.exports = [
  // Combiners //
  "object",
  "array",
  "get",
  "set",
  "delete",
  "invoke",
  "apply",
  "construct",
  "unary",
  "binary",
  // Producers //
  "copy",
  "read",
  "discard",
  "builtin",
  "this",
  "newtarget",
  "arguments",
  "catch",
  "primitive",
  "regexp",
  "closure",
  // Consumers //
  "drop",
  "declare",
  "write",
  "test",
  "with",
  "throw",
  "return",
  "eval",
  "terminate",
  // Informers //
  "program",
  "label",
  "callee",
  "block",
  "try",
  "finally",
  "leave",
  "break"];

},{}],29:[function(require,module,exports){

module.exports = (name) => ARAN.namespace + name;

},{}],30:[function(require,module,exports){
(function (global){

const Join = require("./join");
const Cut = require("./cut");
const Build = require("./build");
const ArrayLite = require("array-lite");

function join (root, pointcut, parent) {
  this._roots.push(root);
  const temporary = global.ARAN;
  global.ARAN = {
    build: this._build,
    nodes: this._nodes,
    namespace: this.namespace,
    counter: this._counter,
    cut: Cut(pointcut)
  };
  const result = Join(root, parent);
  this._counter = global.ARAN.counter;
  global.ARAN = temporary;
  return result;
}

function root (serial) {
  for (var index=0, length=this._roots.length; index<length; index++) {
    if (serial >= this._roots[index].AranSerial && serial <= this._roots[index].AranMaxSerial) {
      return this._roots[index];
    }
  }
}

function node1 (serial) {
  var nodes = ArrayLite.slice(this._roots);
  for (var index = 0; index < node.length; index++) {
    var node = nodes[index];
    if (typeof node === "object" && node !== null) {
      if (node.AranSerial === serial) {
        return node;
      }
      if (!node.AranSerial || (serial > node.AranSerial && serial <= node.AranMaxSerial)) {
        for (var key in node) {
          nodes[nodes.length] = node[key];
        }
      }
    }
  }
}

function node2 (serial) {
  return this._nodes[serial];
};

module.exports = (options) => ({
  _roots: [],
  _counter: 1,
  _build: options.output ? (Build[options.output] || options.output) : Build.Estree,
  _nodes: options.nocache ? null : [],
  namespace: options.namespace || "__aran__",
  join: join,
  root: root,
  node: options.nocache ? node1 : node2
});

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./build":16,"./cut":19,"./join":31,"array-lite":11}],31:[function(require,module,exports){

// array = rest(array, iterator)
//
// function rest () {
//   let step = null;
//   while (!(step = arguments[1].next()).done) {
//     arguments[0][arguments[0].length] = step.value;
//   }
//   return arguments[0];
// }

const ArrayLite = require("array-lite");
const Escape = require("../escape.js");
const Visit = require("./visit");
const Interim = require("./interim.js");
const Terminate = require("./terminate.js");

const keys = Object.keys;

module.exports = (node, parent) => {
  Terminate(node);
  node.AranParent = parent || null;
  node.AranStrict = (
    (
      parent && parent.AranStrict) ||
    (
      node.body.length &&
      node.body[0].type === "ExpressionStatement" &&
      node.body[0].expression.type === "Literal" &&
      node.body[0].expression.value === "use strict"));
  node.AranSerial = ++ARAN.counter;
  if (ARAN.nodes)
    ARAN.nodes[node.AranSerial] = node;
  ARAN.hoisted = [];
  ARAN.parent = node;
  const statements = ArrayLite.flatenMap(
    node.body,
    Visit.Statement);
  const result = ARAN.cut.PROGRAM(
    node.AranStrict,
    ArrayLite.concat(
      ArrayLite.flatenMap(
        keys(builtins),
        save),
      ArrayLite.flaten(ARAN.hoisted),
      statements));
  delete ARAN.hoisted;
  delete ARAN.parent;
  node.AranMaxSerial = ARAN.counter;
  return result;
};

const builtins = {
  global: () => ARAN.build.conditional(
    ARAN.build.binary(
      "===",
      ARAN.build.unary(
        "typeof",
        ARAN.build.read("window")),
      ARAN.build.primitive("undefined")),
    ARAN.build.read("global"),
    ARAN.build.read("window")),
  apply: () => ARAN.build.get(
    ARAN.build.read("Reflect"),
    ARAN.build.primitive("apply")),
  defineProperty: () => ARAN.build.get(
    ARAN.build.read("Object"),
    ARAN.build.primitive("defineProperty")),
  getPrototypeOf: () => ARAN.build.get(
    ARAN.build.read("Object"),
    ARAN.build.primitive("getPrototypeOf")),
  keys: () => ARAN.build.get(
    ARAN.build.read("Object"),
    ARAN.build.primitive("keys")),
  iterator: () => ARAN.build.get(
    ARAN.build.read("Symbol"),
    ARAN.build.primitive("iterator")),
  eval: () => ARAN.build.read("eval"),
  TypeError: () => ARAN.build.read("TypeError"),
  rest: () => ARAN.build.closure(
    false,
    ArrayLite.concat(
      ARAN.build.Declare(
        "let",
        "step",
        ARAN.build.primitive(void 0)),
      ARAN.build.Declare(
        "let",
        "array",
        ARAN.build.array([])),
      ARAN.build.While(
        ARAN.build.unary(
          "!",
          ARAN.build.get(
            ARAN.build.write(
              "step",
              ARAN.build.invoke(
                ARAN.build.get(
                  ARAN.build.read("arguments"),
                  ARAN.build.primitive(0)),
                ARAN.build.primitive("next"),
                [])),
            ARAN.build.primitive("done"))),
        ARAN.build.Statement(
          ARAN.build.set(
            ARAN.build.read("array"),
            ARAN.build.get(
              ARAN.build.read("array"),
              ARAN.build.primitive("length")),
            ARAN.build.get(
              ARAN.build.read("step"),
              ARAN.build.primitive("value"))))),
      ARAN.build.Return(
        ARAN.build.read("array"))))};

const save = (key) => ARAN.build.If(
  ARAN.build.binary(
    "===",
    ARAN.build.unary(
      "typeof",
      ARAN.build.read(
        Escape(key))),
    ARAN.build.primitive("undefined")),
  ARAN.build.Declare(
    "var",
    Escape(key),
    builtins[key]()),
  []);

},{"../escape.js":29,"./interim.js":32,"./terminate.js":33,"./visit":45,"array-lite":11}],32:[function(require,module,exports){

const Escape = require("../escape.js");

exports.hoist = (information, expression) => {
  ARAN.hoisted[ARAN.hoisted.length] = ARAN.build.Declare(
    "var",
    Escape(ARAN.parent.AranSerial + "_" + information),
    ARAN.build.primitive(void 0));
  return ARAN.build.write(
    Escape(ARAN.parent.AranSerial + "_" + information),
    expression);
};

exports.read = (information) => ARAN.build.read(
  Escape(ARAN.parent.AranSerial + "_" + information));

exports.write = (information, expression) => ARAN.build.write(
  Escape(ARAN.parent.AranSerial + "_" + information),
  expression);

exports.Declare = (information, expression) => ARAN.build.Declare(
  "var",
  Escape(ARAN.parent.AranSerial + "_" + information),
  expression);

exports.LABEL = (information) => Escape(ARAN.parent.AranSerial + "_" + information);
},{"../escape.js":29}],33:[function(require,module,exports){

const stop = (node) => false;
const body = (node) => {
  visit(node.body);
  return true;
};

const visit = (node) => visitors[node.type](node);

module.exports = (node) => {
  for (var index = node.body.length-1; index>=0; index--)
    if (visit(node.body[index]))
      return;
};

const visitors = {};
visitors.EmptyStatement = stop;
visitors.BlockStatement = (node) => {
  for (let index = node.body.length-1; index >= 0; index--)
    if (visit(node.body[index]))
      return true;
  return false;
};
visitors.ExpressionStatement = (node) => node.expression.AranTerminate = true;
visitors.IfStatement = (node) => {
  visit(node.consequent);
  if (node.alternate)
    visit(node.alternate);
  return true;
};
visitors.LabeledStatement = (node) => visit(node.body);
visitors.BreakStatement = stop;
visitors.ContinueStatement = stop;
visitors.WithStatement = body;
visitors.SwitchStatement = (node) => {
  for (let index1 = 0; index1 < node.cases.length; index1++)
    for (let index2 = node.cases[index1].consequent.length-1; index2 >= 0; index2--)
      if (visit(node.cases[index1].consequent[index2]))
        break;
  return true;
};
visitors.ReturnStatement = (node) => {
  throw new Error("Illegal return statement");
};
visitors.ThrowStatement = (node) => true;
visitors.TryStatement = (node) => {
  visit(node.block);
  visit(node.handler.body);
  return true;
};
visitors.WhileStatement = body;
visitors.DoWhileStatement = body;
visitors.ForStatement = body;
visitors.ForInStatement = body;
visitors.ForOfStatement = body;
visitors.DebuggerStatement = stop;
visitors.FunctionDeclaration = stop;
visitors.VariableDeclaration = (node) => {
  for (let index = node.declarations.length-1; index >= 0; index--)
    if (node.declarations[index].init)
      return node.declarations[index].init.AranTerminate = true;
  return false;
};

},{}],34:[function(require,module,exports){

const ArrayLite = require("array-lite");
const Visit = require("../visit");

exports.Body = (node) => (
  node.type === "BlockStatement" ?
  ArrayLite.flatenMap(
    node.body,
    Visit.Statement) :
  Visit.Statement(node));

},{"../visit":45,"array-lite":11}],35:[function(require,module,exports){
(function (global){

const ArrayLite = require("array-lite");
const Escape = require("../../escape.js");
const Interim = require("../interim.js");
const Visit = require("../visit");
const Util = require("./index.js");
const Error = global.Error;

exports.closure = (node) => {
  const temporary = ARAN.hoisted;
  ARAN.hoisted = [];
  const statements1 = (
    (
      node.params.length &&
      node.params[node.params.length-1].type === "RestElement") ?
    ArrayLite.concat(
      Interim.Declare(
        "iterator",
        ARAN.cut.invoke(
          ARAN.build.read(
            Escape("arguments")),
          ARAN.cut.$builtin("iterator"),
          [])),
      ArrayLite.flatenMap(
        node.params,
        (pattern) => Util.Declare(
          "let",
          (
            pattern.type === "RestElement" ?
            pattern.argument :
            pattern),
          (
            pattern.type === "RestElement" ?
            ARAN.cut.apply(
              ARAN.cut.$builtin("rest"),
              [
                Interim.read("iterator")]) :
            ARAN.cut.get(
              ARAN.cut.invoke(
                Interim.read("iterator"),
                ARAN.cut.primitive("next"),
                []),
              ARAN.cut.primitive("value")))))) :
    ArrayLite.concat(
      ArrayLite.flatenMap(
        node.params,
        (pattern, index) => Util.Declare(
          "let",
          pattern,
          ARAN.cut.get(
            ARAN.cut.$copy(
              0,
              ARAN.build.read(
                Escape("arguments"))),
            ARAN.cut.primitive(index)))),
      ARAN.build.Statement(
        ARAN.cut.$drop(
          ARAN.build.read(
            Escape("arguments"))))));
  const statements2 = (
    node.expression ?
    ARAN.cut.Return(
      Visit.expression(node.body)) :
    ArrayLite.concat(
      ArrayLite.flatenMap(
        node.body.body,
        Visit.Statement),
      ARAN.cut.Return(
        ARAN.cut.primitive(void 0))));
  const expression = ARAN.cut.closure(
    node.AranStrict,
    ArrayLite.concat(
      statements1,
      ArrayLite.flaten(ARAN.hoisted),
      statements2));
  ARAN.hoisted = temporary;
  return (
    node.id ?
    ARAN.cut.apply(
      ARAN.cut.$builtin("defineProperty"),
      [
        expression,
        ARAN.cut.primitive("name"),
        ARAN.cut.object(
          [
            [
              ARAN.cut.primitive("value"),
              ARAN.cut.primitive(node.id.name)],
            [
              ARAN.cut.primitive("configurable"),
              ARAN.cut.primitive(true)]])]) :
    expression);
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../../escape.js":29,"../interim.js":32,"../visit":45,"./index.js":37,"array-lite":11}],36:[function(require,module,exports){

const ArrayLite = require("array-lite");
const Escape = require("../../escape.js");
const Interim = require("../interim.js");
const Visit = require("../visit");
const Util = require("./index.js");

exports.Declaration = (node) => ArrayLite.flatenMap(
  node.declarations,
  (declarator, local) => (
    declarator.init ?
    (
      declarator.init.AranTerminate ?
      ArrayLite.concat(
        Interim.Declare(
          "terminate",
          ARAN.cut.$copy(
              2,
              Visit.expression(declarator.init))),
        Util.Declare(
          node.kind,
          declarator.id,
          Interim.read("terminate")),
        ARAN.build.Statement(
          ARAN.cut.$drop(
            ARAN.build.read(
              Escape("terminate")))),
        ARAN.build.Statement(
          ARAN.build.write(
            Escape("terminate"),
            Interim.read("terminate")))) :
      Util.Declare(
        node.kind,
        declarator.id,
        Visit.expression(declarator.init))) :
    (
      local = ARAN.cut.Declare(
        node.kind,
        declarator.id.name,
        ARAN.cut.primitive(void 0)),
      (
        node.kind === "var" ?
        (
          ARAN.hoisted[ARAN.hoisted.length] = local,
          []) :
        local))));

},{"../../escape.js":29,"../interim.js":32,"../visit":45,"./index.js":37,"array-lite":11}],37:[function(require,module,exports){

Object.assign(
  exports,
  require("./pattern"),
  require("./body.js"),
  require("./closure.js"),
  require("./declaration.js"),
  require("./loop.js"),
  require("./property.js"));

},{"./body.js":34,"./closure.js":35,"./declaration.js":36,"./loop.js":38,"./pattern":41,"./property.js":43}],38:[function(require,module,exports){

const ArrayLite = require("array-lite");
const Visit = require("../visit");
const Util = require("./index.js");

exports.Loop = (test, before, body, after) => {
  const temporay1 = ARAN.break;
  const temporay2 = ARAN.continue;
  ARAN.break = "B" + ARAN.parent.AranSerial;
  ARAN.continue = "C" + ARAN.parent.AranSerial;
  const result = ARAN.cut.Label(
    ARAN.break,
    ARAN.cut.While(
      (
        test ||
        ARAN.cut.primitive(true)),
      ArrayLite.concat(
        before,
        ARAN.cut.Label(
          ARAN.continue,
          (
            ARAN.parent.AranParent.type === "LabeledStatement" ?
            ARAN.cut.Label(
              "c" + ARAN.parent.AranParent.label.name,
              Util.Body(body)) :
            Util.Body(body))),
        after)));
  ARAN.break = temporay1;
  ARAN.continue = temporay2;
  return result;
};

},{"../visit":45,"./index.js":37,"array-lite":11}],39:[function(require,module,exports){

const Interim = require("../../interim.js");
const Visit = require("../../visit");
const Util = require("../index.js");

module.exports = (transformers, pairs) => {
  const result = [];
  for (let index1=0; index1<pairs.length; index1++) {
    const left = pairs[index1][0];
    const right = pairs[index1][1];
    if (left === null) {
      result[result.length] = transformers.expression(
        ARAN.cut.$drop(right));
    } else if (left.type === "Identifier") {
      result[result.length] = transformers.binding(left.name, right);
    } else if (left.type === "MemberExpression") {
      result[result.length] = transformers.expression(
        ARAN.cut.set(
          Visit.expression(left.object),
          Util.property(left),
          right));
    } else if (left.type === "AssignmentPattern") {
      pairs[pairs.length] = [
        left.left,
        ARAN.cut.conditional(
          ARAN.cut.binary(
            "===",
            Interim.hoist(
              "default"+index1,
              ARAN.cut.$copy(0, right)),
            ARAN.cut.primitive(void 0)),
          ARAN.cut.$drop(
            Visit.expression(left.right)),
          Interim.read("default"+index1))];
    } else if (left.type === "ArrayPattern") {
      if (left.elements.length === 0) {
        result[result.length] = transformers.expression(
          ARAN.cut.$drop(right));
      } else {
        result[result.length] = transformers.expression(
          Interim.hoist(
            "iterator"+index1,
            ARAN.cut.invoke(
              right,
              ARAN.cut.$builtin("iterator"),
              [])));
        const last = left.elements.length-1;
        for (let index2=0; index2<last; index2++)
          pairs[pairs.length] = [
            left.elements[index2],
            ARAN.cut.get(
              ARAN.cut.invoke(
                ARAN.cut.$copy(
                  0,
                  Interim.read("iterator"+index1)),
                ARAN.cut.primitive("next"),
                []),
              ARAN.cut.primitive("value"))];
        pairs[pairs.length] = (
          left.elements[last].type === "RestElement" ?
          [
            left.elements[last].argument,
            ARAN.cut.apply(
              ARAN.cut.$builtin("rest"),
              [
                Interim.read("iterator"+index1)])] :
          [
            left.elements[last],
            ARAN.cut.get(
              ARAN.cut.invoke(
                Interim.read("iterator"+index1),
                ARAN.cut.primitive("next"),
                []),
              ARAN.cut.primitive("value"))]);
      }
    } else if (left.type === "ObjectPattern") {
      if (!left.properties.length) {
        result[result.length] = transformers.expression(
          ARAN.cut.$drop(right));
      } else {
        result[result.length] = transformers.expression(
          Interim.hoist(
            "object"+index1,
            right));
        for (let index2=0; index2<left.properties.length; index2++)
          pairs[pairs.length] = [
            left.properties[index2].value,
            ARAN.cut.get(
              (
                index2 === left.properties.length - 1 ?
                Interim.read("object"+index1) :
                ARAN.cut.$copy(
                  0,
                  Interim.read("object"+index1))),
              Util.property(
                {
                  computed: left.properties[index2].computed,
                  property: left.properties[index2].key }))];
      }
    }
  }
  return result;
};

},{"../../interim.js":32,"../../visit":45,"../index.js":37}],40:[function(require,module,exports){

const ArrayLite = require("array-lite");
const Common = require("./common.js");

const transformerss = {
  var: {
    expression: (expression) => ARAN.build.Statement(expression),
    binding: (identifier, expression) => {
      ARAN.hoisted[ARAN.hoisted.length] = ARAN.cut.Declare(
        "var",
        identifier,
        ARAN.cut.primitive(void 0));
      return ARAN.build.Statement(
        ARAN.cut.write(identifier, expression));
    }},
  let: {
    expression: (expression) => ARAN.build.Statement(expression),
    binding: (identifier, expression) => ARAN.cut.Declare("let", identifier, expression)},
  const: {
    expression: (expression) => ARAN.build.Statement(expression),
    binding: (identifier, expression) => ARAN.cut.Declare("const", identifier, expression)}};

exports.Declare = (kind, pattern, expression) => ArrayLite.flaten(
  Common(
    transformerss[kind],
    [
      [
        pattern,
        expression]]));

},{"./common.js":39,"array-lite":11}],41:[function(require,module,exports){

exports.write = require("./write.js").write;
exports.Declare = require("./declare.js").Declare;

},{"./declare.js":40,"./write.js":42}],42:[function(require,module,exports){

const Common = require("./common.js");

const identity = (argument) => argument;

exports.write = (pattern, expression) => ARAN.build.sequence(
  Common(
    {
      expression: identity,
      binding: ARAN.cut.write },
    [
      [
        pattern,
        expression]]));

},{"./common.js":39}],43:[function(require,module,exports){

const Visit = require("../visit");

exports.property = (node) => (
  node.computed ?
  Visit.expression(node.property) :
  (
    node.property.type === "Identifier" ?
    ARAN.cut.primitive(node.property.name) :
    ARAN.cut.primitive(node.property.value)));

},{"../visit":45}],44:[function(require,module,exports){

const ArrayLite = require("array-lite");
const Interim = require("../interim.js");
const Util = require("../util");
const Visit = require("./index.js");
const apply = Reflect.apply;
const substring = String.prototype.substring;

exports.ThisExpression = (node) => ARAN.cut.read("this");

exports.ArrayExpression = (node) => ARAN.cut.array(
  ArrayLite.map(
    node.elements,
    (expression) => (
      expression ?
      Visit.expression(expression) :
      ARAN.cut.primitive(void 0))));

exports.ObjectExpression = (node) => (
  ArrayLite.every(
    node.properties,
    (property) => property.kind === "init") ?
  ARAN.cut.object(
    ArrayLite.map(
      node.properties,
      (property) => [
        Util.property(
          {
            computed: property.computed,
            property: property.key}),
        Visit.expression(property.value)])) :
  ArrayLite.reduce(
    node.properties,
    (node, property) => ARAN.cut.apply(
      ARAN.cut.$builtin("defineProperty"),
      [
        node,
        (
          property.computed ?
          Visit.expression(property.key) :
          (
            property.key === "Identifier" ?
            ARAN.cut.primitive(property.key.name) :
            ARAN.cut.primitive(property.key.value))),
        ARAN.cut.object(
          ArrayLite.concat(
            [
              [
                ARAN.cut.primitive("configurable"),
                ARAN.cut.primitive(true)]],
            [
              [
                ARAN.cut.primitive("enumerable"),
                ARAN.cut.primitive(true)]],
            (
              property.kind === "init" ?
              [
                [
                  ARAN.cut.primitive("writable"),
                  ARAN.cut.primitive(true)]] :
              []),
            [
              [
                ARAN.cut.primitive(
                  property.kind === "init" ? "value" : property.kind),
                Visit.expression(property.value)]]))]),
    ARAN.cut.object([])));

exports.ArrowFunctionExpression = (node) => Util.closure(node);

exports.FunctionExpression = (node) => Util.closure(node);

exports.SequenceExpression = (node) => ARAN.build.sequence(
  ArrayLite.map(
    node.expressions,
    (expression, index) => (
      index === node.expressions.length -1 ?
      Visit.expression(expression) :
      ARAN.cut.$drop(
        Visit.expression(expression)))));

exports.UnaryExpression = (node) => (
  node.operator === "typeof" && node.argument.type === "Identifier" ?
  ARAN.cut.unary(
      "typeof",
      ARAN.build.apply(
        ARAN.build.closure(
          false,
          ARAN.build.Try(
            ARAN.build.Return(
              ARAN.cut.read(node.argument.name)),
            ARAN.build.Return(
              ARAN.cut.primitive(void 0)),
            [])),
        [])) :
  (node.operator === "delete" && node.argument.type === "Identifier" ?
    ARAN.cut.discard(node.argument.name) :
    (
      node.operator === "delete" && node.argument.type === "MemberExpression" ?
      ARAN.cut.delete(
        Visit.expression(node.argument.object),
        Util.property(node.argument)) :
      ARAN.cut.unary(
        node.operator,
        Visit.expression(node.argument)))));

exports.BinaryExpression = (node) => ARAN.cut.binary(
  node.operator,
  Visit.expression(node.left),
  Visit.expression(node.right));

exports.AssignmentExpression = (node) => ARAN.build.sequence(
  [
    (
      node.operator === "=" ?
      Util.write(
        node.left,
        Interim.hoist(
          "value",
          ARAN.cut.$copy(
            0,
            Visit.expression(node.right)))) :
      (
        node.left.type === "MemberExpression" ?
        ARAN.cut.set(
          Interim.hoist(
            "object",
            ARAN.cut.$copy(
              1,
              Visit.expression(node.left.object))),
          Interim.hoist(
            "property",
            ARAN.cut.$copy(
              2,
              Util.property(node.left))),
          Interim.hoist(
            "value",
            ARAN.cut.$copy(
              3,
              ARAN.cut.binary(
                apply(substring, node.operator, [0, node.operator.length-1]),
                ARAN.cut.get(
                  Interim.read("object"),
                  Interim.read("property")),
                Visit.expression(node.right))))) :
        ARAN.cut.write(
          node.left.name,
          Interim.hoist(
            "value",
            ARAN.cut.$copy(
              0,
              ARAN.cut.binary(
                apply(substring, node.operator, [0, node.operator.length-1]),
                ARAN.cut.read(node.left.name),
                Visit.expression(node.right))))))),
    Interim.read("value")]);

exports.UpdateExpression = (node) => ARAN.build.sequence(
  [
    (
      node.argument.type === "MemberExpression" ?
      ARAN.cut.set(
        Interim.hoist(
          "object",
          ARAN.cut.$copy(
            1,
            Visit.expression(node.argument.object))),
        Interim.hoist(
          "property",
          ARAN.cut.$copy(
            2,
            Util.property(node.argument))),
        (
          node.prefix ?
          Interim.hoist(
            "value",
            ARAN.cut.$copy(
              3,
              ARAN.cut.binary(
                node.operator[0],
                ARAN.cut.get(
                  Interim.read("object"),
                  Interim.read("property")),
                ARAN.cut.primitive(1)))) :
          ARAN.cut.binary(
            node.operator[0],
            Interim.hoist(
              "value",
              ARAN.cut.get(
                Interim.read("object"),
                Interim.read("property"))),
            ARAN.cut.primitive(1)))) :
      ARAN.cut.write(
        node.argument.name,
        (
          node.prefix ?
          Interim.hoist(
            "value",
            ARAN.cut.$copy(
              0,
              ARAN.cut.binary(
                node.operator[0],
                ARAN.cut.read(node.argument.name),
                ARAN.cut.primitive(1)))) :
          ARAN.cut.binary(
            node.operator[0],
            Interim.hoist(
              "value",
              ARAN.cut.$copy(
                0,
                ARAN.cut.read(node.argument.name))),
            ARAN.cut.primitive(1))))),
    Interim.read("value")]);

exports.LogicalExpression = (node) => ARAN.cut.conditional(
  Interim.hoist(
    "logic",
    ARAN.cut.$copy(
      0,
      Visit.expression(node.left))),
  (
    node.operator === "||" ?
    Interim.read("logic") :
    ARAN.build.sequence(
      [
        ARAN.cut.$drop(
          Interim.read("logic")),
        Visit.expression(node.right)])),
  (
    node.operator === "&&" ?
    Interim.read("logic") :
    ARAN.build.sequence(
      [
        ARAN.cut.$drop(
          Interim.read("logic")),
        Visit.expression(node.right)])));

exports.ConditionalExpression = (node) => ARAN.cut.conditional(
  Visit.expression(node.test),
  Visit.expression(node.consequent),
  Visit.expression(node.alternate));

exports.NewExpression = (node) => ARAN.cut.construct(
  Visit.expression(node.callee),
  ArrayLite.map(
    node.arguments,
    Visit.expression));

exports.CallExpression = (node) => (
  ArrayLite.every(
    node.arguments,
    (argument) => argument.type !== "SpreadElement") ?
  (
    node.callee.type === "MemberExpression" ?
    ARAN.cut.invoke(
      Visit.expression(node.callee.object),
      Util.property(node.callee),
      ArrayLite.map(
        node.arguments,
        Visit.expression)) :
    (
      (
        node.callee.type !== "Identifier" ||
        node.callee.name !== "eval") ?
      ARAN.cut.apply(
        Visit.expression(node.callee),
        ArrayLite.map(
          node.arguments,
          Visit.expression)) :
      ARAN.cut.eval((
        node.arguments.length === 0 ?
        ARAN.cut.primitive(void 0) :
        (
          node.arguments.length === 1 ?
          Visit.expression(node.arguments[0]) :
          ARAN.build.get(
            ARAN.build.array(
              ArrayLite.map(
                node.arguments,
                (argument, index) => (
                  index ?
                  ARAN.cut.$drop(
                    Visit.expression(argument)) :
                  Visit.expression(argument)))),
            ARAN.build.primitive(0))))))) :
  ARAN.cut.apply(
    ARAN.cut.builtin("apply"),
    [
      (
        node.callee.type === "MemberExpression" ?
        ARAN.cut.get(
          Interim.hoist(
            "this",
            ARAN.cut.$copy(
              2,
              Visit.expression(node.callee.object))),
          Util.property(node.callee)) :
        Visit.expression(node.callee)),
      (
        node.callee.type === "MemberExpression" ?
        Interim.read("this") :
        (
          node.AranStrict ?
          ARAN.cut.primitive(void 0) :
          ARAN.cut.$builtin("global"))),
      ARAN.build.sequence(
        ArrayLite.concat(
          [
            Interim.hoist(
              "arguments",
              ARAN.cut.array([]))],
          ArrayLite.map(
            node.arguments,
            (argument) => (
              argument.type === "SpreadElement" ?
              ARAN.build.apply(
                ARAN.cut.$builtin(),
                [
                  ARAN.cut.$copy(
                    0,
                    Interim.read("arguments")),
                  ARAN.cut.invoke(
                    Visit.expression(argument.argument),
                    ARAN.cut.builtin("iterator"),
                    [])]) :
              ARAN.cut.set(
                ARAN.cut.$copy(
                  0,
                  Interim.read("arguments")),
                ARAN.cut.get(
                  ARAN.cut.$copy(
                    0,
                    Interim.read("arguments")),
                  ARAN.cut.primitive("length")),
                Visit.expression(argument)))),
          Interim.read("arguments")))]));

exports.MemberExpression = (node) => ARAN.cut.get(
  Visit.expression(node.object),
  Util.property(node));

exports.MetaProperty = (node) => ARAN.cut.read("new.target");

exports.Identifier = (node) => (
  node.name === "undefined" ?
  ARAN.build.conditional(
    ARAN.build.binary(
      "===",
      ARAN.build.read("undefined"),
      ARAN.build.primitive(void 0)),
    ARAN.cut.primitive(void 0),
    ARAN.cut.read("undefined")) :
  ARAN.cut.read(node.name));

exports.Literal = (node) => (
  node.regex ?
  ARAN.cut.regexp(node.regex.pattern, node.regex.flags) :
  ARAN.cut.primitive(node.value));

},{"../interim.js":32,"../util":37,"./index.js":45,"array-lite":11}],45:[function(require,module,exports){

const Escape = require("../../escape.js");
const Expression = require("./expression.js");
const Statement = require("./statement.js");
const defineProperty = Reflect.defineProperty;

const visit = (visitors) => (node) => {
  defineProperty(node, "AranParent", {
    configurable: true,
    enumerable: false,
    writable: true,
    value: ARAN.parent
  });
  node.AranStrict = (
    ARAN.parent.AranStrict &&
    (
      node.type === "FunctionExpression" ||
      node.type === "FunctionDeclaration" ||
      node.type === "ArrowFunctionExpression") &&
    !node.expression &&
    node.body.body.length &&
    node.body.body[0].type === "ExpressionStatement" &&
    node.body.body[0].expression.type === "Literal" &&
    node.body.body[0].expression.value === "use strict");
  node.AranSerial = ++ARAN.counter;
  if (ARAN.nodes)
    ARAN.nodes[node.AranSerial] = node;
  const temporary = ARAN.parent;
  ARAN.parent = node;
  const result = visitors[node.type](node);
  ARAN.parent = temporary;
  node.AranMaxSerial = ARAN.counter;
  return result;
};

exports.Statement = visit(Statement);
exports.expression = visit(Expression);

},{"../../escape.js":29,"./expression.js":44,"./statement.js":46}],46:[function(require,module,exports){

// The visitors of this file returns a list of statement.
// This is safe provided that control structures (if|while|do-while|for|for-in|label) have a statement block as body.
// Therefore, if it is not already the case, we put a block around the body of these structures.
// However, since ECMAScript6, statement blocks are no longer transparent due to block scoping.
// Yet, this transformation is safe because the body of the above structure cannot be a declaration (see http://www.ecma-international.org/ecma-262/6.0/#sec-statements).

const ArrayLite = require("array-lite");
const Escape = require("../../escape.js");
const Interim = require("../interim.js");
const Util = require("../util");
const Visit = require("./index.js");

exports.EmptyStatement = (node) => [];

exports.BlockStatement = (node) => ARAN.cut.Block(
  ArrayLite.flatenMap(
    node.body,
    Visit.Statement));

exports.ExpressionStatement = (node) => (
  node.expression.AranTerminate ?
  ArrayLite.concat(
    ARAN.build.Statement(
      Interim.write(
        "terminate",
        ARAN.cut.$drop(
          ARAN.cut.$copy(
            2,
            Visit.expression(node.expression))))),
    ARAN.build.Statement(
      ARAN.cut.$drop(
        ARAN.build.read(
          Escape("terminate")))),
    ARAN.build.Statement(
      ARAN.build.write(
        Escape("terminate"),
        Interim.read("terminate")))) :
  ARAN.build.Statement(
    ARAN.cut.$drop(
      Visit.expression(node.expression))));

exports.IfStatement = (node) => ARAN.cut.If(
  Visit.expression(node.test),
  Util.Body(node.consequent),
  (
    node.alternate ?
    Util.Body(node.alternate) :
    []));

exports.LabeledStatement = (node) => ARAN.cut.Label(
  "b" + node.label.name,
  Util.Body(node.body));

exports.BreakStatement = (node) => ARAN.cut.Break(
  (
    node.label ?
    "b" + node.label.name :
    ARAN.break));

exports.ContinueStatement = (node) => ARAN.cut.Break(
  (
    node.label ?
    "c" + node.label.name :
    ARAN.continue));

exports.WithStatement = (node) => ARAN.cut.With(
  Visit.expression(node.object),
  Util.Body(node.body));

exports.SwitchStatement = (node, temporary, result) => (
  temporary = ARAN.label,
  ARAN.break = "B" + node.AranSerial,
  result =
    ARAN.cut.Label(
      ARAN.break,
      ArrayLite.concat(
        Interim.Declare(
          "switch",
          Visit.expression(node.discriminant)),
        ARAN.cut.Switch(
          ArrayLite.map(
            node.cases,
            (clause) => [
              (
                clause.test ?
                ARAN.cut.binary(
                  "===",
                  ARAN.cut.$copy(
                    0,
                    Interim.read("switch")),
                  Visit.expression(clause.test)) :
                ARAN.cut.primitive(true)),
              ArrayLite.flatenMap(
                clause.consequent,
                Visit.Statement)])),
        ARAN.build.Statement(
          ARAN.cut.$drop(
            Interim.read("switch"))))),
    ARAN.break = temporary,
    result);

exports.ReturnStatement = (node) => ARAN.cut.Return(
  (
    node.argument ?
    Visit.expression(node.argument) :
    ARAN.cut.primitive(void 0)));

exports.ThrowStatement = (node) => ARAN.cut.Throw(
  Visit.expression(node.argument));

exports.TryStatement = (node) => ARAN.cut.Try(
  ArrayLite.flatenMap(
    node.block.body,
    Visit.Statement),
  (
    node.handler ?
    ArrayLite.concat(
      Util.Declare(
        "let",
        node.handler.param,
        ARAN.build.read(
          Escape("error"))),
      ArrayLite.flatenMap(
        node.handler.body.body,
        Visit.Statement)) :
    []),
  (
    node.finalizer ?
    ArrayLite.flatenMap(
      node.finalizer.body,
      Visit.Statement) :
    []));

exports.WhileStatement = (node) => Util.Loop(
  Visit.expression(node.test),
  [],
  node.body,
  []);

exports.DoWhileStatement = (node) => ArrayLite.concat(
  Interim.Declare(
    "dowhile",
    ARAN.build.primitive(false)),
  Util.Loop(
    ARAN.build.conditional(
      Interim.read("dowhile"),
      Visit.expression(node.test),
      Interim.write(
        "dowhile",
        ARAN.cut.primitive(true))),
    [],
    node.body,
    []));

// for (let x; y; z) { ... }
//
// { 
//   let x;
//   while (y) { ... z; }
// }

exports.ForStatement = (node) => ARAN.cut.Block(
  ArrayLite.concat(
    (
      node.init ?
      (
        node.init.type === "VariableDeclaration" ?
        Util.Declaration(node.init) :
        ARAN.build.Statement(
          ARAN.cut.$drop(
            Visit.expression(node.init)))) :
      []),
    Util.Loop(
      (
        node.test ?
        Visit.expression(node.test) :
        ARAN.cut.primitive(true)),
      [],
      node.body,
      (
        node.update ?
        ARAN.build.Statement(
          ARAN.cut.$drop(
            Visit.expression(node.update))) :
        []))));

// for (let k in o) { ... }
//
// {
//   let k; 
//   var _o = o;
//   while (o) {
//     var _ks = keys(_o);
//     _o = getPrototypeOf(o);
//     var _i = 0;
//     while (_i < _ks.length) {
//       k = _ks[i];
//       i = i + 1;
//       ...
//     }
//   }
// }

exports.ForInStatement = (node) => ARAN.cut.Block(
  ArrayLite.concat(
    (
      node.left.type === "VariableDeclaration" ?
      Util.Declaration(node.left) :
      []),
    Interim.Declare(
      "object",
      Visit.expression(node.right)),
    ARAN.cut.While(
      Interim.read("object"),
      ArrayLite.concat(
        Interim.Declare(
          "keys",
          ARAN.cut.apply(
            ARAN.cut.$builtin("keys"),
            [
              Interim.read("object")])),
        ARAN.build.Statement(
          Interim.write(
            "object",
            ARAN.cut.apply(
              ARAN.cut.$builtin("getPrototypeOf"),
              [
                Interim.read("object")]))),
        Interim.Declare(
          "index",
          ARAN.cut.primitive(0)),
        Util.Loop(
          ARAN.cut.binary(
            "<",
            Interim.read("index"),
            ARAN.cut.get(
              Interim.read("keys"),
              ARAN.cut.primitive("length"))),
          ARAN.build.Statement(
            Util.write(
              (
                node.left.type === "VariableDeclaration" ?
                node.left.declarations[0].id :
                node.left),
              ARAN.cut.get(
                Interim.read("keys"),
                Interim.read("index")))),
          node.body,
          ARAN.build.Statement(
            Interim.write(
              "index",
              ARAN.cut.binary(
                "+",
                Interim.read("index"),
                ARAN.cut.primitive(1)))))))));

// The left member is executed at every loop:
// > for (o[(console.log("kaka"),"grunt")] in {foo:"bar", buz:"qux"}) console.log(o);
// kaka
// { foo: 5, grunt: 'foo' }
// kaka
// { foo: 5, grunt: 'buz' }
//
// for (x of xs) { ... }
//
// var _iterator = xs[Symbol.iterator]();
// while (!(_step = _iterator()).done) {
//   x = _step.value;
//   ...
// }

exports.ForOfStatement = (node) => ARAN.cut.Block(
  ArrayLite.concat(
    (
      node.left.type === "VariableDeclaration" ?
      Util.Declaration(node.left) :
      []),
    Interim.Declare(
      "iterator",
      ARAN.cut.invoke(
        Visit.expression(node.right),
        ARAN.cut.$builtin("iterator"),
        [])),
    Util.Loop(
      ARAN.cut.unary(
        "!",
        ARAN.cut.get(
          Interim.hoist(
            "step",
            ARAN.cut.invoke(
              Interim.read("iterator"),
              ARAN.cut.primitive("next"),
              [])),
          ARAN.cut.primitive("done"))),
      ARAN.build.Statement(
        Util.write(
          (
            node.left.type === "VariableDeclaration" ?
            node.left.declarations[0].id :
            node.left),
          ARAN.cut.get(
            Interim.read("step"),
            ARAN.cut.primitive("value")))),
      node.body,
      [])));

exports.DebuggerStatement = (node) => ARAN.build.Debugger();

exports.FunctionDeclaration = (node) => {
  ARAN.hoisted[ARAN.hoisted.length] = ARAN.cut.Declare(
    "var",
    node.id.name,
    Util.closure(node));
  return [];
};

exports.VariableDeclaration = (node) => Util.Declaration(node);

},{"../../escape.js":29,"../interim.js":32,"../util":37,"./index.js":45,"array-lite":11}]},{},[1]);
