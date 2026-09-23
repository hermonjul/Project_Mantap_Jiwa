function roleAktif() { return ROLES.find((r) => r.id === STATE.role) }

function terapkanPeran(id) {
  STATE.role = id
  const r = roleAktif()
  const sel = document.getElementById('role-select') as HTMLSelectElement | null
  if (sel && sel.value !== id) sel.value = id
  STATE.unit = r.kunci.unit || null
  STATE.branch = r.kunci.branch || null
  STATE.mo = r.kunci.mo || null
  if (STATE.branch && !STATE.unit) STATE.unit = ORG.branchById(STATE.branch).unit
  if (STATE.mo && !STATE.branch) {
    const mo = DATA.MOS.find((m) => m.id === STATE.mo)
    STATE.branch = mo.branch; STATE.unit = mo.unit
  }
  render()
}

function batasPeran() {
  const k = roleAktif().kunci
  return k.mo ? 'mo' : k.branch ? 'branch' : k.unit ? 'unit' : 'nasional'
}

function tingkatSekarang() {
  if (STATE.mo) return 'mo'
  if (STATE.branch) return 'branch'
  if (STATE.unit) return 'unit'
  return 'nasional'
}

function render() {
  const root = document.getElementById('dash-root')
  const lvl = tingkatSekarang()
  root.innerHTML =
    lvl === 'mo' ? viewMO(STATE.mo)
      : lvl === 'branch' ? viewBranch(STATE.branch)
        : lvl === 'unit' ? viewUnit(STATE.unit)
          : viewNasional()
  renderScope()
  pasangAksi()
  window.scrollTo(0, 0)
}

function renderScope() {
  const batas = batasPeran()
  const r = roleAktif()
  const bagian = []
  const bolehUnit = batas === 'nasional' || batas === 'unit'
  const bolehBranch = bolehUnit || batas === 'branch'

  if (batas === 'nasional') bagian.push({ t: 'Nasional', go: {}, aktif: !STATE.unit })
  if (STATE.unit) bagian.push({
    t: ORG.unitById(STATE.unit).name, go: { unit: STATE.unit },
    aktif: !STATE.branch, klik: bolehUnit,
  })
  if (STATE.branch) bagian.push({
    t: ORG.branchById(STATE.branch).name, go: { unit: STATE.unit, branch: STATE.branch },
    aktif: !STATE.mo, klik: bolehBranch,
  })
  if (STATE.mo) bagian.push({ t: DATA.MOS.find((m) => m.id === STATE.mo).nama, aktif: true })

  const crumbs = bagian.map((s, i) => {
    const sep = i > 0 ? '<span class="sep">›</span>' : ''
    if (s.aktif || s.klik === false) return `${sep}<span class="cur">${esc(s.t)}</span>`
    return `${sep}<button type="button" data-crumb='${esc(JSON.stringify(s.go))}'>${esc(s.t)}</button>`
  }).join('')

  const lingkupTeks = {
    nasional: 'Mencakup semua cabang dan Marketing Officer',
    unit: 'Terbatas pada satu wilayah dan cabang di bawahnya',
    branch: 'Terbatas pada satu cabang dan Marketing Officer di dalamnya',
    mo: 'Terbatas pada portofolio milik sendiri',
  }[batas]

  const chip = (label, kanal, subKanal, judul) => {
    const on = STATE.kanal === kanal && STATE.subKanal === subKanal
    return `<button type="button" class="chip${on ? ' is-on' : ''}"
      data-kanal="${kanal === null ? '' : esc(kanal)}" data-subkanal="${subKanal === null ? '' : esc(subKanal)}"
      title="${esc(judul)}">${esc(label)}</button>`
  }

  const chipSub = (id) => ORG.KANAL[id].sub
    .map((s) => chip(s, id, s, `Hanya sub-channel ${s}`)).join('')

  document.getElementById('dash-scope').innerHTML = `
    <div class="dash-scope__inner">
      <nav class="crumbs" aria-label="Navigasi tingkat organisasi">${crumbs}</nav>
      <div class="scope-role">
        <span class="badge badge--navy">${esc(r.sub)}</span>
        <span>${esc(lingkupTeks)}</span>
      </div>
    </div>
    <div class="dash-scope__inner filter">
      <span class="filter__lbl">Channel</span>
      <div class="chips">
        ${chip('Semua', null, null, 'Tanpa filter channel')}
        ${chip('Direct', 'DIRECT', null, 'Direct, Corporate, dan Agency')}
        ${chip('Captive', 'CAPTIVE', null, 'Banking, Multifinance, Broker, dan Sinar Mas Group')}
        <span class="chips__sep"></span>
        ${chipSub('DIRECT')}
        <span class="chips__sep"></span>
        ${chipSub('CAPTIVE')}
      </div>
    </div>`
}

