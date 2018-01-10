
(function () {
  {
    let l = "foo";
    l = "bar"
    if (l !== "bar")
      throw "Let1";
  }
  if (typeof l !== "undefined")
    throw "Let2";
} ());
