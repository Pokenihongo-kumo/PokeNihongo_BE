#!/usr/bin/env node
// Phase 7 Z2: inventory every src/modules/<name> and the buckets outside it,
// recounted from source, with the five statuses of the roadmap (inventoried,
// contract-covered, standardized, extracted-if-needed, verified).
//
// Static reading only (regex on src/**/*.ts and test/**/*.ts); the columns are
// signals, the rules for each status are written in the generated file.
//
// Usage:
//   node scripts/inventory/module-status.mjs          write docs/standardization/module-status.md
//   node scripts/inventory/module-status.mjs --json   print the rows
import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const SRC = join(ROOT, 'src')
const OUT = join(ROOT, 'docs', 'standardization', 'module-status.md')
const rel = (p) => relative(ROOT, p).split(sep).join('/')

const walk = (dir) =>
  readdirSync(dir).flatMap((n) => {
    const p = join(dir, n)
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.ts') ? [p] : []
  })
const count = (text, re) => (text.match(re) || []).length

// Rollout groups of phase 3 (inventory.md section 4); modules moved in later
// (phase 4 integrations) are grouped as "integration"
const GROUPS = {
  catalog:
    'languages meaning translation wordtype kanji-reading level elemental-type type-effectiveness pokemon grammar grammar-usage lesson-category role permission feature achievement-group attendence-config gemini-config shop-rarity-price',
  content:
    'lesson lesson-content kanji vocabulary exercises question-bank answer testset testset-questionbank test flashcard speaking',
  user: 'auth user user-progress user-history user-exercise-attempt user-test user-test-attempt user-test-answer-log user-answer-log user-srs-review user-achievement achievement attendance daily-request user-daily-request notification dashboard ai-conversation-room user-ai-conversation user-pokemon',
  economy:
    'wallet wallet-transaction reward user-reward-history shop-banner shop-item shop-purchase gacha-banner gacha-item gacha-item-rate gacha-purchase gacha-roll-history user-gacha-pity subscription subscription-plan subscription-feature user-subscription invoice payment',
  battle:
    'match match-queue match-participant match-round match-round-participant round-question round-question-answerlog debuff-round leaderboard-season season-rank-reward user-season-history'
}
const groupOf = (m) =>
  Object.keys(GROUPS).find((g) => GROUPS[g].split(' ').includes(m)) || 'integration'

// Phase 6 extractions (tracker section 12) and open work that splits a module
const EXTRACTED = {
  'round-question': 'X1',
  'match-round-participant': 'X2',
  'user-test-attempt': 'X3',
  test: 'X4',
  vocabulary: 'X5',
  kanji: 'X5',
  reward: 'X6',
  'ai-conversation-room': 'X7 (gateway)',
  'user-ai-conversation': 'X7 (gateway)'
}
const OPEN_SPLIT = { gemini: 'I5 dở: tách GeminiService' }
const BIG_FILE = 1000

// arch:deps entries (documented exceptions live in the baseline)
const arch = JSON.parse(
  execFileSync(
    process.execPath,
    [join(ROOT, 'scripts', 'arch', 'module-deps.mjs'), '--json'],
    {
      cwd: ROOT,
      encoding: 'utf8'
    }
  )
)
const archLines = Object.entries(arch.details).flatMap(([metric, list]) =>
  list.map((l) => `${metric}: ${typeof l === 'string' ? l : JSON.stringify(l)}`)
)
const baseline = JSON.parse(
  readFileSync(join(ROOT, 'scripts', 'arch', 'module-deps.baseline.json'), 'utf8')
)
const baselineLines = new Set(
  Object.entries(baseline.details || {}).flatMap(([metric, list]) =>
    list.map((l) => `${metric}: ${typeof l === 'string' ? l : JSON.stringify(l)}`)
  )
)

const testFiles = walk(join(ROOT, 'test')).filter((f) => f.endsWith('.e2e-spec.ts'))
const testText = new Map(testFiles.map((f) => [f, readFileSync(f, 'utf8')]))

