// S3b (schema-dto-layout plan): HTTP schemas move from entities/ to dto/<feature>.zod-dto.ts.
//
// HTTP schema: an exported const named ...Body|Query|Params|Res|Response|Request(Schema),
// Create|Update|Upsert...Schema, or GetParams|GetQuery...Schema. Its inferred types
// (`type X = z.infer<typeof XSchema>`) move with it; so does anything left in the entity
// that uses a moved item (no entity -> dto import), and private helpers only moved items use.
// The moves go through TypeScript's "Move to file" refactor, so every import in the
// project follows. Afterwards each dto file is ordered so a value is declared before use.
//
// Usage: node scripts/codemods/s3b-move-http-schemas.mjs [--only <entity path substring>] [--dry]
import fs from 'fs'
import path from 'path'
import ts from 'typescript'

const args = process.argv.slice(2)
const ONLY = args.includes('--only') ? args[args.indexOf('--only') + 1] : null
const DRY = args.includes('--dry')

const HTTP = [
  /(Body|Query|Params?|Res|Response|Request)(Schema)?$/,
  /^(Create|Update|Upsert)\w*Schema$/,
  /^Get(Params|Query)\w*Schema$/
]
// Domain names that only look like HTTP ones (a daily request is a quest, not a request body)
const DOMAIN = /^(User)?DailyRequest(Schema)?$/
const isHttpName = (n) => !DOMAIN.test(n) && HTTP.some((r) => r.test(n))

// ---- language service over the project, with in-memory files ----
const cfg = ts.parseJsonConfigFileContent(ts.readConfigFile('tsconfig.json', ts.sys.readFile).config, ts.sys, '.')
const norm = (f) => path.resolve(f).split(path.sep).join('/')
const files = new Map() // path -> { text, version }
for (const f of cfg.fileNames) files.set(norm(f), { text: fs.readFileSync(f, 'utf8'), version: 0 })
const touched = new Set()
const setText = (f, text) => {
  const cur = files.get(f)
  files.set(f, { text, version: (cur?.version ?? 0) + 1 })
  touched.add(f)
}
const host = {
  getScriptFileNames: () => [...files.keys()],
  getScriptVersion: (f) => String(files.get(norm(f))?.version ?? 0),
  getScriptSnapshot: (f) => {
    const e = files.get(norm(f))
    if (e) return ts.ScriptSnapshot.fromString(e.text)
    return fs.existsSync(f) ? ts.ScriptSnapshot.fromString(fs.readFileSync(f, 'utf8')) : undefined
  },
  getCurrentDirectory: () => process.cwd(),
  getCompilationSettings: () => cfg.options,
  getDefaultLibFileName: ts.getDefaultLibFilePath,
  fileExists: (f) => files.has(norm(f)) || ts.sys.fileExists(f),
  readFile: (f) => files.get(norm(f))?.text ?? ts.sys.readFile(f),
  readDirectory: ts.sys.readDirectory,
  directoryExists: ts.sys.directoryExists,
  getDirectories: ts.sys.getDirectories
}
const ls = ts.createLanguageService(host, ts.createDocumentRegistry())
const formatOptions = {
  ...ts.getDefaultFormatCodeSettings('\n'),
  indentSize: 2,
  tabSize: 2,
  convertTabsToSpaces: true,
  semicolons: ts.SemicolonPreference.Remove
}
const preferences = {
  quotePreference: 'single',
  importModuleSpecifierPreference: 'non-relative',
  allowTextChangesInNewFiles: true,
  providePrefixAndSuffixTextForRename: false
}
const applyEdits = (fileEdits) => {
  // One refactor may list several entries for the same file, all against its old text
  const byFile = new Map()
  for (const fe of fileEdits) {
    const f = norm(fe.fileName)
    byFile.set(f, [...(byFile.get(f) || []), ...fe.textChanges])
  }
  for (const [f, changes] of byFile) {
    let text = files.get(f)?.text ?? ''
    // stable: inserts at the same position keep their order
    const sorted = changes.map((c, i) => ({ c, i })).sort((a, b) => b.c.span.start - a.c.span.start || b.i - a.i)
    for (const { c } of sorted) text = text.slice(0, c.span.start) + c.newText + text.slice(c.span.start + c.span.length)
    setText(f, text)
  }
}
const parse = (f) => ts.createSourceFile(f, files.get(f).text, ts.ScriptTarget.Latest, true)

