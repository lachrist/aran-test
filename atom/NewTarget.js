
(function () {
  function f1 () {
    if (new.target !== void 0)
      throw "NewTarget1";
  }
  f1();
  function f2 () {
    if (new.target === void 0)
      throw "NewTarget2";
  };
  new f2();
} ());
