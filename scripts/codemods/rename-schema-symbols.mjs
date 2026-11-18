// Project-wide renames for the schema-dto-layout plan, through the TypeScript
// language service (every reference and import follows the declaration).
//
//   --mode s2    exported `const XType = <zod schema>` -> `XSchema` (value meaning only;
//                a `type XType = z.infer<typeof XType>` twin keeps its name for now)
//   --mode s3a   exported `type XType = z.infer|input|output<...>` -> `X`
//
// A const and a type alias with the same name are one symbol in TypeScript, so each
// reference is classified as a value or a type use and only the asked meaning is
// renamed; an import that brings in both meanings gets both names.
// A rename whose new name is already declared or imported in a touched file is
// skipped and listed. Usage: node scripts/codemods/rename-schema-symbols.mjs --mode s2 [--dry]
import fs from 'fs'
import path from 'path'
import ts from 'typescript'

const args = process.argv.slice(2)
const MODE = args[args.indexOf('--mode') + 1]
const DRY = args.includes('--dry')
if (!['s2', 's3a', 'alias-prisma'].includes(MODE)) throw new Error('--mode s2|s3a|alias-prisma')

// --mode alias-prisma --files a.ts,b.ts --names Languages,Meaning
//   `import { Languages } from '@prisma/client'` -> `import { Languages as PrismaLanguages }`
//   and every use in that file, so the zod-inferred type can take the plain name (run before s3a)
if (MODE === 'alias-prisma') {
  const files = args[args.indexOf('--files') + 1].split(',')
  const names = new Set(args[args.indexOf('--names') + 1].split(','))
  for (const file of files) {
    let s = fs.readFileSync(file, 'utf8')
    const sf = ts.createSourceFile(file, s, ts.ScriptTarget.Latest, true)
    const aliased = new Set()
    for (const st of sf.statements) {
      if (!ts.isImportDeclaration(st) || st.moduleSpecifier.text !== '@prisma/client') continue
      st.importClause?.namedBindings?.elements?.forEach((e) => {
        if (!e.propertyName && names.has(e.name.text)) aliased.add(e.name.text)
      })
    }
    const edits = []
    const visit = (n) => {
      if (ts.isIdentifier(n) && aliased.has(n.text)) {
        const p = n.parent
        const member =
          (ts.isPropertyAccessExpression(p) && p.name === n) ||
          (ts.isQualifiedName(p) && p.right === n) ||
          ((ts.isPropertyAssignment(p) || ts.isPropertySignature(p) || ts.isMethodDeclaration(p)) && p.name === n)
        if (!member)
          edits.push({ start: n.getStart(sf), end: n.getEnd(), text: ts.isImportSpecifier(p) ? `${n.text} as Prisma${n.text}` : `Prisma${n.text}` })
      }
      ts.forEachChild(n, visit)
    }
    visit(sf)
    for (const e of edits.sort((a, b) => b.start - a.start)) s = s.slice(0, e.start) + e.text + s.slice(e.end)
    if (!DRY) fs.writeFileSync(file, s)
    console.log(`${file}: ${[...aliased].join(', ')} (${edits.length} uses)`)
  }
  process.exit(0)
}

const cfgPath = ts.findConfigFile('.', ts.sys.fileExists, 'tsconfig.json')
const cfg = ts.parseJsonConfigFileContent(ts.readConfigFile(cfgPath, ts.sys.readFile).config, ts.sys, '.')
const fileNames = cfg.fileNames.map((f) => path.resolve(f))
const versions = new Map(fileNames.map((f) => [f, '0']))
const host = {
  getScriptFileNames: () => fileNames,
  getScriptVersion: (f) => versions.get(f) ?? '0',
  getScriptSnapshot: (f) => (fs.existsSync(f) ? ts.ScriptSnapshot.fromString(fs.readFileSync(f, 'utf8')) : undefined),
  getCurrentDirectory: () => process.cwd(),
  getCompilationSettings: () => cfg.options,
  getDefaultLibFileName: ts.getDefaultLibFilePath,
  fileExists: ts.sys.fileExists,
  readFile: ts.sys.readFile,
  readDirectory: ts.sys.readDirectory,
  directoryExists: ts.sys.directoryExists,
  getDirectories: ts.sys.getDirectories
}
const ls = ts.createLanguageService(host, ts.createDocumentRegistry())
const program = ls.getProgram()
const srcRoot = path.resolve('src') + path.sep
const sourceFiles = program.getSourceFiles().filter((sf) => path.resolve(sf.fileName).startsWith(srcRoot))

