'use strict'

const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')
const pug = require('pug')
const vtc = require('vue-template-compiler')

const ROOT = path.resolve(__dirname, '..')
const RENDERER_DIR = path.join(ROOT, 'renderer')

function walkVueFiles (dir, out = []) {
  if (!fs.existsSync(dir)) { return out }
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.nuxt' || entry.name === 'dist') { continue }
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walkVueFiles(full, out)
    } else if (/\.vue$/i.test(entry.name)) {
      out.push(path.relative(ROOT, full))
    }
  }
  return out
}

function getChangedVueFiles () {
  const out = execFileSync(
    'git',
    ['status', '--porcelain'],
    { cwd: ROOT, encoding: 'utf8' }
  )
  return out
    .split(/\r?\n/)
    .map(line => line.slice(3).trim())
    .filter(s => s && !s.startsWith('D ') && /\.vue$/i.test(s))
}

function dedentPug (raw) {
  const lines = raw.replace(/^\r?\n/, '').split(/\r?\n/)
  let minIndent = Infinity
  for (const line of lines) {
    if (!line.trim()) { continue }
    const m = line.match(/^[ \t]*/)
    if (m && m[0].length < minIndent) {
      minIndent = m[0].length
    }
  }
  if (!Number.isFinite(minIndent) || minIndent === 0) {
    return lines.join('\n')
  }
  return lines.map(line => (line.trim() ? line.slice(minIndent) : '')).join('\n')
}

function checkVueFile (relPath) {
  const absPath = path.resolve(ROOT, relPath)
  if (!fs.existsSync(absPath)) { return [] }
  const source = fs.readFileSync(absPath, 'utf8')
  const errors = []

  const tplMatch = source.match(/<template([^>]*)>([\s\S]*?)<\/template>/)
  if (tplMatch) {
    const attrs = tplMatch[1] || ''
    const body = tplMatch[2]
    try {
      const html = /lang=["']pug["']/.test(attrs)
        ? pug.render(dedentPug(body), { filename: absPath })
        : body
      const compiled = vtc.compile(html)
      if (compiled.errors && compiled.errors.length > 0) {
        compiled.errors.forEach(err => errors.push(`[template] ${err}`))
      }
    } catch (err) {
      errors.push(`[template] ${err.message}`)
    }
  }
  return errors
}

function main () {
  const args = process.argv.slice(2).filter(Boolean)
  let targets
  if (args.includes('--all')) {
    targets = walkVueFiles(RENDERER_DIR)
  } else if (args.length > 0) {
    targets = args
  } else {
    targets = getChangedVueFiles()
  }

  if (targets.length === 0) {
    console.log('[check-vue] 無待檢查的 .vue 檔案，略過。')
    process.exit(0)
  }

  let hasError = false
  for (const file of targets) {
    const errs = checkVueFile(file)
    if (errs.length > 0) {
      hasError = true
      console.error(`[check-vue] ${file} 樣板檢查失敗：`)
      errs.forEach(e => console.error(`  ${e}`))
    } else {
      console.log(`[check-vue] 樣板通過: ${file}`)
    }
  }

  if (hasError) {
    process.exit(1)
  }
  console.log(`[check-vue] 全部通過 (${targets.length} 個檔案)`)
}

main()
