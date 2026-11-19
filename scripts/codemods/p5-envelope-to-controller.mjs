// Phase 5 (response ownership): move the success envelope out of a module's
// service into its controller.
//
//   service:    return { statusCode?, message: this.i18nService.translate(KEY, lang), data: X }
//            -> return X                (no data / data: null -> return)
//               `lang` is dropped when nothing else in the method uses it
//   controller: return this.svc.method(a, lang)
//            -> return { message: this.i18nService.translate(KEY, lang), data: await this.svc.method(a) }
//               (data: null kept when the service returned data: null; message only when it
//               returned no data), the handler becomes async, I18nService and KEY's enum are
//               injected/imported when missing
//
// A method is left alone (and listed) when its envelopes do not all have this
// shape with one KEY, or when a controller call is not `return this.svc.m(...)`.
// Callers in other modules that read `.data` are found by tsc afterwards.
//
// Usage: node scripts/codemods/p5-envelope-to-controller.mjs <module> [<module>...] [--dry]
import fs from 'fs'
import path from 'path'
import ts from 'typescript'

const args = process.argv.slice(2)
const DRY = args.includes('--dry')
const modules = args.filter((a) => !a.startsWith('--'))
if (!modules.length) throw new Error('usage: p5-envelope-to-controller.mjs <module>...')

const read = (f) => fs.readFileSync(f, 'utf8')
const parse = (f, text) => ts.createSourceFile(f, text, ts.ScriptTarget.Latest, true)
const applyEdits = (text, edits) => {
  for (const e of [...edits].sort((a, b) => b.start - a.start))
    text = text.slice(0, e.start) + e.text + text.slice(e.end)
  return text
}
const report = []

// Statements of a method body, without descending into nested functions
function returnsOf(body) {
  const out = []
  const visit = (n) => {
    if (ts.isFunctionLike(n) && n !== body.parent) return
    if (ts.isReturnStatement(n)) out.push(n)
    ts.forEachChild(n, visit)
  }
  ts.forEachChild(body, visit)
  return out
}

const propName = (p) =>
  p.name && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)) ? p.name.text : null

// { statusCode?, message: <x>.translate(KEY, lang), data? } -> { key, langName, data }
function envelopeOf(expr, sf) {
  if (!expr || !ts.isObjectLiteralExpression(expr)) return null
  const props = expr.properties
  if (
    !props.every(
      (p) =>
        (ts.isPropertyAssignment(p) || ts.isShorthandPropertyAssignment(p)) &&
        ['statusCode', 'message', 'data'].includes(propName(p))
    )
  )
    return props.some((p) => propName(p) === 'message') ? 'odd' : null
  const message = props.find((p) => propName(p) === 'message')
  if (!message) return null
  if (!ts.isPropertyAssignment(message)) return 'odd'
  const call = message.initializer
  if (
    !ts.isCallExpression(call) ||
    !ts.isPropertyAccessExpression(call.expression) ||
    call.expression.name.text !== 'translate' ||
    call.arguments.length !== 2
  )
    return 'odd'
  const [key, lang] = call.arguments
  if (!ts.isPropertyAccessExpression(key) || !ts.isIdentifier(lang)) return 'odd'
  const data = props.find((p) => propName(p) === 'data')
  let dataText = null
  let nullData = false
  if (data) {
    dataText = ts.isShorthandPropertyAssignment(data)
      ? 'data'
      : data.initializer.getText(sf)
    if (dataText === 'null') {
      dataText = null
      nullData = true
    }
  }
  return {
    key: key.getText(sf),
    enumName: key.expression.getText(sf),
    langName: lang.text,
    dataText,
    nullData
  }
}

function serviceClass(sf) {
  return sf.statements.find(
    (s) => ts.isClassDeclaration(s) && s.name && /Service$/.test(s.name.text)
  )
}

