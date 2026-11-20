// P5d: move success-message translation out of controllers.
//   return { message: this.i18nService.translate(KEY, lang), data: X }
//     -> @ResponseMessage(KEY) on the handler + `return X` (data null / message only: no return)
//   any other this.i18nService.translate(K, lang[, args]) inside a returned { message }
//     -> msg(K[, args]) (translated by TransformInterceptor in the request language)
// Then drops `@I18nLang() lang` when unused, the I18nService injection and imports
// left unused, and adds the response-message import.
// Usage: node scripts/codemods/p5d-response-message.mjs <module>... [--dry]
// Reports what it did not touch (translate outside a returned message, other
// languages than `lang`, extra envelope keys).
import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'

const args = process.argv.slice(2)
const dry = args.includes('--dry')
const modules = args.filter((a) => !a.startsWith('--'))
const report = []

const isTranslateCall = (node) =>
  ts.isCallExpression(node) &&
  ts.isPropertyAccessExpression(node.expression) &&
  node.expression.name.text === 'translate' &&
  ts.isPropertyAccessExpression(node.expression.expression) &&
  node.expression.expression.name.text === 'i18nService'

function transform(file) {
  let text = fs.readFileSync(file, 'utf8')
  const crlf = text.includes('\r\n')
  text = text.replace(/\r\n/g, '\n')
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true)
  const edits = [] // { start, end, text }
  let usedDecorator = false
  let usedMsg = false
  const rel = path.relative(process.cwd(), file)

  const visitMethod = (method) => {
    if (!method.body) return
    const name = method.name.getText(sf)
    const returns = [] // object-literal returns
    let allReturns = 0 // every return: the decorator wraps whatever comes back
    const walk = (n) => {
      if (ts.isFunctionLike(n) && n !== method) return
      if (ts.isReturnStatement(n)) {
        allReturns++
        if (n.expression && ts.isObjectLiteralExpression(n.expression)) returns.push(n)
      }
      ts.forEachChild(n, walk)
    }
    walk(method.body)
    const envelopes = returns
      .map((r) => {
        const props = r.expression.properties
        const message = props.find(
          (p) => ts.isPropertyAssignment(p) && p.name.getText(sf) === 'message'
        )
        if (!message || !isTranslateCall(message.initializer)) return null
        const data = props.find(
          (p) => ts.isPropertyAssignment(p) && p.name.getText(sf) === 'data'
        )
        const others = props.filter((p) => p !== message && p !== data)
        return { ret: r, call: message.initializer, message, data, others }
      })
      .filter(Boolean)
    if (!envelopes.length) return

    const callArgs = (e) => e.call.arguments
    // the request language: whatever the method calls its @I18nLang() parameter
    const langNames = method.parameters
      .filter((p) =>
        (ts.getDecorators(p) ?? []).some((d) => d.getText(sf).startsWith('@I18nLang('))
      )
      .map((p) => p.name.getText(sf))
    const langOk = (e) => callArgs(e)[1] && langNames.includes(callArgs(e)[1].getText(sf))
    const fixedKey = (e) =>
      callArgs(e).length === 2 &&
      langOk(e) &&
      /^[A-Za-z_$][\w$]*\.[A-Z_][A-Z0-9_]*$/.test(callArgs(e)[0].getText(sf))

    for (const e of envelopes) {
      if (!langOk(e)) {
        report.push(
          `${rel} ${name}: translate in ${callArgs(e)[1]?.getText(sf) ?? 'default'} language, left as is`
        )
        return
      }
    }
    // one return, fixed key, only message (+ data): the decorator
    const one = envelopes.length === 1 && allReturns === 1 ? envelopes[0] : null
    if (one && fixedKey(one) && one.others.length === 0) {
      const key = callArgs(one)[0].getText(sf)
      const dataNode = one.data?.initializer
      let replacement
      if (!dataNode || dataNode.kind === ts.SyntaxKind.NullKeyword) replacement = ''
      else {
        const expr = ts.isAwaitExpression(dataNode) ? dataNode.expression : dataNode
        replacement = `return ${expr.getText(sf)}`
      }
      // the return statement, with its own line when it becomes empty
      let start = one.ret.getStart(sf)
      let end = one.ret.getEnd()
      if (!replacement) {
        const lineStart = text.lastIndexOf('\n', start - 1) + 1
        if (/^\s*$/.test(text.slice(lineStart, start))) start = lineStart
        if (text[end] === '\n') end++
      }
      edits.push({ start, end, text: replacement })
      // decorator right above the method name / modifiers
      const decoStart = (method.modifiers ?? []).find((m) => !ts.isDecorator(m))
      const anchor = decoStart ? decoStart.getStart(sf) : method.name.getStart(sf)
      const lineStart = text.lastIndexOf('\n', anchor - 1) + 1
      const indent = text.slice(lineStart, anchor)
      edits.push({
        start: lineStart,
        end: lineStart,
        text: `${indent}@ResponseMessage(${key})\n`
      })
      usedDecorator = true
      return
    }
    // otherwise: msg() in place, the handler keeps choosing
    for (const e of envelopes) {
      if (e.others.length)
        report.push(
          `${rel} ${name}: envelope with ${e.others.map((o) => o.getText(sf).split(':')[0]).join(', ')}, msg() only`
        )
      const [key, , extra] = callArgs(e)
      const text2 = `msg(${key.getText(sf)}${extra ? `, ${extra.getText(sf)}` : ''})`
      edits.push({ start: e.call.getStart(sf), end: e.call.getEnd(), text: text2 })
      usedMsg = true
    }
  }

  const visit = (n) => {
    if (ts.isMethodDeclaration(n)) visitMethod(n)
    ts.forEachChild(n, visit)
  }
  visit(sf)
  if (!edits.length) return null

  edits.sort((a, b) => b.start - a.start)
  for (const e of edits) text = text.slice(0, e.start) + e.text + text.slice(e.end)

  // second pass: unused lang params, unused injection / imports
  text = cleanup(text, file, { usedDecorator, usedMsg })
  if (!dry) fs.writeFileSync(file, crlf ? text.replace(/\n/g, '\r\n') : text)
  return { file: rel, edits: edits.length }
}

