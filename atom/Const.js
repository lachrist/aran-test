
(function () {
  {
    const c = "foo";
    try {
      c = "bar";
    } catch (_) {
    }
    if (c !== "foo")
      throw "Const1";
  }
  if (typeof c !== "undefined")
    throw "Const2";
} ());
