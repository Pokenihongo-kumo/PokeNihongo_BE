#!/usr/bin/env node
// Module boundary metrics (docs/standardization/module-boundary-plan.md, B0).
//
// Measures, by static reading of src/**/*.ts (no *.spec.ts):
//   crossModuleRepoImports   import of a *.repo / *.repository file owned by
//                            another module (rule R1)
//   moduleForeignRepoProviders  a *.module.ts listing another module's Repo in
//                            its own providers (a second instance)
//   forwardRefModuleFiles    *.module.ts files using forwardRef (rule R6)
//   injectForwardRefFiles    files using @Inject(forwardRef(...))
//   sharedModuleBusinessRepos   Repos exported by the global SharedModule (R7)
//   sharedModuleBusinessProviders  non-infrastructure services/gateways it exports
//   prismaOutsideRepoFiles   files other than repos calling Prisma directly (R5)
//   prismaOutsideRepoCalls   those calls (regex matches; relative measure only)
//
// Owner of a file: src/modules/<name>/... -> modules/<name>; any other file ->
// its top folder under src (shared, cronjobs, websockets, 3rdService, ...).
//
// Usage:
//   node scripts/arch/module-deps.mjs            check against the baseline
//                                                (exit 1 if a metric grew or a
//                                                new offending entry appeared)
//   node scripts/arch/module-deps.mjs --update   write the current numbers as
//                                                the new baseline (ratchet down)
//   node scripts/arch/module-deps.mjs --json     print the full report
import { readdirSync, readFileSync, statSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const SRC = join(ROOT, 'src')
const BASELINE = join(ROOT, 'scripts', 'arch', 'module-deps.baseline.json')

// SharedModule may keep these (rule R7: infrastructure only)
const SHARED_INFRA = new Set([
  'PrismaService',
  'HashingService',
  'TokenService',
  'PayOSService',
  'AccessTokenGuard',
  'APIKeyGuard'
])

const PRISMA_CALL =
  /\b(?:this\.)?(?:prisma|prismaService|prismaTx|tx)\s*\.\s*(?:\$(?:transaction|queryRaw\w*|executeRaw\w*)|[a-z]\w*\s*\.\s*(?:findMany|findFirst|findFirstOrThrow|findUnique|findUniqueOrThrow|create|createMany|update|updateMany|upsert|delete|deleteMany|count|aggregate|groupBy)\b)/g

const toPosix = (p) => p.split(sep).join('/')

function listTs(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) out.push(...listTs(full))
    else if (
      name.endsWith('.ts') &&
      !name.endsWith('.spec.ts') &&
      !name.endsWith('.d.ts')
    )
      out.push(full)
  }
  return out
}

// src-relative posix path, e.g. modules/wallet/wallet.repo.ts
const srcRel = (file) => toPosix(relative(SRC, file))

function ownerOf(rel) {
  const parts = rel.split('/')
  if (parts[0] === 'modules' && parts.length > 2) return `modules/${parts[1]}`
  return parts.length > 1 ? parts[0] : 'app'
}

const isRepoPath = (rel) => /\.(repo|repository)(\.ts)?$/.test(rel)

// The src-relative target of an import specifier, or null for packages
function resolveSpecifier(fromFile, spec) {
  let abs
  if (spec.startsWith('@/')) abs = join(SRC, spec.slice(2))
  else if (spec.startsWith('src/')) abs = join(ROOT, spec)
  else if (spec.startsWith('.')) abs = resolve(dirname(fromFile), spec)
  else return null
  const rel = toPosix(relative(SRC, abs))
  return rel.endsWith('.ts') ? rel : `${rel}.ts`
}

// [{ names: ['A', 'B'], spec }] for static imports
function importsOf(text) {
  const out = []
  const re = /import\s+(?:type\s+)?([\s\S]*?)\s+from\s+['"]([^'"]+)['"]/g
  let m
  while ((m = re.exec(text))) {
    const clause = m[1]
    const names = []
    const braces = clause.match(/\{([\s\S]*)\}/)
    if (braces) {
      for (const part of braces[1].split(',')) {
        const name = part
          .trim()
          .split(/\s+as\s+/)
          .pop()
          ?.replace(/^type\s+/, '')
        if (name) names.push(name)
      }
    }
    const def = clause
      .replace(/\{[\s\S]*\}/, '')
      .replace(/,/g, '')
      .trim()
    if (def && !def.startsWith('*')) names.push(def)
    out.push({ names, spec: m[2] })
  }
  return out
}

