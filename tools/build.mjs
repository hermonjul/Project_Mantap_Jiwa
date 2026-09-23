// Kompilasi TypeScript dan gabungkan semua aset menjadi HTML standalone.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const src = (file) => readFileSync(join(root, 'src', file), 'utf8')
import { scripts } from '../config/build.mjs'

function compile(file) {
  const source = src(file)
  if (!file.endsWith('.ts')) return source
  const result = ts.transpileModule(source, {
    fileName: file,
    reportDiagnostics: true,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
  })
  const errors = result.diagnostics?.filter((d) => d.category === ts.DiagnosticCategory.Error) || []
  if (errors.length) {
    const messages = errors.map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n'))
    throw new Error(`${file}: ${messages.join('; ')}`)
  }
  return result.outputText
}

function build(files) {
  const html = src('tampilan/index.html').replace('<!--INJECT:CSS-->', `<style>\n${src('tampilan/styles.css')}\n</style>`)
  return html.replace('<!--INJECT:JS-->', files.map((file) =>
    `<script>\n/* ${file} */\n${compile(file)}\n</script>`).join('\n'))
}

const out = join(root, 'dist')
mkdirSync(out, { recursive: true })
for (const [filename, files] of [
  ['uniport-executive-dashboard.html', scripts],
  ['peta-sumber.html', [...scripts, 'dokumentasi/peta-sumber.ts', 'dokumentasi/anotasi.ts']],
]) {
  let html = build(files)
  if (filename === 'peta-sumber.html') {
    html = html.replace(/<title>[^<]*<\/title>/, '<title>Peta Sumber Data, Uniport Executive Dashboard</title>')
  }
  writeFileSync(join(out, filename), html, 'utf8')
  console.log(`${filename}: ${(Buffer.byteLength(html, 'utf8') / 1024).toFixed(1)} KB`)
}
