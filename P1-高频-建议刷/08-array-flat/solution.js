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

Array.prototype.myFlatReduce = function (depth = 1) {
  if (depth !== depth) depth = 0;
  if (depth < 0) depth = 0;

  return this.reduce((acc, item) => {
    if (Array.isArray(item) && depth > 0) {
      acc.push(...item.myFlatReduce(depth - 1));
    } else {
      acc.push(item);
    }
    return acc;
  }, []);
};

Array.prototype.myFlatIterative = function (depth = 1) {
  if (depth !== depth) depth = 0;
  if (depth < 0) depth = 0;

  const stack = [[this, 0, depth]];
  const result = [];

  while (stack.length > 0) {
    const top = stack[stack.length - 1];
    const [arr, idx, d] = top;

    if (idx >= arr.length) {
      stack.pop();
      continue;
    }

    top[1]++;

    if (!(idx in arr)) {
      result.length = result.length + 1;
      continue;
    }

    const item = arr[idx];

    if (Array.isArray(item) && d > 0) {
      stack.push([item, 0, d - 1]);
    } else {
      result.push(item);
    }
  }

  return result;
};
