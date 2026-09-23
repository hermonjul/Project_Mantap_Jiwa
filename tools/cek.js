/* cek.js, penjalan probe.js di luar peramban.

   Membaca berkas hasil build, mengambil seluruh blok script, lalu
   menjalankannya bersama probe.js dalam satu konteks vm. DOM dipalsukan
   seadanya karena yang diperiksa hanya lapisan data, bukan tampilan. */
const fs = require('fs'), vm = require('vm')

function elemenPalsu() {
  const el = {
    innerHTML: '', textContent: '', value: '', dataset: {}, style: {},
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    appendChild() {}, setAttribute() {}, removeAttribute() {},
    getAttribute: () => null, addEventListener() {}, focus() {}, scrollIntoView() {},
    querySelector: () => elemenPalsu(), querySelectorAll: () => [],
    closest: () => null, remove() {},
  }
  return el
}

const html = fs.readFileSync('dist/uniport-executive-dashboard.html', 'utf8')
const js = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join('\n')

const doc = {
  getElementById: () => elemenPalsu(),
  querySelector: () => elemenPalsu(),
  querySelectorAll: () => [],
  createElement: () => elemenPalsu(),
  documentElement: elemenPalsu(),
  body: elemenPalsu(),
  addEventListener() {},
}
const ctx = vm.createContext({
  console, document: doc,
  window: { scrollTo() {}, addEventListener() {}, matchMedia: () => ({ matches: false, addEventListener() {} }) },
  localStorage: { getItem: () => null, setItem() {} },
  matchMedia: () => ({ matches: false, addEventListener() {} }),
  setTimeout, clearTimeout,
})
/* Berkas pemeriksa bisa diganti lewat argumen, mis. node tools/cek.js tools/cek2.js */
const pemeriksa = process.argv[2] || require('path').join(__dirname, 'probe.js')
vm.runInContext(js + '\n' + fs.readFileSync(pemeriksa, 'utf8'), ctx)
