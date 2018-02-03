
exports.producers = [
  "copy",
  "read",
  "builtin",
  "this",
  "newtarget",
  "arguments",
  "catch",
  "primitive",
  "regexp",
  "closure",
  "discard"
];

exports.consumers = [
  "drop",
  "terminate",
  "test",
  "throw",
  "return",
  "eval",
  "with",
  "write",
  "declare"
];

exports.informers = [
  "try",
  "finally",
  "callee",
  "leave",
  "program",
  "block",
  "label",
  "break"
];

exports.combiners = [
  "object",
  "array",
  "binary",
  "unary",
  "apply",
  "invoke",
  "construct",
  "get",
  "set",
  "delete",
  "enumerate"
];