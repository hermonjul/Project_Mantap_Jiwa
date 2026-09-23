import { serverConfig } from '../config/server.mjs'
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const dist = join(root, 'dist')
const pages = new Map([
  ['/', 'uniport-executive-dashboard.html'],
  ['/uniport-executive-dashboard.html', 'uniport-executive-dashboard.html'],
  ['/peta-sumber.html', 'peta-sumber.html'],
])
const { port } = serverConfig

createServer(async (req, res) => {
  const pathname = new URL(req.url || '/', 'http://localhost').pathname
  const page = pages.get(pathname)
  if (!page) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('Halaman tidak ditemukan')
    return
  }
  try {
    const html = await readFile(join(dist, page))
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' })
    res.end(html)
  } catch {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('Jalankan npm.cmd run build terlebih dahulu')
  }
}).listen(port, '127.0.0.1', () => {
  console.log(`Dashboard: http://localhost:${port}/`)
})