// ---- statement helpers ----
const declNames = (st) => {
  if (ts.isVariableStatement(st)) return st.declarationList.declarations.map((d) => d.name.getText())
  if ((ts.isTypeAliasDeclaration(st) || ts.isInterfaceDeclaration(st) || ts.isClassDeclaration(st) || ts.isFunctionDeclaration(st) || ts.isEnumDeclaration(st)) && st.name)
    return [st.name.text]
  return []
}
const isExported = (st) => st.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
const refsOf = (st, names) => {
  const out = new Set()
  const own = new Set(declNames(st))
  const visit = (n) => {
    if (ts.isIdentifier(n) && names.has(n.text) && !own.has(n.text)) {
      const p = n.parent
      const member = (ts.isPropertyAccessExpression(p) && p.name === n) || (ts.isQualifiedName(p) && p.right === n) || ((ts.isPropertyAssignment(p) || ts.isPropertySignature(p)) && p.name === n)
      if (!member) out.add(n.text)
    }
    ts.forEachChild(n, visit)
  }
  ts.forEachChild(st, visit)
  return out
}

function planMoves(sf) {
  const stmts = sf.statements.filter((st) => declNames(st).length)
  const byName = new Map()
  stmts.forEach((st) => declNames(st).forEach((n) => byName.set(n, st)))
  const all = new Set(byName.keys())
  const deps = new Map(stmts.map((st) => [st, refsOf(st, all)]))
  const move = new Set()
  for (const st of stmts) {
    if (!isExported(st)) continue
    if (ts.isVariableStatement(st) && declNames(st).some(isHttpName)) move.add(st)
  }
  // fixpoint: types of moved schemas, entity items using moved items, helpers only moved items use
  let grew = true
  while (grew) {
    grew = false
    for (const st of stmts) {
      if (move.has(st)) continue
      const usesMoved = [...deps.get(st)].some((n) => move.has(byName.get(n)))
      if (usesMoved) {
        move.add(st)
        grew = true
      }
    }
    for (const st of stmts) {
      if (move.has(st) || isExported(st)) continue
      const users = stmts.filter((o) => o !== st && declNames(st).some((n) => deps.get(o).has(n)))
      if (users.length && users.every((u) => move.has(u))) {
        move.add(st)
        grew = true
      }
    }
  }
  return { stmts, move }
}

function dtoTarget(entityFile) {
  const dir = path.posix.join(path.posix.dirname(entityFile), '..', 'dto')
  // `user-gacha-pityentity.ts` (no dot) names the feature too
  const base = path.posix.basename(entityFile).replace(/\.?(entity|entities)\.ts$/, '').replace(/\.ts$/, '')
  const exact = path.posix.join(dir, `${base}.zod-dto.ts`)
  if (files.has(exact)) return exact
  const existing = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.zod-dto.ts')) : []
  const siblings = fs.readdirSync(path.posix.dirname(entityFile)).filter((f) => f.endsWith('.ts'))
  if (existing.length === 1 && siblings.length === 1) return path.posix.join(dir, existing[0])
  return exact
}

