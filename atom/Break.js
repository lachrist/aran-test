
(function () {
  a:{
    break a;
    throw "Break1";
  }
  while (true) {
    break;
    throw "Break2"
  }
} ());