function importOf(sf, name) {
  for (const st of sf.statements) {
    if (!ts.isImportDeclaration(st)) continue
    const els = st.importClause?.namedBindings?.elements
    if (els?.some((e) => e.name.text === name)) return st.moduleSpecifier.text
  }
  return null
}

// Remove `name` from its named import (the whole import when it was alone)
function dropImportEdit(sf, name) {
  for (const st of sf.statements) {
    if (!ts.isImportDeclaration(st)) continue
    const els = st.importClause?.namedBindings?.elements
    if (!els) continue
    const idx = els.findIndex((e) => e.name.text === name)
    if (idx < 0) continue
    if (els.length === 1 && !st.importClause.name) {
      let end = st.getEnd()
      while (sf.text[end] === '\r' || sf.text[end] === '\n') end++
      return { start: st.getFullStart() === 0 ? 0 : st.getStart(sf), end, text: '' }
    }
    const el = els[idx]
    const next = els[idx + 1]
    const prev = els[idx - 1]
    return next
      ? { start: el.getStart(sf), end: next.getStart(sf), text: '' }
      : { start: prev.getEnd(), end: el.getEnd(), text: '' }
  }
  return null
}

const usesIdentifier = (node, name, sf, skip) => {
  let used = false
  const visit = (n) => {
    if (used || n === skip) return
    if (ts.isIdentifier(n) && n.text === name) {
      const p = n.parent
      const member =
        (ts.isPropertyAccessExpression(p) && p.name === n) || ts.isImportSpecifier(p)
      if (!member) used = true
    }
    ts.forEachChild(n, visit)
  }
  visit(node)
  return used
}

