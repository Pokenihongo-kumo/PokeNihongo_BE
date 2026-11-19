// Phase 5 follow-up to p5-envelope-to-controller.mjs: a service method that
// used to return { data, message } now returns the data itself, so callers in
// other modules reading `.data` no longer compile. This runs tsc and removes the
// `.data` / `?.data` that each "Property 'data' does not exist" error points at.
// Run it again until nothing is left (a chain like r.data.data shows one at a time).
//
// Usage: node scripts/codemods/p5-drop-envelope-data.mjs [--dry]
import { execSync } from 'child_process'
import fs from 'fs'

const DRY = process.argv.includes('--dry')
let out = ''
try {
  execSync('npx tsc --noEmit -p tsconfig.json', { encoding: 'utf8', stdio: 'pipe' })
} catch (e) {
  out = e.stdout
}
const re = /^(.+?)\((\d+),(\d+)\): error TS2339: Property 'data' does not exist on type/gm
const byFile = new Map()
for (const [, file, line, col] of out.matchAll(re)) {
  if (!byFile.has(file)) byFile.set(file, [])
  byFile.get(file).push({ line: +line, col: +col })
}
let fixed = 0
for (const [file, spots] of byFile) {
  const lines = fs.readFileSync(file, 'utf8').split('\n')
  // right to left on a line keeps earlier columns valid
  for (const { line, col } of spots.sort((a, b) => b.line - a.line || b.col - a.col)) {
    const text = lines[line - 1]
    const at = col - 1
    if (text.slice(at, at + 4) !== 'data') {
      console.log(`skip ${file}:${line}:${col} (${text.trim()})`)
      continue
    }
    let start = at
    if (text[start - 1] === '.') start--
    else continue
    if (text[start - 1] === '?') start--
    lines[line - 1] = text.slice(0, start) + text.slice(at + 4)
    fixed++
  }
  if (!DRY) fs.writeFileSync(file, lines.join('\n'))
}
console.log(`removed ${fixed} .data in ${byFile.size} files`)
