
(function () {
  var f = function (x, ...xs) {
    if (x !== "foo")
      throw "Rest1";
    if (xs[0] !== "bar")
      throw "Rest2";
    if (xs[1] !== "qux")
      throw "Rest3";
  };
  f("foo", "bar", "qux");
} ());