const isExported = (n) => n.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
const isZInfer = (t) =>
  t &&
  ts.isTypeReferenceNode(t) &&
  ts.isQualifiedName(t.typeName) &&
  t.typeName.left.getText() === 'z' &&
  ['infer', 'input', 'output'].includes(t.typeName.right.text)

// 1. Jobs: { file, pos, from, to, meaning }
const jobs = []
for (const sf of sourceFiles) {
  for (const st of sf.statements) {
    if (MODE === 's2' && ts.isVariableStatement(st) && isExported(st)) {
      for (const d of st.declarationList.declarations) {
        const name = d.name.getText(sf)
        if (!/^\w+Type$/.test(name) || !d.initializer) continue
        // a zod schema: built from `z.` or from another schema
        if (!/^(z\b|\w+(Schema|Type)\b)/.test(d.initializer.getText(sf))) continue
        jobs.push({ file: sf.fileName, pos: d.name.getStart(sf), from: name, to: name.replace(/Type$/, 'Schema'), meaning: 'value' })
      }
    }
    if (MODE === 's3a' && ts.isTypeAliasDeclaration(st) && isExported(st) && (isZInfer(st.type) || (ts.isIntersectionTypeNode(st.type) && isZInfer(st.type.types[0])))) {
      const name = st.name.text
      if (!/^\w+Type$/.test(name) || name === 'Type') continue
      // already final when named after its schema (`ElementalType` of `ElementalTypeSchema`)
      const zRef = isZInfer(st.type) ? st.type : st.type.types[0]
      if (zRef.typeArguments?.[0]?.getText(sf) === `typeof ${name}Schema`) continue
      // `XSchemaType` -> `X` too
      jobs.push({ file: sf.fileName, pos: st.name.getStart(sf), from: name, to: name.replace(/(Schema)?Type$/, ''), meaning: 'type' })
    }
  }
}

// 2. Classify each reference of each job
const declaredNames = new Map() // file -> Set of names declared or imported there
const namesIn = (sf) => {
  if (declaredNames.has(sf.fileName)) return declaredNames.get(sf.fileName)
  const set = new Set()
  const visit = (n) => {
    if (ts.isIdentifier(n)) {
      const p = n.parent
      const member =
        (ts.isPropertyAccessExpression(p) && p.name === n) ||
        (ts.isQualifiedName(p) && p.right === n) ||
        ((ts.isPropertyAssignment(p) || ts.isPropertySignature(p) || ts.isPropertyDeclaration(p) || ts.isMethodDeclaration(p) || ts.isMethodSignature(p)) && p.name === n) ||
        (ts.isImportSpecifier(p) && p.propertyName === n)
      if (!member) set.add(n.text)
    }
    ts.forEachChild(n, visit)
  }
  visit(sf)
  declaredNames.set(sf.fileName, set)
  return set
}
const kindOf = (node) => {
  const p = node.parent
  if (ts.isImportSpecifier(p) || ts.isExportSpecifier(p)) return 'specifier'
  if (ts.isTypeAliasDeclaration(p) && p.name === node) return 'type'
  if (ts.isTypeReferenceNode(p) || (ts.isQualifiedName(p) && ts.isTypeReferenceNode(p.parent))) return 'type'
  if (ts.isExpressionWithTypeArguments(p) && ts.isHeritageClause(p.parent) && p.parent.token === ts.SyntaxKind.ImplementsKeyword) return 'type'
  return 'value'
}
const nodeAt = (sf, pos) => {
  let found
  const visit = (n) => {
    if (pos >= n.getStart(sf) && pos < n.getEnd()) {
      if (ts.isIdentifier(n)) found = n
      ts.forEachChild(n, visit)
    }
  }
  visit(sf)
  return found
}

