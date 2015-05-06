export function decode(queryString) {
  const parts = queryString.split('&');
  return parts.reduce(function(query, part) {
    const [key, value] = part.split('=');
    query[key] = decodeURIComponent(value);
    return query;
  }, {});
}

export function encode(obj) {
  let str = [];
  for (let key in obj) {
    str.push(`${key}=${encodeURIComponent(obj[key])}`);
  }
  return str.join('&');
}
