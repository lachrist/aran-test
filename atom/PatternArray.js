
(function () {
  var [x1,x2] = ["foo1", "bar1"];
  if (x1 !== "foo1")
    throw "PatternArray1";
  if (x2 !== "bar1")
    throw "PatternArray2";
  var [y1, y2, ... ys] = ["foo2", "bar2", "buz2", "qux2"];
  if (y1 !== "foo2")
    throw "PatternArray3";
  if (y2 !== "bar2")
    throw "PatternArray4";
  if (ys[0] !== "buz2")
    throw "PatternArray5";
  if (ys[1] !== "qux2")
    throw "PatternArray6";
} ());