function pasangAksi() {
  const root = document.getElementById('dash-root')
  root.querySelectorAll<HTMLElement>('[data-goto-unit]').forEach((el) =>
    el.addEventListener('click', () => {
      STATE.unit = el.dataset.gotoUnit; STATE.branch = null; STATE.mo = null; render()
    }))
  root.querySelectorAll<HTMLElement>('[data-goto-branch]').forEach((el) =>
    el.addEventListener('click', () => {
      const id = el.dataset.gotoBranch
      STATE.branch = id; STATE.unit = ORG.branchById(id).unit; STATE.mo = null; render()
    }))
  root.querySelectorAll<HTMLElement>('[data-goto-mo]').forEach((el) =>
    el.addEventListener('click', (e) => {
      e.stopPropagation()
      const mo = DATA.MOS.find((m) => m.id === el.dataset.gotoMo)
      STATE.mo = mo.id; STATE.branch = mo.branch; STATE.unit = mo.unit; render()
    }))
  root.querySelectorAll<HTMLElement>('[data-export]').forEach((el) =>
    el.addEventListener('click', (e) => { e.stopPropagation(); exportCsv(el.dataset.export) }))

  document.querySelectorAll<HTMLElement>('[data-crumb]').forEach((el) =>
    el.addEventListener('click', () => {
      const go = JSON.parse(el.dataset.crumb)
      STATE.unit = go.unit || null; STATE.branch = go.branch || null; STATE.mo = null
      render()
    }))
  document.querySelectorAll<HTMLElement>('[data-kanal]').forEach((el) =>
    el.addEventListener('click', () => {
      STATE.kanal = el.dataset.kanal || null
      STATE.subKanal = el.dataset.subkanal || null
      render()
    }))
}

/* ── Unduh berkas ──
   Menjawab masukan Kantor Wilayah 1 mengenai tarikan data sampai dengan effort.
   Berjalan memakai data yang sedang ditampilkan, termasuk filter channel. */
