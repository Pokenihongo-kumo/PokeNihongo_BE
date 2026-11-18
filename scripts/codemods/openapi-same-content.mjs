// Compares two OpenAPI JSON files ignoring key order and the order of `required`
// lists: a layout batch may reorder fields but must not change content.
// Usage: node scripts/codemods/openapi-same-content.mjs a.json b.json
import fs from 'fs'
const canon = (v, key) =>
  Array.isArray(v)
    ? (key === 'required' ? [...v].sort() : v).map((x) => canon(x))
    : v && typeof v === 'object'
      ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, canon(v[k], k)]))
      : v
const [a, b] = process.argv.slice(2).map((f) => JSON.stringify(canon(JSON.parse(fs.readFileSync(f, 'utf8')))))
console.log(a === b ? 'same content' : 'CONTENT DIFFERS')
process.exit(a === b ? 0 : 1)
