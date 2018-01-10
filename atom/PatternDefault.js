
(function () {
  var [x="foo", y="bar"] = [void 0, null];
  if (x !== "foo")
    throw "PatternDefault1";
  if (y !== null)
    throw "PatternDefault2";
} ());
