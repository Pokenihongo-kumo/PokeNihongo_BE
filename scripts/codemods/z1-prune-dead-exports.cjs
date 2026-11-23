// Phase 7 Z1: remove exports in src/ that nothing references (not even their
// own file), then drop imports left unused and files left with no exports.
// One round per run (a new program per round ran out of heap); rerun until it
// reports 0, then typecheck.
// Usage: node --max-old-space-size=8192 scripts/codemods/z1-prune-dead-exports.cjs [--dry]
const fs = require('fs')
const path = require('path')
const ts = require(process.cwd() + '/node_modules/typescript')
const DRY = process.argv.includes('--dry')
const SKIP = [/^src\/shared\/services\/firebase\.service\.ts$/, /\.spec\.ts$/, /^src\/main\.ts$/]
const norm = (f) => path.relative(process.cwd(), f).replace(/\\/g, '/')

const cfgPath = ts.findConfigFile(process.cwd(), ts.sys.fileExists, 'tsconfig.json')
const cfg = ts.parseJsonConfigFileContent(ts.readConfigFile(cfgPath, ts.sys.readFile).config, ts.sys, process.cwd())
const extra = ts.sys
  .readDirectory(path.join(process.cwd(), 'test'), ['.ts'])
  .concat(ts.sys.readDirectory(path.join(process.cwd(), 'initialScript'), ['.ts']))
let roots = [...new Set([...cfg.fileNames, ...extra])]

const removed = []
for (let round = 1; round <= 1; round++) {
  roots = roots.filter((f) => fs.existsSync(f))
  const program = ts.createProgram(roots, cfg.options)
  const checker = program.getTypeChecker()
  const resolve = (s) => {
    while (s && s.flags & ts.SymbolFlags.Alias) {
      try {
        s = checker.getAliasedSymbol(s)
      } catch {
        break
      }
    }
    return s
  }
  // every identifier use anywhere, resolved to its symbol (declaration names excluded)
  const refCount = new Map()
  for (const sf of program.getSourceFiles()) {
    if (sf.isDeclarationFile || sf.fileName.includes('/node_modules/')) continue
    const visit = (n) => {
      if (ts.isIdentifier(n)) {
        const p = n.parent
        const isDeclName = p && p.name === n && (ts.isVariableDeclaration(p) || ts.isClassDeclaration(p) || ts.isFunctionDeclaration(p) || ts.isTypeAliasDeclaration(p) || ts.isInterfaceDeclaration(p) || ts.isEnumDeclaration(p))
        if (!isDeclName) {
          const s = resolve(checker.getSymbolAtLocation(n))
          if (s) refCount.set(s, (refCount.get(s) || 0) + 1)
        }
      }
      ts.forEachChild(n, visit)
    }
    visit(sf)
  }
  const edits = new Map() // file -> [ranges]
  for (const sf of program.getSourceFiles()) {
    const f = norm(sf.fileName)
    if (!f.startsWith('src/') || SKIP.some((r) => r.test(f))) continue
    for (const st of sf.statements) {
      const exported = ts.getCombinedModifierFlags(st) & ts.ModifierFlags.Export || (st.modifiers || []).some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
      if (!exported) continue
      if ((st.modifiers || []).some((m) => m.kind === ts.SyntaxKind.DefaultKeyword)) continue
      let nameNode
      if (ts.isVariableStatement(st)) {
        const ds = st.declarationList.declarations
        if (ds.length !== 1 || !ts.isIdentifier(ds[0].name)) continue
        nameNode = ds[0].name
      } else if (ts.isClassDeclaration(st) || ts.isFunctionDeclaration(st) || ts.isTypeAliasDeclaration(st) || ts.isInterfaceDeclaration(st) || ts.isEnumDeclaration(st)) {
        nameNode = st.name
        // an overload set or declaration merge: leave it
        if (!nameNode) continue
      } else continue
      const sym = checker.getSymbolAtLocation(nameNode)
      if (!sym || (sym.declarations || []).length > 1) continue
      if (refCount.get(sym)) continue
      // A dto file keeps each schema's inferred type next to its DTO class
      // (backend-convention section 2), used or not
      if (
        /\/dto\//.test(f) &&
        ts.isTypeAliasDeclaration(st) &&
        /^z\.(infer|input|output)<\s*typeof \w+\s*>$/.test(st.type.getText(sf))
      )
        continue
      if (!edits.has(sf.fileName)) edits.set(sf.fileName, { sf, ranges: [] })
      edits.get(sf.fileName).ranges.push([st.getFullStart(), st.end])
      removed.push(`${f}\t${nameNode.text}`)
    }
  }
  console.error(`round ${round}: ${[...edits.values()].reduce((a, e) => a + e.ranges.length, 0)} declarations`)
  if (edits.size === 0) break
  if (DRY) break
  for (const [file, { sf, ranges }] of edits) {
    let text = sf.text
    for (const [a, b] of ranges.sort((x, y) => y[0] - x[0])) text = text.slice(0, a) + text.slice(b)
    fs.writeFileSync(file, pruneImports(file, text))
  }
}