for (const mod of modules) {
  const dir = path.join('src', 'modules', mod)
  const files = fs.readdirSync(dir)
  const serviceFiles = files
    .filter((f) => f.endsWith('.service.ts'))
    .map((f) => path.join(dir, f))
  const controllerFiles = files
    .filter((f) => f.endsWith('.controller.ts'))
    .map((f) => path.join(dir, f))

  for (const serviceFile of serviceFiles) {
    let text = read(serviceFile)
    let sf = parse(serviceFile, text)
    const cls = serviceClass(sf)
    if (!cls) continue
    const className = cls.name.text
    const done = new Map() // method -> { key, enumName, enumFrom, hasData, nullData, langIndex|null }
    const edits = []

    for (const m of cls.members) {
      if (!ts.isMethodDeclaration(m) || !m.body || !m.name || !ts.isIdentifier(m.name))
        continue
      const name = m.name.text
      const rets = returnsOf(m.body)
      const envs = rets.map((r) => ({ r, env: envelopeOf(r.expression, sf) }))
      const withMsg = envs.filter((e) => e.env)
      if (!withMsg.length) continue
      if (withMsg.some((e) => e.env === 'odd')) {
        report.push(`${className}.${name}: envelope of another shape, left as is`)
        continue
      }
      const keys = new Set(withMsg.map((e) => e.env.key))
      if (keys.size > 1) {
        report.push(
          `${className}.${name}: several messages (${[...keys].join(', ')}), left as is`
        )
        continue
      }
      if (withMsg.length !== rets.filter((r) => r.expression).length) {
        report.push(`${className}.${name}: some returns are not envelopes, left as is`)
        continue
      }
      const hasData = withMsg.some((e) => e.env.dataText !== null)
      const noData = withMsg.some((e) => e.env.dataText === null)
      if (hasData && noData) {
        report.push(`${className}.${name}: returns data and no data, left as is`)
        continue
      }
      const { key, enumName, langName } = withMsg[0].env
      for (const { r, env } of withMsg) {
        edits.push({
          start: r.getStart(sf),
          end: r.getEnd(),
          text: env.dataText !== null ? `return ${env.dataText}` : 'return'
        })
      }
      // lang still used once the messages are gone?
      const langParamIdx = m.parameters.findIndex(
        (p) => ts.isIdentifier(p.name) && p.name.text === langName
      )
      let langIndex = null
      if (langParamIdx >= 0) {
        const msgCalls = new Set(withMsg.map((e) => e.r))
        let stillUsed = false
        const visit = (n) => {
          if (stillUsed || msgCalls.has(n)) return
          if (ts.isIdentifier(n) && n.text === langName && !ts.isParameter(n.parent))
            stillUsed = true
          ts.forEachChild(n, visit)
        }
        visit(m.body)
        if (!stillUsed) {
          const p = m.parameters[langParamIdx]
          const prev = m.parameters[langParamIdx - 1]
          const next = m.parameters[langParamIdx + 1]
          if (next) {
            report.push(`${className}.${name}: lang is not the last parameter, kept`)
          } else {
            edits.push(
              prev
                ? { start: prev.getEnd(), end: p.getEnd(), text: '' }
                : { start: p.getStart(sf), end: p.getEnd(), text: '' }
            )
            langIndex = langParamIdx
          }
        }
      }
      done.set(name, {
        key,
        enumName,
        enumFrom: importOf(sf, enumName),
        hasData,
        nullData: withMsg.some((e) => e.env.nullData),
        langIndex
      })
    }
    if (!done.size) continue

    text = applyEdits(text, edits)
    // drop I18nService / message enums the service no longer uses
    // one edit per pass (reparse in between keeps ranges valid)
    for (let pass = 0; pass < 20; pass++) {
      sf = parse(serviceFile, text)
      const c = serviceClass(sf)
      let edit = null
      const ctor = c.members.find(ts.isConstructorDeclaration)
      const i18nParam = ctor?.parameters.find(
        (p) => p.type?.getText(sf) === 'I18nService'
      )
      if (i18nParam && !text.includes(`this.${i18nParam.name.getText(sf)}`)) {
        const i = ctor.parameters.indexOf(i18nParam)
        const prev = ctor.parameters[i - 1]
        const next = ctor.parameters[i + 1]
        edit = next
          ? { start: i18nParam.getStart(sf), end: next.getStart(sf), text: '' }
          : prev
            ? { start: prev.getEnd(), end: i18nParam.getEnd(), text: '' }
            : { start: i18nParam.getStart(sf), end: i18nParam.getEnd(), text: '' }
      }
      const body = sf.statements.filter((s) => !ts.isImportDeclaration(s))
      for (const name of [
        'I18nService',
        ...new Set([...done.values()].map((d) => d.enumName))
      ]) {
        if (edit) break
        if (importOf(sf, name) && !body.some((s) => usesIdentifier(s, name, sf)))
          edit = dropImportEdit(sf, name)
      }
      if (!edit) break
      text = applyEdits(text, [edit])
    }
    if (!DRY) fs.writeFileSync(serviceFile, text)
    console.log(`${serviceFile}: ${done.size} methods (${[...done.keys()].join(', ')})`)

    // controllers of this module that inject the service
    for (const controllerFile of controllerFiles) {
      let ctext = read(controllerFile)
      let csf = parse(controllerFile, ctext)
      const ccls = csf.statements.find((s) => ts.isClassDeclaration(s))
      const cctor = ccls?.members.find(ts.isConstructorDeclaration)
      const svcParam = cctor?.parameters.find((p) => p.type?.getText(csf) === className)
      if (!svcParam) continue
      const svcProp = svcParam.name.getText(csf)
      let i18nProp = cctor.parameters
        .find((p) => p.type?.getText(csf) === 'I18nService')
        ?.name.getText(csf)
      const needI18n = !i18nProp
      i18nProp ??= 'i18nService'
      const cedits = []
      const enums = new Map()
      let changed = 0
      for (const m of ccls.members) {
        if (!ts.isMethodDeclaration(m) || !m.body) continue
        const visit = (n) => {
          if (
            ts.isCallExpression(n) &&
            ts.isPropertyAccessExpression(n.expression) &&
            ts.isPropertyAccessExpression(n.expression.expression) &&
            n.expression.expression.name.text === svcProp &&
            n.expression.expression.expression.kind === ts.SyntaxKind.ThisKeyword
          ) {
            const method = n.expression.name.text
            const info = done.get(method)
            if (info) {
              const ret = n.parent
              if (
                !ts.isReturnStatement(ret) &&
                !(ts.isAwaitExpression(ret) && ts.isReturnStatement(ret.parent))
              ) {
                report.push(
                  `${controllerFile}: ${svcProp}.${method}(...) is not returned directly, fix by hand`
                )
              } else {
                const retStmt = ts.isReturnStatement(ret) ? ret : ret.parent
                const argTexts = n.arguments.map((a) => a.getText(csf))
                let langText = null
                if (info.langIndex !== null) {
                  if (argTexts.length > info.langIndex)
                    langText = argTexts.splice(info.langIndex, 1)[0]
                } else {
                  // lang kept in the service (data depends on it): reuse the handler's lang
                  const p = m.parameters.find(
                    (p) =>
                      p.decorators?.some?.((d) =>
                        d.getText(csf).startsWith('@I18nLang')
                      ) ||
                      ts
                        .getDecorators?.(p)
                        ?.some((d) => d.getText(csf).startsWith('@I18nLang'))
                  )
                  langText = p ? p.name.getText(csf) : null
                }
                if (!langText) {
                  report.push(
                    `${controllerFile}: ${method}: no lang to translate the message, fix by hand`
                  )
                } else {
                  const call = `this.${svcProp}.${method}(${argTexts.join(', ')})`
                  const msg = `this.${i18nProp}.translate(${info.key}, ${langText})`
                  const replacement = info.hasData
                    ? `return { message: ${msg}, data: await ${call} }`
                    : info.nullData
                      ? `await ${call}\n    return { message: ${msg}, data: null }`
                      : `await ${call}\n    return { message: ${msg} }`
                  cedits.push({
                    start: retStmt.getStart(csf),
                    end: retStmt.getEnd(),
                    text: replacement
                  })
                  if (!m.modifiers?.some((x) => x.kind === ts.SyntaxKind.AsyncKeyword))
                    cedits.push({
                      start: m.name.getStart(csf),
                      end: m.name.getStart(csf),
                      text: 'async '
                    })
                  enums.set(info.enumName, info.enumFrom)
                  changed++
                }
              }
            }
          }
          ts.forEachChild(n, visit)
        }
        visit(m.body)
      }
      if (!changed) continue
      // async modifier edits may repeat for one method
      const seen = new Set()
      const uniq = cedits.filter((e) =>
        e.text === 'async ' ? !seen.has(e.start) && seen.add(e.start) : true
      )
      if (needI18n) {
        const last = cctor.parameters[cctor.parameters.length - 1]
        uniq.push({
          start: last.getEnd(),
          end: last.getEnd(),
          text: `,\n    private readonly ${i18nProp}: I18nService`
        })
      }
      ctext = applyEdits(ctext, uniq)
      const imports = []
      if (needI18n && !importOf(csf, 'I18nService'))
        imports.push(`import { I18nService } from '@/i18n/i18n.service'`)
      for (const [name, from] of enums) {
        if (importOf(csf, name)) continue
        if (!from) report.push(`${controllerFile}: import ${name} by hand`)
        else
          imports.push(`import { ${name} } from '${from.startsWith('.') ? from : from}'`)
      }
      if (imports.length) ctext = imports.join('\n') + '\n' + ctext
      if (!DRY) fs.writeFileSync(controllerFile, ctext)
      console.log(`${controllerFile}: ${changed} handlers`)
    }
  }
}
if (report.length) console.log('\nLeft for a hand edit:\n  ' + report.join('\n  '))