// Identifiers listed in `key: [ ... ]` (top-level of the array only)
function arrayIdentifiers(text, key) {
  const start = text.search(new RegExp(`\\b${key}\\s*[:=]\\s*\\[`))
  if (start < 0) return []
  let i = text.indexOf('[', start) + 1
  let depth = 1
  let body = ''
  for (; i < text.length && depth > 0; i++) {
    const c = text[i]
    if (c === '[' || c === '{' || c === '(') depth++
    else if (c === ']' || c === '}' || c === ')') depth--
    if (depth > 0) body += depth === 1 ? c : ' '
  }
  return body
    .replace(/\/\/.*$/gm, '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => /^[A-Z]\w*$/.test(s))
}

export function measure() {
  const files = listTs(SRC)
  const details = {
    crossModuleRepoImports: [],
    moduleForeignRepoProviders: [],
    forwardRefModuleFiles: [],
    injectForwardRefFiles: [],
    sharedModuleBusinessRepos: [],
    sharedModuleBusinessProviders: [],
    prismaOutsideRepoFiles: []
  }
  let prismaOutsideRepoCalls = 0

  for (const file of files) {
    const rel = srcRel(file)
    const owner = ownerOf(rel)
    const text = readFileSync(file, 'utf8')
    const imports = importsOf(text)
    const repoImportByName = new Map()

    for (const { names, spec } of imports) {
      const target = resolveSpecifier(file, spec)
      if (!target || !isRepoPath(target)) continue
      const targetOwner = ownerOf(target)
      for (const name of names) repoImportByName.set(name, { target, targetOwner })
      if (targetOwner !== owner) {
        details.crossModuleRepoImports.push(`${rel} -> ${target}`)
      }
    }

    if (rel.endsWith('.module.ts')) {
      if (/\bforwardRef\s*\(/.test(text)) details.forwardRefModuleFiles.push(rel)
      for (const name of arrayIdentifiers(text, 'providers')) {
        const repo = repoImportByName.get(name)
        if (repo && repo.targetOwner !== owner) {
          details.moduleForeignRepoProviders.push(`${rel} provides ${name}`)
        }
      }
    }
    if (/@Inject\s*\(\s*forwardRef\s*\(/.test(text))
      details.injectForwardRefFiles.push(rel)

    if (rel === 'shared/shared.module.ts') {
      for (const name of arrayIdentifiers(text, 'sharedServices')) {
        if (SHARED_INFRA.has(name)) continue
        if (/(Repo|Repository)$/.test(name)) details.sharedModuleBusinessRepos.push(name)
        else details.sharedModuleBusinessProviders.push(name)
      }
    }

    const isRepoFile = isRepoPath(rel)
    const isPrismaService = rel === 'shared/services/prisma.service.ts'
    if (!isRepoFile && !isPrismaService) {
      const calls = text.match(PRISMA_CALL)?.length ?? 0
      if (calls > 0) {
        details.prismaOutsideRepoFiles.push(rel)
        prismaOutsideRepoCalls += calls
      }
    }
  }

  for (const list of Object.values(details)) list.sort()
  const metrics = Object.fromEntries(
    Object.entries(details).map(([key, list]) => [key, list.length])
  )
  metrics.prismaOutsideRepoCalls = prismaOutsideRepoCalls
  return { metrics, details }
}

function main() {
  const args = new Set(process.argv.slice(2))
  const current = measure()

  if (args.has('--json')) {
    console.log(JSON.stringify(current, null, 2))
    return
  }
  if (args.has('--update') || !existsSync(BASELINE)) {
    writeFileSync(BASELINE, `${JSON.stringify(current, null, 2)}\n`)
    console.log(`Baseline written: ${toPosix(relative(ROOT, BASELINE))}`)
    console.table(current.metrics)
    return
  }

  const baseline = JSON.parse(readFileSync(BASELINE, 'utf8'))
  const rows = []
  const grown = []
  const added = []
  for (const [key, value] of Object.entries(current.metrics)) {
    const before = baseline.metrics[key] ?? 0
    rows.push({ metric: key, baseline: before, now: value, change: value - before })
    if (value > before) grown.push(key)
  }
  for (const [key, list] of Object.entries(current.details)) {
    const known = new Set(baseline.details[key] ?? [])
    for (const entry of list) if (!known.has(entry)) added.push(`${key}: ${entry}`)
  }
  console.table(rows)

  if (grown.length || added.length) {
    if (grown.length) console.error(`Grew: ${grown.join(', ')}`)
    if (added.length) console.error(`New entries:\n  ${added.join('\n  ')}`)
    console.error(
      'Module boundaries got worse (docs/standardization/module-boundary-plan.md).\n' +
        'Go through the owning module service instead, or, if this is intended,\n' +
        'record why in the tracker and run `npm run arch:deps -- --update`.'
    )
    process.exit(1)
  }
  const improved = rows.filter((r) => r.change < 0)
  if (improved.length) {
    console.log(
      'Some metrics went down: run `npm run arch:deps -- --update` to lock the gain in.'
    )
  }
  console.log('Module boundaries: no metric grew.')
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main()