function cleanup(text, file, { usedDecorator, usedMsg }) {
  let sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true)
  const edits = []
  const visit = (n) => {
    if (ts.isMethodDeclaration(n) && n.body) {
      for (const p of n.parameters) {
        const deco = ts.getDecorators(p) ?? []
        if (!deco.some((d) => d.getText(sf).startsWith('@I18nLang('))) continue
        const pname = p.name.getText(sf)
        const used = new RegExp(`\\b${pname}\\b`).test(n.body.getText(sf))
        if (used) continue
        // remove the parameter with its separator
        const params = n.parameters
        const i = params.indexOf(p)
        let start = p.getFullStart()
        let end = p.getEnd()
        if (i < params.length - 1) end = params[i + 1].getFullStart()
        else if (i > 0) start = params[i - 1].getEnd()
        edits.push({ start, end, text: '' })
      }
    }
    ts.forEachChild(n, visit)
  }
  visit(sf)
  edits.sort((a, b) => b.start - a.start)
  for (const e of edits) text = text.slice(0, e.start) + e.text + text.slice(e.end)

  // the i18n injection when nothing uses it any more
  if (!/this\.i18nService\b/.test(text)) {
    text = text.replace(/\n\s*private readonly i18nService: I18nService,?/, '')
    text = text.replace(/,(\s*\)\s*\{\})/, '$1')
    text = text.replace(/constructor\(\s*\)\s*\{\}/, 'constructor() {}')
  }
  const dropImport = (name) => {
    const body = text.replace(/^import[\s\S]*?from '[^']+'\n/gm, '')
    if (new RegExp(`\\b${name}\\b`).test(body)) return
    text = text.replace(
      /import (type )?\{([^}]*)\} from ('[^']+')\n/g,
      (all, t, list, from) => {
        const items = list
          .split(',')
          .map((x) => x.trim())
          .filter(Boolean)
        const keep = items.filter((x) => x !== name && !x.endsWith(` as ${name}`))
        if (keep.length === items.length) return all
        return keep.length ? `import ${t || ''}{ ${keep.join(', ')} } from ${from}\n` : ''
      }
    )
  }
  dropImport('I18nService')
  dropImport('I18nLang')
  const wanted = [usedDecorator && 'ResponseMessage', usedMsg && 'msg'].filter(Boolean)
  if (wanted.length && !/from '@\/i18n\/response-message'/.test(text)) {
    const firstImport = text.indexOf('import ')
    text =
      text.slice(0, firstImport) +
      `import { ${wanted.sort().join(', ')} } from '@/i18n/response-message'\n` +
      text.slice(firstImport)
  }
  return text
}

const done = []
for (const m of modules) {
  const dir = path.join('src/modules', m)
  if (!fs.existsSync(dir)) {
    report.push(`${m}: no such module`)
    continue
  }
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.controller.ts'))) {
    const r = transform(path.join(dir, f))
    if (r) done.push(`${r.file}: ${r.edits} edits`)
  }
}
console.log(done.join('\n'))
if (report.length) console.log('\nLeft for a hand edit:\n  ' + report.join('\n  '))