const signals = (files) => {
  const texts = files.map((f) => readFileSync(f, 'utf8'))
  const all = texts.join('\n')
  return {
    files: files.length,
    lines: texts.reduce((a, t) => a + t.split('\n').length, 0),
    biggest: files
      .map((f, i) => [rel(f), texts[i].split('\n').length])
      .sort((a, b) => b[1] - a[1])[0] || ['', 0],
    console: count(all, /\bconsole\.(log|debug|info|warn|error)\(/g),
    any: count(all, /:\s*any\b|\bas any\b|<any>|any\[\]/g),
    eslintDisable: count(all, /eslint-disable/g),
    constMessage: count(all, /from '@\/common\/constants\/message'/g),
    srcImports: count(all, /from 'src\//g)
  }
}

const modules = readdirSync(join(SRC, 'modules')).filter((n) =>
  statSync(join(SRC, 'modules', n)).isDirectory()
)
const rows = modules.map((m) => {
  const dir = join(SRC, 'modules', m)
  const all = walk(dir)
  const code = all.filter((f) => !f.endsWith('.spec.ts'))
  const controllers = code.filter((f) => f.endsWith('.controller.ts'))
  const ctrlText = controllers.map((f) => readFileSync(f, 'utf8')).join('\n')
  // one block per route: from its HTTP decorator to the next one
  const routeBlocks = ctrlText
    .replace(/\r\n/g, '\n')
    .split(/(?=\n[ \t]*@(?:Get|Post|Put|Patch|Delete)\()/)
    .slice(1)
  const endpoints = routeBlocks.length
  let serialized = 0
  let rawRoutes = 0
  let messageOnly = 0
  for (const b of routeBlocks) {
    if (/@ZodSerializerDto\(/.test(b)) serialized++
    else if (/@Res\(/.test(b)) rawRoutes++
    // no `return <value>` (or only a message): the envelope carries data: null
    else if (!/\breturn\s+(?!msg\()(?![;}\s])/.test(b)) messageOnly++
  }
  const prefixes = [...ctrlText.matchAll(/@Controller\(\s*['"`]([^'"`]+)['"`]/g)].map(
    (x) => x[1]
  )
  const repoFiles = code.filter((f) => /\.repo(sitory)?\.ts$/.test(f))
  const repoClasses = repoFiles.flatMap((f) =>
    [...readFileSync(f, 'utf8').matchAll(/export class (\w+)/g)].map((x) => x[1])
  )
  const entityFiles = code.filter((f) => f.includes(`${sep}entities${sep}`))
  const zodDto = code.some((f) => f.endsWith('.zod-dto.ts'))
  const unitSpecs = all.filter((f) => f.endsWith('.spec.ts')).length
  const e2e = testFiles.filter((f) =>
    prefixes.some((p) =>
      new RegExp(`['"\`]/${p.replace(/[/-]/g, '\\$&')}(['"\`/?]|\\$\\{)`).test(
        testText.get(f)
      )
    )
  )
  const s = signals(code)
  const archHits = archLines.filter((l) => l.includes(`modules/${m}/`))
  const archNew = archHits.filter((l) => !baselineLines.has(l))

  const gaps = []
  if (repoClasses.some((c) => !c.endsWith('Repo'))) gaps.push('tên repo')
  if (repoFiles.some((f) => f.endsWith('.repository.ts'))) gaps.push('file .repository')
  if (entityFiles.some((f) => !f.endsWith('.entity.ts'))) gaps.push('file entity')
  if (endpoints && !zodDto) gaps.push('thiếu zod-dto')
  if (endpoints && serialized + rawRoutes + messageOnly < endpoints)
    gaps.push(`serializer thiếu ${endpoints - serialized - rawRoutes - messageOnly}`)
  if (s.console) gaps.push(`console ×${s.console}`)
  if (s.constMessage) gaps.push('constants/message')
  if (s.srcImports) gaps.push(`import src/ ×${s.srcImports}`)
  if (archNew.length) gaps.push(`arch mới ×${archNew.length}`)
  const standardized = gaps.length ? '✗' : archHits.length ? 'ngoại lệ' : '✓'

  const big = s.biggest[1] > BIG_FILE
  const extracted = OPEN_SPLIT[m]
    ? `✗ ${OPEN_SPLIT[m]}`
    : EXTRACTED[m]
      ? `✓ ${EXTRACTED[m]}`
      : big
        ? `cần xét (${s.biggest[1]} dòng)`
        : 'không cần'
  const contract = endpoints === 0 ? '—' : e2e.length ? '✓' : '✗'
  const verified =
    (contract === '✓' || contract === '—') &&
    standardized !== '✗' &&
    !extracted.startsWith('✗') &&
    !extracted.startsWith('cần') &&
    unitSpecs + e2e.length > 0
      ? '✓'
      : '✗'
  return {
    module: m,
    group: groupOf(m),
    ...s,
    biggest: `${s.biggest[0].replace(`src/modules/${m}/`, '')} (${s.biggest[1]})`,
    endpoints,
    serialized,
    rawRoutes,
    messageOnly,
    unitSpecs,
    e2eSpecs: e2e.length,
    archHits: archHits.length,
    gaps,
    status: { inventoried: '✓', contract, standardized, extracted, verified }
  }
})

const outside = readdirSync(SRC)
  .filter((n) => n !== 'modules')
  .map((n) => {
    const p = join(SRC, n)
    const files = statSync(p).isDirectory()
      ? walk(p).filter((f) => !f.endsWith('.spec.ts'))
      : [p]
    const s = signals(files)
    const archHits = archLines.filter(
      (l) => l.includes(` ${n}/`) || l.startsWith(`${n}/`) || l.includes(`: ${n}/`)
    )
    return {
      bucket: n,
      ...s,
      biggest: `${s.biggest[0]} (${s.biggest[1]})`,
      archHits: archHits.length
    }
  })

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ rows, outside }, null, 2))
  process.exit(0)
}

const tally = (key, val) =>
  rows.filter(
    (r) => r.status[key] === val || (val === '✓*' && r.status[key].startsWith('✓'))
  ).length
const sum = (k) => rows.reduce((a, r) => a + r[k], 0)
const head = (cols) =>
  `| ${cols.join(' | ')} |\n| ${cols.map(() => '---').join(' | ')} |\n`
let md = `# Trạng thái module backend — giai đoạn 7 (Z2)

File sinh tự động bằng \`node scripts/inventory/module-status.mjs\` (đọc tĩnh \`src/\` và \`test/\`). Không sửa tay; đếm lại khi source đổi. Bảng gốc giai đoạn 0 (81 module, 616 endpoint): [inventory.md](inventory.md).

## 1. Tổng quan

- **${rows.length} module** trong \`src/modules\` (81 module cũ + \`gemini\`, \`mail\`, \`speech\`, \`upload\` chuyển từ \`3rdService\` ở giai đoạn 4), **${sum('endpoints')} endpoint**, ${sum('files')} file code (không tính spec), ${sum('lines')} dòng.
- Bucket ngoài modules: ${outside.map((o) => `\`${o.bucket}\``).join(', ')}.
- Trạng thái: inventoried ${rows.length}/${rows.length} · contract-covered ${tally('contract', '✓')} (+${tally('contract', '—')} module không có route) · standardized ${tally('standardized', '✓')} (+${tally('standardized', 'ngoại lệ')} ngoại lệ đã ghi) · extracted-if-needed: đã tách ${tally('extracted', '✓*')}, không cần ${tally('extracted', 'không cần')}, còn mở ${rows.filter((r) => r.status.extracted.startsWith('✗') || r.status.extracted.startsWith('cần')).length} · verified ${tally('verified', '✓')}.
- Tín hiệu toàn modules: \`console.*\` ${sum('console')}, \`any\` ${sum('any')}, \`eslint-disable\` ${sum('eslintDisable')}, import \`common/constants/message\` ${sum('constMessage')}, import \`src/...\` ${sum('srcImports')}.

## 2. Quy tắc trạng thái

- **inventoried**: có mặt trong bảng này với số đếm từ source hiện tại.
- **contract-covered**: ít nhất một \`test/**/*.e2e-spec.ts\` chứa đường dẫn bắt đầu bằng prefix \`@Controller\` của module (chuỗi \`'/prefix\`). Là tín hiệu tĩnh: không chứng minh mọi route đều có test. \`—\` = module không có controller.
- **standardized**: không có lỗ hổng nào trong cột "Còn lệch": repo tên \`XRepo\` trong \`*.repo.ts\`; file entity \`.entity.ts\`; có \`*.zod-dto.ts\` nếu có route; mọi route có \`@ZodSerializerDto\` hoặc là route \`@Res()\` (stream/redirect/multi-status); không \`console.*\`; không import \`common/constants/message\`; không import \`src/...\`; không mục \`arch:deps\` ngoài baseline. \`ngoại lệ\` = chỉ còn mục \`arch:deps\` đã ghi lý do trong baseline (backend-convention mục 9).
- **extracted-if-needed**: theo giai đoạn 6 (tách theo trách nhiệm, không theo số dòng). \`✓ Xn\` = đã tách; \`không cần\` = không có file nào trên ${BIG_FILE} dòng và không nằm trong danh sách tách; \`cần xét\` = có file trên ${BIG_FILE} dòng chưa được xét; \`✗\` = việc tách còn mở trong tracker.
- **verified**: contract-covered (hoặc không có route), standardized hoặc ngoại lệ, extracted không còn mở, và có ít nhất một unit spec hoặc e2e spec chạm module.

## 3. Module

`
for (const g of [...Object.keys(GROUPS), 'integration']) {
  const rs = rows.filter((r) => r.group === g)
  md += `### ${g} (${rs.length})\n\n`
  md += head([
    'Module',
    'Route',
    'Serializer',
    'Unit',
    'E2e',
    'File lớn nhất (dòng)',
    'any',
    'Contract',
    'Standardized',
    'Extracted',
    'Verified',
    'Còn lệch'
  ])
  for (const r of rs)
    md += `| ${r.module} | ${r.endpoints} | ${r.serialized}${r.rawRoutes ? ` +${r.rawRoutes} @Res` : ''}${r.messageOnly ? ` +${r.messageOnly} msg` : ''} | ${r.unitSpecs} | ${r.e2eSpecs} | ${r.biggest} | ${r.any} | ${r.status.contract} | ${r.status.standardized} | ${r.status.extracted} | ${r.status.verified} | ${r.gaps.join('; ') || ''} |\n`
  md += '\n'
}
md += `## 4. Ngoài \`src/modules\`\n\n`
md += head([
  'Bucket',
  'File',
  'Dòng',
  'File lớn nhất (dòng)',
  'console',
  'any',
  'eslint-disable',
  'Mục arch:deps'
])
for (const o of outside)
  md += `| ${o.bucket} | ${o.files} | ${o.lines} | ${o.biggest} | ${o.console} | ${o.any} | ${o.eslintDisable} | ${o.archHits} |\n`
writeFileSync(OUT, md)
console.log(`wrote ${rel(OUT)}: ${rows.length} modules`)
