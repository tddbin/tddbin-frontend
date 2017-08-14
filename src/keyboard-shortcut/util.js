export const toPrintableKeys = function(keys, map) {
  return keys.map(key => map[key] || key);
};