function pruneImports(file, text) {
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true)
  const body = sf.statements.filter((s) => !ts.isImportDeclaration(s)).map((s) => s.getFullText()).join('')
  const used = (name) => new RegExp(`(^|[^\\w$.]|\\.\\.\\.)${name.replace(/\$/g, '\\$')}(?![\\w$])`).test(body)
  const cuts = []
  for (const st of sf.statements) {
    if (!ts.isImportDeclaration(st) || !st.importClause) continue
    const c = st.importClause
    const keepDefault = c.name && used(c.name.text)
    let named = null
    let ns = null
    if (c.namedBindings && ts.isNamedImports(c.namedBindings)) named = c.namedBindings.elements.filter((e) => used(e.name.text))
    if (c.namedBindings && ts.isNamespaceImport(c.namedBindings)) ns = used(c.namedBindings.name.text) ? c.namedBindings.name.text : null
    const allNamed = c.namedBindings && ts.isNamedImports(c.namedBindings) ? c.namedBindings.elements.length : 0
    if ((!c.name || keepDefault) && (named === null || named.length === allNamed) && (ns !== null || !(c.namedBindings && ts.isNamespaceImport(c.namedBindings)))) continue
    const spec = st.moduleSpecifier.getText(sf)
    const parts = []
    if (keepDefault) parts.push(c.name.text)
    if (ns) parts.push(`* as ${ns}`)
    if (named && named.length) parts.push(`{ ${named.map((e) => e.getText(sf)).join(', ')} }`)
    const repl = parts.length ? `import ${c.isTypeOnly ? 'type ' : ''}${parts.join(', ')} from ${spec}` : ''
    cuts.push([st.getStart(sf), st.end, repl])
  }
  for (const [a, b, r] of cuts.sort((x, y) => y[0] - x[0])) text = text.slice(0, a) + r + text.slice(b)
  return text.replace(/\n{3,}/g, '\n\n').replace(/^\s*\n/, '')
}

// files left with no statements but imports
let deletedFiles = []
if (!DRY) {
  for (const f of new Set(removed.map((r) => r.split('\t')[0]))) {
    if (!fs.existsSync(f)) continue
    const sf = ts.createSourceFile(f, fs.readFileSync(f, 'utf8'), ts.ScriptTarget.Latest, true)
    if (sf.statements.every((s) => ts.isImportDeclaration(s))) {
      fs.unlinkSync(f)
      deletedFiles.push(f)
    }
  }
}
fs.appendFileSync(process.env.OUT || 'pruned-exports.tsv', removed.join('\n') + '\n')
console.error(`removed ${removed.length} declarations; files emptied and deleted: ${deletedFiles.join(', ') || 'none'}`)
