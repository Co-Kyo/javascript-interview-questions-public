function get(obj, path, defaultValue = undefined) {
  const keys = parsePath(path);

  let current = obj;
  for (const key of keys) {
    if (current == null) {
      return defaultValue;
    }
    current = current[key];
  }

  return current === undefined ? defaultValue : current;
}

function parsePath(path) {
  if (Array.isArray(path)) {
    return path.map(String);
  }

  const tokens = [];
  const regex = /\[(\d+)\]|\[(['"])(.*?)\2\]|([^.\[\]]+)/g;
  let match;

  while ((match = regex.exec(path)) !== null) {
    if (match[1] !== undefined) {
      tokens.push(match[1]);
    } else if (match[3] !== undefined) {
      tokens.push(match[3]);
    } else if (match[4] !== undefined) {
      tokens.push(match[4]);
    }
  }

  return tokens;
}

module.exports = { get, parsePath };
