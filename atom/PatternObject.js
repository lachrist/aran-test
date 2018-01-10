
(function () {
  var {x, y:z} = {x:"foo", y:"bar"};
  if (x !== "foo")
    throw "PatternObject1";
  if (z !== "bar")
    throw "PatternObject2";
} ());
