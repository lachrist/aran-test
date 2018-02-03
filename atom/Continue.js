
(function () {
  var x = true;
  while (x) {
    x = false;
    continue;
    throw "Continue1";
  }
  var y = true;
  a : while (y) {
    y = false;
    continue a;
    throw "Continue2"
  }
} ());