// ---- run ----
const entityFiles = [...files.keys()].filter((f) => /\/src\/modules\/[^/]+\/entities\/[^/]+\.ts$/.test(f) && (!ONLY || f.includes(ONLY)))
const report = []
const failed = []
for (const ef of entityFiles) {
  // A failing refactor leaves this entity as it was; the others go on
  const before = new Map([...files].map(([f, e]) => [f, e.text]))
  const touchedBefore = new Set(touched)
  try {
    moveEntity(ef)
  } catch (e) {
    for (const [f, e2] of [...files]) {
      if (!before.has(f)) files.delete(f)
      else if (before.get(f) !== e2.text) setText(f, before.get(f))
    }
    touched.clear()
    touchedBefore.forEach((f) => touched.add(f))
    failed.push(`${path.posix.relative(norm('.'), ef)}: ${String(e.message).split(/\r?\n/)[0]}`)
  }
  process.stderr.write('.')
}
function moveEntity(ef) {
  const target = dtoTarget(ef)
  const plan = planMoves(parse(ef))
  if (!plan.move.size) return
  if (!files.has(target)) setText(target, '')
  const moveNames = new Set([...plan.move].flatMap(declNames))
  // TypeScript's refactor fails ("Changes overlap") when the target already imports
  // what is moved into it: drop the target's imports of the entity, restore the
  // names still exported there afterwards.
  const entityRel = path.posix.relative(path.posix.dirname(target), ef).replace(/\.ts$/, '')
  const restored = []
  {
    const tsf = parse(target)
    let text = files.get(target).text
    for (const st of [...tsf.statements].reverse()) {
      if (!ts.isImportDeclaration(st)) continue
      const spec = st.moduleSpecifier.text
      const resolved = spec.startsWith('.') ? path.posix.join(path.posix.dirname(target), spec) : spec.replace(/^@\//, norm('src') + '/')
      if (resolved + '.ts' !== ef) continue
      st.importClause?.namedBindings?.elements?.forEach((e) => restored.push(e.getText(tsf)))
      text = text.slice(0, st.getFullStart()) + text.slice(st.getEnd())
    }
    setText(target, text)
  }
  // Move one contiguous run at a time, re-reading the entity after each move
  let moved = 0
  for (;;) {
    const sf = parse(ef)
    const order = sf.statements
    const move = new Set(order.filter((s) => declNames(s).some((n) => moveNames.has(n))))
    if (!move.size) break
    let i = order.findIndex((s) => move.has(s))
    let j = i
    while (j + 1 < order.length && move.has(order[j + 1])) j++
    const range = { pos: order[i].getStart(sf), end: order[j].getEnd() }
    const edits = ls.getEditsForRefactor(ef, formatOptions, range, 'Move to file', 'Move to file', preferences, { targetFile: target })
    if (!edits) throw new Error(`no Move to file edit for ${ef} ${declNames(order[i])}`)
    applyEdits(edits.edits)
    moved += j - i + 1
    if (moved > 2000) throw new Error('runaway')
  }
  const keep = restored.filter((n) => !moveNames.has(n.split(/\s+as\s+/)[0]))
  if (keep.length) {
    const text = files.get(target).text
    setText(target, `import { ${keep.join(', ')} } from '${entityRel.startsWith('.') ? entityRel : './' + entityRel}'\n` + text)
  }
  report.push(`${path.posix.relative(norm('.'), ef)} -> ${path.posix.basename(target)}: ${moved} statements`)
}

// ---- order dto files: declare values before use (stable) ----
const valueRefs = (st, names) => {
  const out = new Set()
  const visit = (n, inType) => {
    if (ts.isTypeNode(n) && !ts.isTypeQueryNode(n) && !ts.isExpressionWithTypeArguments(n)) inType = true
    if (ts.isTypeAliasDeclaration(n) || ts.isInterfaceDeclaration(n)) return
    if (!inType && ts.isIdentifier(n) && names.has(n.text)) out.add(n.text)
    ts.forEachChild(n, (c) => visit(c, inType))
  }
  ts.forEachChild(st, (c) => visit(c, false))
  return out
}
for (const f of touched) {
  if (!/\/dto\/[^/]+\.zod-dto\.ts$/.test(f)) continue
  const sf = parse(f)
  const head = sf.statements.filter((s) => ts.isImportDeclaration(s) || (ts.isExpressionStatement(s) && /^(extendZodWithOpenApi|patchNestJsSwagger)\(/.test(s.getText(sf))))
  const body = sf.statements.filter((s) => !head.includes(s))
  const names = new Map()
  body.forEach((s) => declNames(s).forEach((n) => names.set(n, s)))
  const nameSet = new Set(names.keys())
  // `type X = z.infer<typeof XSchema>` and `class XDTO extends createZodDto(XSchema)` sit
  // right after their schema: schema, type, DTO (as in the level sample)
  const ownerOf = (s) => {
    let m
    if (ts.isTypeAliasDeclaration(s) && (m = s.type.getText(sf).match(/^z\.(?:infer|input|output)<\s*typeof (\w+)\s*>$/))) return names.get(m[1])
    if (ts.isClassDeclaration(s) && (m = s.heritageClauses?.[0]?.getText(sf).match(/^extends createZodDto\(\s*(\w+)\s*\)$/))) return names.get(m[1])
    return undefined
  }
  const attached = new Map()
  for (const s of body) {
    const o = ownerOf(s)
    if (o && o !== s) attached.set(o, [...(attached.get(o) || []), s])
  }
  const isAttached = new Set([...attached.values()].flat())
  const placed = new Set()
  const out = []
  const place = (s, stack = new Set()) => {
    if (placed.has(s) || stack.has(s)) return
    stack.add(s)
    for (const n of valueRefs(s, nameSet)) if (!declNames(s).includes(n)) place(names.get(n), stack)
    placed.add(s)
    out.push(s)
    const att = (attached.get(s) || []).sort((a, b) => Number(ts.isClassDeclaration(a)) - Number(ts.isClassDeclaration(b)))
    for (const a of att) place(a, stack)
  }
  body.filter((s) => !isAttached.has(s)).forEach((s) => place(s))
  body.forEach((s) => place(s))
  const text = sf.text
  // keep each statement's leading comments with it
  const chunk = (s) => text.slice(s.getFullStart(), s.getEnd()).replace(/^\s*\n/, '\n')
  let newText = head.map((s) => text.slice(s.getFullStart(), s.getEnd())).join('').trim() + '\n'
  if (/\.openapi\(/.test(text) && !head.some((s) => /extendZodWithOpenApi\(/.test(s.getText(sf)))) {
    newText += "import { extendZodWithOpenApi } from '@anatine/zod-openapi'\nimport { z } from 'zod'\nextendZodWithOpenApi(z)\n"
  }
  newText += out.map(chunk).join('\n') + '\n'
  setText(f, newText)
}

// ---- import paths: zod from 'zod'; same-module imports relative (as in the level sample) ----
for (const f of touched) {
  let text = files.get(f).text
  text = text.replace(/from 'zod\/[^']*'/g, "from 'zod'")
  // When every name of an import moves, the refactor rewrites the path against the
  // project root ('./entities/src/modules/x/dto/x.zod-dto'): make it '@/modules/...'
  text = text.replace(/from '\.[^']*?\/src\/(modules\/[^']+)'/g, "from '@/$1'")
  const seen = new Set()
  text = text
    .split('\n')
    .filter((l) => !/^import .* from '[^']+'$/.test(l) || (seen.has(l) ? false : (seen.add(l), true)))
    .join('\n')
  const m = f.match(/\/src\/modules\/([^/]+)\//)
  if (m) {
    text = text.replace(new RegExp(`from '@/modules/${m[1]}/([^']+)'`, 'g'), (_, rest) => {
      let rel = path.posix.relative(path.posix.dirname(f), norm(`src/modules/${m[1]}/${rest}`))
      if (!rel.startsWith('.')) rel = './' + rel
      return `from '${rel}'`
    })
  }
  // a moved type that used another moved name can leave an import of the file itself
  const self = path.posix.basename(f).replace(/\.ts$/, '')
  text = text.replace(new RegExp(`^import (type )?\\{[^}]*\\} from '\\./${self.replace(/\./g, '\\.')}'\\n`, 'gm'), '')
  setText(f, text)
}

// ---- write ----
console.log(report.join('\n'))
console.log(`${report.length} entity files, ${touched.size} files changed`)
if (failed.length) console.log('left in entities/ (refactor failed):\n  ' + failed.join('\n  '))
if (!DRY) for (const f of touched) fs.writeFileSync(f, files.get(f).text)
