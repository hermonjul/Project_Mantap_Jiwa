// tangkap-peta.mjs, menangkap dist/peta-sumber.html menjadi gambar PNG.
//
// Jalankan sesudah npm run build:
//     node tools/tangkap-peta.mjs            semua peta
//     node tools/tangkap-peta.mjs 01 06      hanya peta yang id-nya diawali 01 atau 06
//
// Memakai Chrome atau Edge yang sudah terpasang dalam mode headless, dengan
// profil sementara supaya tidak mengganggu peramban yang sedang dibuka.
// Hasil di docs/peta/<id>.png.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const require = createRequire(import.meta.url)
const { PETA_SUMBER } = require(join(root, 'src', 'dokumentasi', 'peta-sumber.ts'))

const LEBAR = 1680
const SKALA = 1.5

const KANDIDAT = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
]
const peramban = KANDIDAT.find((p) => existsSync(p))
if (!peramban) throw new Error('Chrome atau Edge tidak ditemukan')

const halaman = join(root, 'dist', 'peta-sumber.html')
if (!existsSync(halaman)) throw new Error('Jalankan npm run build dulu')
const keluar = join(root, 'docs', 'peta')
mkdirSync(keluar, { recursive: true })

const profil = mkdtempSync(join(tmpdir(), 'peta-sumber-'))
const dasar = [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
  '--no-default-browser-check', `--user-data-dir=${profil}`,
  '--virtual-time-budget=4000', `--force-device-scale-factor=${SKALA}`,
]

function jalankan(args) {
  return execFileSync(peramban, [...dasar, ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] })
}

const saring = process.argv.slice(2)
const daftar = PETA_SUMBER.filter((p) => !saring.length || saring.some((s) => p.id.startsWith(s)))

try {
  for (const peta of daftar) {
    const url = pathToFileURL(halaman).href + '?peta=' + peta.id

    // Tahap 1, ukur tinggi halaman dari judul yang ditulis anotasi.js.
    const lebar = peta.lebar || LEBAR
    const dom = jalankan([`--window-size=${lebar},900`, '--dump-dom', url])
    const judul = (dom.match(/<title>([^<]*)<\/title>/) || [])[1] || ''
    if (!judul.startsWith('TINGGI:')) throw new Error(`${peta.id}: ${judul || 'judul tidak terbaca'}`)
    const tinggi = parseInt(judul.slice(7), 10)

    // Tahap 2, tangkap dengan tinggi yang pas.
    const berkas = join(keluar, peta.id + '.png')
    jalankan([`--window-size=${lebar},${tinggi}`, `--screenshot=${berkas}`, url])
    if (!existsSync(berkas)) throw new Error(`${peta.id}: gambar tidak terbentuk`)
    console.log(`✓ docs/peta/${peta.id}.png  ${lebar}x${tinggi}  ${peta.kotak.length} kotak`)
  }
} finally {
  rmSync(profil, { recursive: true, force: true })
}
