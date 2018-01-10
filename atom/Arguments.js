
(function () {
  function f () {
    if (arguments[0] !== "foo")
      throw "Arguments1";
    if (arguments[1] !== "bar")
      throw "Arguments2";
    if (arguments.length !== 2)
      throw "Arguments3";
  };
  f("foo", "bar");
} ());