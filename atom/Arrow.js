
(function () {
  var a1 = () => "foo";
  var a2 = () => { return "bar" };
  if (a1() !== "foo")
    throw "Arrow1";
  if (a2() !== "bar")
    throw "Arrow2";
} ());
