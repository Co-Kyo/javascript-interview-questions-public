Array.prototype.myFlat = function (depth = 1) {
  if (depth !== depth) depth = 0;
  if (depth < 0) depth = 0;

  function _flatten(arr, d, result, startIdx) {
    let writeIdx = startIdx;

    for (let i = 0; i < arr.length; i++) {
      if (!(i in arr)) {
        writeIdx++;
        result.length = writeIdx;
        continue;
      }

      const item = arr[i];

      if (Array.isArray(item) && d > 0) {
        const count = _flatten(item, d - 1, result, writeIdx);
        writeIdx += count;
      } else {
        result[writeIdx] = item;
        writeIdx++;
      }
    }

    return writeIdx - startIdx;
  }

  const result = [];
  _flatten(this, depth, result, 0);
  return result;
};
