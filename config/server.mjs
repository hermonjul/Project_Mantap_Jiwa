// Hanya untuk Node/server. Tidak boleh dimasukkan ke daftar aset browser.
import { loadEnvFile } from 'node:process'
import { fileURLToPath } from 'node:url'

try {
  loadEnvFile(fileURLToPath(new URL('../.env', import.meta.url)))
} catch (error) {
  if (error.code !== 'ENOENT') throw error
}

const port = Number(process.env.PORT || 3000)
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT harus berupa angka 1 sampai 65535')
}

export const serverConfig = Object.freeze({ port })
