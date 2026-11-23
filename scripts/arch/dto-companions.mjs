#!/usr/bin/env node
// DTO layout check (backend-convention section 2): in every dto file a schema's
// inferred type (z.infer<typeof XSchema>) and DTO class (createZodDto(XSchema))
// sit right below the schema (blank lines and comments between are fine).
// A schema that has a DTO class also has its type.
// Exits 1 and lists each one that does not.
// Usage: node scripts/arch/dto-companions.mjs  (npm run arch:dto)
import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'
const require = createRequire(import.meta.url)
const ts = require('typescript')
const walk = (d) =>
  fs.readdirSync(d).flatMap((n) => {
    const p = path.join(d, n)
    return fs.statSync(p).isDirectory()
      ? walk(p)
      : /[\\/]dto[\\/].*\.ts$/.test(p) && !p.endsWith('.spec.ts')
        ? [p]
        : []
  })
const files = walk('src/modules')
let bad = 0
let total = 0
let untyped = 0
const report = []
for (const f of files) {
  const text = fs.readFileSync(f, 'utf8')
  const sf = ts.createSourceFile(f, text, ts.ScriptTarget.Latest, true)
  const st = sf.statements
  // companions of a schema: statements referencing `typeof X` in z.infer or createZodDto(X)
  const owner = (s) => {
    const t = s.getText(sf)
    let m = t.match(
      /^export type \w+\s*=\s*z\.(?:infer|input|output)<\s*typeof (\w+)\s*>\s*;?$/s
    )
    if (m) return m[1]
    m = t.match(/^export class \w+ extends createZodDto\(\s*(\w+)\s*\)\s*\{\s*\}$/s)
    if (m) return m[1]
    return null
  }
  const schemaIdx = new Map()
  st.forEach((s, i) => {
    if (ts.isVariableStatement(s) && s.declarationList.declarations.length === 1) {
      const n = s.declarationList.declarations[0].name.getText(sf)
      schemaIdx.set(n, i)
    }
  })
  st.forEach((s, i) => {
    const o = owner(s)
    if (!o || !schemaIdx.has(o)) return
    total++
    const si = schemaIdx.get(o)
    // allowed: right after the schema, or after its other companion
    let j = si + 1
    while (j < st.length && owner(st[j]) === o && j !== i) j++
    if (j !== i) {
      bad++
      report.push(
        `${f.split(path.sep).join('/')}: ${s.getText(sf).split('\n')[0].slice(0, 70)}  (schema ${o} at stmt ${si}, this at ${i})`
      )
    }
  })
  // a schema with a DTO class also has its inferred type
  const typed = new Set(
    st.flatMap((s) => {
      const m = s
        .getText(sf)
        .match(/^export type \w+\s*=\s*z\.(?:infer|input|output)<\s*typeof (\w+)\s*>/s)
      return m ? [m[1]] : []
    })
  )
  for (const s of st) {
    const m = s
      .getText(sf)
      .match(/^export class (\w+) extends createZodDto\(\s*(\w+)\s*\)\s*\{\s*\}$/s)
    if (m && !typed.has(m[2])) {
      untyped++
      report.push(
        `${f.split(path.sep).join('/')}: ${m[1]} has no z.infer type of ${m[2]}`
      )
    }
  }
}
if (report.length) console.log(report.join('\n'))
console.log(
  `DTO layout: ${files.length} files, ${total} types/DTOs, ${bad} not right below their schema, ${untyped} DTOs without a type`
)
process.exit(bad || untyped ? 1 : 0)
