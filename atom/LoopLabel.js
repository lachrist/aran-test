a: for (var i=0; i<10; i++) {
  if (i === 5)
    break a;
}
if (i !== 5)
  throw "LoopLabel";