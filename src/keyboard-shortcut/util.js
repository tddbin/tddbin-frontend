var util = {
  toPrintableKeys: function(keys, map) {
    return keys.map(function(key) {
      return map[key] || key;
    });
  }
};

module.exports = util;
