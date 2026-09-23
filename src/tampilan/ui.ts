// Komponen presentasi bersama. Tipe dipakai saat pengembangan, lalu dihapus saat build.
type CardTone = string
type CardOptions = {
  kelas?: string
  judul?: string
  sub?: string
  alat?: string
  tone?: CardTone
}
type BandOptions = { note?: string; why?: boolean }
type StatOptions = { unit?: string; foot?: string; spark?: string; kelas?: string }

const card = (isi: string, { kelas = '', judul = '', sub = '', alat = '', tone = '' }: CardOptions = {}): string => `
  <section class="card ${kelas}${tone && !judul ? ' card--pita' : ''}"${tone ? ` data-tone="${tone}"` : ''}>
    ${judul ? `<div class="card__head"><div><div class="card__title">${judul}</div>
      ${sub ? `<div class="card__sub">${sub}</div>` : ''}</div>
      ${alat ? `<div class="card__tools">${alat}</div>` : ''}</div>` : ''}
    ${isi}
  </section>`

const band = (judul: string, isi: string, { note = '', why = false }: BandOptions = {}): string => `
  <section class="band">
    <div class="band__head"><h2 class="band__title">${esc(judul)}</h2>
      ${note ? `<span class="band__note${why ? ' band__note--why' : ''}">${note}</span>` : ''}</div>
    ${isi}
  </section>`

const stat = (label: string, val: string | number, { unit = '', foot = '', spark = '', kelas = '' }: StatOptions = {}): string => `
  <div class="stat ${kelas}">
    <span class="stat__label">${esc(label)}</span>
    <span class="stat__val">${val}${unit ? `<span class="stat__unit">${esc(unit)}</span>` : ''}</span>
    ${foot ? `<span class="stat__foot">${foot}</span>` : ''}
    ${spark ? `<span class="stat__spark">${spark}</span>` : ''}
  </div>`
