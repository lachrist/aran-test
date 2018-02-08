
(function () {
  with ({a:1}) {
    if (a!==1)
      throw new Error("With1");
    a = 2;
  }
  if (a !== 2)
    throw new Error("With2");
} ());
