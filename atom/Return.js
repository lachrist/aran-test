
(function () {
  function f () {
    return;
    throw new Error("Return1");
  }
  if (f() !== undefined)
    throw new Error("Return2");
} ());
