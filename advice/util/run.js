
module.exports = (join) {
  return (script1) => {
    const script2 = join(script1, null);
    try {
      return {script:script2, value:};
    }
  } 
};