function exportCsv(jenis) {
  const baris = []
  let nama = 'export'
  const sc = lingkup()
  const fl = saring()
  const akhiran = fl.subKanal ? '-' + fl.subKanal.replace(/\s+/g, '-').toLowerCase()
    : fl.kanal ? '-' + fl.kanal.toLowerCase() : ''

  if (jenis === 'kerja') {
    nama = 'daftar-kerja' + akhiran
    baris.push(['Prioritas', 'Nasabah atau prospek', 'Kanal', 'Sub-kanal', 'Status prospek', 'Effort terakhir',
      'Lini usaha', 'Sumber', 'Cabang', 'Marketing Officer', 'Potensi premi',
      'Batas waktu (hari)', 'Terlambat (hari)', 'Status jatuh tempo', 'Skor prioritas', 'Tindakan disarankan'])
    DATA.daftarKerja(sc, fl).urut.forEach((p, i) => {
      baris.push([i + 1, p.nama, p.kanal, p.subKanal, p.status, p.tahap, p.lini, p.sumber,
        ORG.branchById(p.branch).name, p.moNama, p.premi, p.sla, Math.max(0, p.telat),
        (DATA.BUCKET.find((x) => x.id === p.bucket) || { label: 'Di luar 7 hari' }).label,
        p.prioritas.toFixed(2), INS.nba(p).t])
    })
  } else if (jenis === 'unit') {
    nama = 'posisi-kantor-wilayah'
    baris.push(['Kantor Wilayah', 'Jumlah cabang', 'Produksi bulan berjalan', 'Target bulan berjalan',
      'Capaian bulan %', 'NWP tahun berjalan', 'Capaian tahun %', 'Rasio beban %',
      'Prospek aktif', 'Lewat tempo'])
    ORG.UNITS.forEach((u) => {
      const rr = DATA.ringkas({ unit: u.id })
      const dk = DATA.daftarKerja({ unit: u.id }, fl)
      baris.push([u.name, ORG.branchesOf(u.id).length, Math.round(rr.mtd.npw), Math.round(rr.targetMtd),
        (rr.capaian * 100).toFixed(1), Math.round(rr.ytd.npw), (rr.capaianYtd * 100).toFixed(1),
        (rr.ytd.rasio_beban * 100).toFixed(1), dk.aktif.length, dk.bucket.lewat.length])
    })
  } else if (jenis === 'cabang' && STATE.unit) {
    nama = 'matrix-cabang-' + STATE.unit.toLowerCase()
    baris.push(['Cabang', 'Kelas', 'Kota', 'Produksi bulan berjalan', 'Target bulan berjalan',
      'Capaian bulan %', 'Capaian tahun %', 'Prospek baru', 'Kunjungan', 'Telepon', 'Penawaran',
      'Follow up', 'Terbit', 'Hari tanpa aktivitas', 'Prospek aktif', 'Lewat tempo'])
    INS.effortIndex(INS.cabangStat(STATE.unit)).forEach((s) => {
      const dk = DATA.daftarKerja({ branch: s.b.id }, fl)
      baris.push([s.b.name, s.b.kelas, s.b.kota, Math.round(s.r.mtd.npw), Math.round(s.r.targetMtd),
        (s.capaian * 100).toFixed(1), (s.r.capaianYtd * 100).toFixed(1), s.r.mtd.prospek_baru,
        s.r.mtd.kunjungan, s.r.mtd.telp, s.r.mtd.penawaran, s.r.mtd.follow_up, s.r.mtd.terbit,
        s.diam, dk.aktif.length, dk.bucket.lewat.length])
    })
  } else if (jenis === 'mo' && STATE.branch) {
    nama = 'matrix-mo-' + ORG.branchById(STATE.branch).name.replace(/\s+/g, '-').toLowerCase()
    baris.push(['Marketing Officer', 'Kode', 'Cabang', 'Produksi bulan berjalan', 'Target bulan berjalan',
      'Capaian bulan %', 'Effort', 'Prospek aktif', 'Lewat tempo', 'Jatuh tempo hari ini'])
    ;(DATA.MO_BY_BRANCH.get(STATE.branch) || []).forEach((mi) => {
      const mo = DATA.MOS[mi]
      const rr = DATA.ringkas({ mo: mo.id })
      const dk = DATA.daftarKerja({ mo: mo.id }, fl)
      baris.push([mo.nama, mo.kode, ORG.branchById(mo.branch).name, Math.round(rr.mtd.npw),
        Math.round(rr.targetMtd), (rr.capaian * 100).toFixed(1), Math.round(rr.mtd.effort),
        dk.aktif.length, dk.bucket.lewat.length, dk.bucket.hariIni.length])
    })
  } else return

  const csv = '﻿' + baris.map((row) =>
    row.map((c) => (/[",;\n]/.test(String(c)) ? `"${String(c).replace(/"/g, '""')}"` : c)).join(';'),
  ).join('\r\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${nama}-PROTOTIPE-${DATA.hariIni.iso}.csv`
  document.body.appendChild(a)
  a.click()
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove() }, 0)
}

/* ── Tema ──
   Layar di ruang rapat dapat sangat terang atau justru gelap, sehingga pilihan
   tema disediakan manual dan tidak semata mengikuti setelan sistem. */
function pasangTombolTema() {
  const tombol = document.getElementById('btn-tema')
  const label = document.getElementById('tema-label')
  if (!tombol || !label) return
  const sistemGelap = !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)
  const sedangGelap = () => {
    const pilihan = document.documentElement.dataset.theme
    return pilihan === 'dark' || (!pilihan && sistemGelap)
  }
  const perbarui = () => { label.textContent = sedangGelap() ? 'Terang' : 'Gelap' }
  tombol.addEventListener('click', () => {
    document.documentElement.dataset.theme = sedangGelap() ? 'light' : 'dark'
    perbarui()
  })
  perbarui()
}

/* ── Inisialisasi ── */
let dashSiap = false
function initDash() {
  if (dashSiap) return
  dashSiap = true
  const sel = document.getElementById('role-select') as HTMLSelectElement
  sel.innerHTML = ROLES.map((r) => `<option value="${esc(r.id)}">${esc(r.label)}</option>`).join('')
  sel.addEventListener('change', () => terapkanPeran(sel.value))
  pasangTombolTema()
  render()
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initDash)
else initDash()
