
(function () {
  if (!true)
    throw "Unary1";
  var o = {a:1,b:2};
  delete o.a;
  if ("a" in o)
    throw "Unary2";
  delete o["b"]
  if ("b" in o)
    throw "Unary3";
} ());
