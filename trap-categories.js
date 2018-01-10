exports.producers = [
  "read",
  "builtin",
  "this",
  "arguments",
  "error",
  "primitive",
  "regexp",
  "closure",
  "discard"
];

exports.consumers = [
  "test",
  "throw",
  "return",
  "eval",
  "with",
  "write",
  "declare"
];

exports.informers = [
  "enter",
  "leave",
  "program",
  "arrival",
  "label",
  "continue",
  "break",
  "copy",
  "drop"
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