const otherMeaningUsed = (sf, job) => {
  let used = false
  const visit = (n) => {
    if (used) return
    if (ts.isIdentifier(n) && n.text === job.from) {
      const kind = kindOf(n)
      const p = n.parent
      const member =
        (ts.isPropertyAccessExpression(p) && p.name === n) ||
        (ts.isQualifiedName(p) && p.right === n) ||
        ((ts.isPropertyAssignment(p) || ts.isPropertySignature(p)) && p.name === n)
      if (!member && kind !== 'specifier' && kind !== job.meaning) {
        // a declaration of the twin in its own file counts as a use
        used = true
      }
    }
    ts.forEachChild(n, visit)
  }
  visit(sf)
  return used
}

const edits = new Map() // file -> [{start, end, text}]
const skipped = []
const plannedNew = new Map() // file -> Map newName -> from
let done = 0
for (const job of jobs) {
  const locs = ls.findRenameLocations(job.file, job.pos, false, false, { providePrefixAndSuffixTextForRename: false }) || []
  const byFile = new Map()
  for (const l of locs) {
    const sf = program.getSourceFile(l.fileName)
    const node = nodeAt(sf, l.textSpan.start)
    if (!node || node.text !== job.from) continue
    if (!byFile.has(l.fileName)) byFile.set(l.fileName, [])
    byFile.get(l.fileName).push({ node, kind: kindOf(node), sf })
  }
  // collisions
  let clash = null
  for (const [file, refs] of byFile) {
    const names = namesIn(refs[0].sf)
    if (names.has(job.to)) clash = `${path.relative('.', file)} already has ${job.to}`
    const planned = plannedNew.get(file)
    if (planned?.has(job.to) && planned.get(job.to) !== job.from) clash = `${path.relative('.', file)}: ${job.to} also planned for ${planned.get(job.to)}`
  }
  if (clash) {
    skipped.push(`${job.from} -> ${job.to}: ${clash}`)
    continue
  }
  for (const [file, refs] of byFile) {
    if (!plannedNew.has(file)) plannedNew.set(file, new Map())
    plannedNew.get(file).set(job.to, job.from)
    // The service returns references of the asked meaning only, so the other
    // meaning is looked up by name in the file
    const usesOther = otherMeaningUsed(refs[0].sf, job)
    const list = edits.get(file) || []
    for (const r of refs) {
      const start = r.node.getStart(r.sf)
      const end = r.node.getEnd()
      if (r.kind === job.meaning) list.push({ start, end, text: job.to })
      else if (r.kind === 'specifier') {
        const spec = r.node.parent
        if (spec.propertyName && spec.propertyName !== r.node) continue // `import { A as B }`: local alias stays
        list.push({ start, end, text: usesOther || ts.isExportSpecifier(spec) ? `${job.from}, ${job.to}` : job.to })
      }
    }
    edits.set(file, list)
  }
  done++
}

let files = 0
for (const [file, list] of edits) {
  if (!list.length) continue
  const uniq = [...new Map(list.map((e) => [`${e.start}`, e])).values()].sort((a, b) => b.start - a.start)
  let s = fs.readFileSync(file, 'utf8')
  for (const e of uniq) s = s.slice(0, e.start) + e.text + s.slice(e.end)
  files++
  if (!DRY) fs.writeFileSync(file, s)
}
console.log(`${MODE}: ${jobs.length} candidates, ${done} renamed across ${files} files, ${skipped.length} skipped`)
if (skipped.length) console.log('  ' + skipped.join('\n  '))
