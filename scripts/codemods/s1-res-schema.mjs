// S1 (schema-dto-layout plan): hand-written response envelopes -> resSchema / paginatedResSchema.
//   z.object({ statusCode: z.number(), message: z.string(), data: X })   -> resSchema(X)
//   ... data: z.object({ results: z.array(Y), pagination: PaginationMetaSchema }) -> paginatedResSchema(Y)
// Only exact matches are rewritten (any key order); anything else is listed for a manual look.
// Usage: node scripts/codemods/s1-res-schema.mjs [--dry]
import fs from 'fs'
import path from 'path'
import ts from 'typescript'

const DRY = process.argv.includes('--dry')
const ROOT = 'src'
const files = []
const walk = (d) =>
  fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
    const p = path.join(d, e.name)
    if (e.isDirectory()) walk(p)
    else if (p.endsWith('.ts') && !p.endsWith('.spec.ts')) files.push(p)
  })
walk(ROOT)

const SKIP = new Set(['src/shared/utils/res-schema.ts', 'src/shared/utils/pagination.ts'].map(path.normalize))
const isZCall = (n, name) =>
  ts.isCallExpression(n) &&
  ts.isPropertyAccessExpression(n.expression) &&
  ts.isIdentifier(n.expression.expression) &&
  n.expression.expression.text === 'z' &&
  n.expression.name.text === name
const objProps = (call) => {
  const arg = call.arguments[0]
  if (call.arguments.length !== 1 || !arg || !ts.isObjectLiteralExpression(arg)) return null
  const map = {}
  for (const p of arg.properties) {
    if (!ts.isPropertyAssignment(p) || !(ts.isIdentifier(p.name) || ts.isStringLiteral(p.name))) return null
    map[p.name.text] = p.initializer
  }
  return map
}

// PaginationMetaSchema, by name or written out field for field
const INLINE_META = 'z.object({current:z.number(),pageSize:z.number(),totalPage:z.number(),totalItem:z.number()})'
const isPaginationMeta = (n) => {
  const t = n.getText().replace(/\s|,(?=\s*[})])/g, '')
  return t === 'PaginationMetaSchema' || t === INLINE_META
}

const report = { rewritten: {}, skipped: [] }
for (const file of files) {
  if (SKIP.has(path.normalize(file))) continue
  const src = fs.readFileSync(file, 'utf8')
  if (!src.includes('statusCode')) continue
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true)
  const edits = []
  let usedRes = false
  let usedPage = false
  const visit = (n) => {
    if (isZCall(n, 'object')) {
      const m = objProps(n)
      if (m && 'statusCode' in m) {
        const keys = Object.keys(m).sort().join(',')
        const ok =
          keys === 'data,message,statusCode' &&
          m.statusCode.getText(sf) === 'z.number()' &&
          m.message.getText(sf) === 'z.string()'
        if (!ok) {
          const line = sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1
          report.skipped.push(`${file}:${line} keys=${Object.keys(m).join(',')}`)
        } else {
          const data = m.data
          let text = null
          if (isZCall(data, 'object')) {
            const d = objProps(data)
            if (
              d &&
              Object.keys(d).sort().join(',') === 'pagination,results' &&
              isPaginationMeta(d.pagination) &&
              isZCall(d.results, 'array') &&
              d.results.arguments.length === 1
            ) {
              text = `paginatedResSchema(${d.results.arguments[0].getText(sf)})`
              usedPage = true
            }
          }
          if (!text) {
            text = `resSchema(${data.getText(sf)})`
            usedRes = true
          }
          edits.push({ start: n.getStart(sf), end: n.getEnd(), text })
          return // nested envelopes inside data are left as they are
        }
      }
    }
    ts.forEachChild(n, visit)
  }
  visit(sf)
  if (!edits.length) continue
  let out = src
  for (const e of edits.sort((a, b) => b.start - a.start)) out = out.slice(0, e.start) + e.text + out.slice(e.end)
  const imports = []
  if (usedRes && !/import \{[^}]*\bresSchema\b/.test(out)) imports.push(`import { resSchema } from '@/shared/utils/res-schema'`)
  if (usedPage && !/import \{[^}]*\bpaginatedResSchema\b/.test(out))
    imports.push(`import { paginatedResSchema } from '@/shared/utils/pagination'`)
  if (imports.length) out = imports.join('\n') + '\n' + out
  report.rewritten[file] = edits.length
  if (!DRY) fs.writeFileSync(file, out)
}
const n = Object.values(report.rewritten).reduce((a, b) => a + b, 0)
console.log(`rewritten ${n} envelopes in ${Object.keys(report.rewritten).length} files`)
console.log(`skipped ${report.skipped.length}:\n  ` + report.skipped.join('\n  '))
