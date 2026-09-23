/* ═════════════════════════════════════════════════════════════════
   views.js, empat seksi per peran, penyaring kanal, dan navigasi berjenjang.

   Susunan seksi disamakan untuk seluruh peran, yaitu Ringkasan, Perlu
   tindakan, Kinerja, lalu AI Insight. Isinya yang menyesuaikan tingkat
   organisasi. Rincian yang tidak dibutuhkan setiap hari dipindahkan ke
   panel yang dapat dibuka tutup, bukan dihapus.

   Peran menentukan titik awal dan batas cakupan. Pimpinan Cabang tidak
   dapat naik ke tingkat wilayah, dan Marketing Officer hanya melihat
   portofolionya sendiri.
   ═════════════════════════════════════════════════════════════════ */

const ROLES = [
  { id: 'direksi', label: 'Direksi', sub: 'Nasional', kunci: {} },
  { id: 'pinwil1', label: 'Pemimpin Wilayah, Kanwil 1', sub: 'Wilayah', kunci: { unit: 'KANWIL1' } },
  { id: 'pinwil2', label: 'Pemimpin Wilayah, Kanwil 2', sub: 'Wilayah', kunci: { unit: 'KANWIL2' } },
  { id: 'pinwil3', label: 'Pemimpin Wilayah, Kanwil 3', sub: 'Wilayah', kunci: { unit: 'KANWIL3' } },
  { id: 'pincab', label: '', sub: 'Cabang', kunci: { branch: null } },
  { id: 'mo', label: '', sub: 'Marketing Officer', kunci: { mo: null } },
]

/* Cabang contoh untuk peran Pimpinan Cabang diambil dari cabang yang pada
   simulasi effort menunjukkan aktivitas tinggi dengan konversi rendah,
   sehingga peragaan memiliki bahan pembahasan. */
{
  const idBoros = Object.keys(DATA.ANOMALI).find((k) => DATA.ANOMALI[k].jenis === 'effort_boros')
  const cabang = ORG.branchById(idBoros) || ORG.BRANCHES[0]
  const rCab = ROLES.find((x) => x.id === 'pincab')
  rCab.kunci.branch = cabang.id
  rCab.label = 'Pimpinan Cabang, ' + cabang.name

  const mo = DATA.MOS.find((m) => m.branch === cabang.id)
  const rMo = ROLES.find((x) => x.id === 'mo')
  rMo.kunci.mo = mo.id
  rMo.label = 'Marketing Officer, ' + mo.nama
}

const STATE = { role: 'direksi', unit: null, branch: null, mo: null, kanal: null, subKanal: null }

const lingkup = () => ({ unit: STATE.unit, branch: STATE.branch, mo: STATE.mo })
const saring = () => ({ kanal: STATE.kanal, subKanal: STATE.subKanal })
const adaSaringan = () => !!(STATE.kanal || STATE.subKanal)

/* ── Pembantu render ── */
/* Kartu bertone tanpa judul diberi pita aksen di sisi atas agar tetap
   terbaca sebagai satu kelompok warna. */
/* Panel rincian memakai elemen details bawaan peramban, tanpa JavaScript
   tambahan, sehingga tetap dapat dibuka meski skrip gagal dimuat. */
const rincian = (judul, sub, isi) => `
  <details class="rincian">
    <summary class="rincian__head">
      <span class="rincian__judul">${esc(judul)}</span>
      <span class="rincian__sub">${esc(sub)}</span>
    </summary>
    <div class="rincian__isi">${isi}</div>
  </details>`

const insightList = (items) => items.length
  ? items.map((i) => `
    <div class="insight">
      <span class="insight__mark insight__mark--${i.tone}">${IK[i.tone]}</span>
      <div class="insight__body">
        <div class="insight__head">${esc(i.head)}</div>
        <div class="insight__text">${i.text}</div>
        ${i.act ? `<div class="insight__act">Tindak lanjut: ${esc(i.act)}</div>` : ''}
      </div>
    </div>`).join('')
  : `<div class="hint">Tidak terdapat temuan yang perlu perhatian khusus pada periode ini.</div>`

const DISCLAIM = `<p class="disclaim">Temuan disusun otomatis berdasarkan aturan atas data simulasi.
  Pada penerapan sebenarnya, lapisan ini ditenagai model bahasa dan
  <strong>tetap memerlukan verifikasi manusia</strong> sebelum ditindaklanjuti.</p>`

const KOSONG = '<span class="hint">tidak ada</span>'

function badgeCapaian(v) {
  const k = v >= 1 ? 'pos' : v >= 0.85 ? 'warn' : 'neg'
  return `<span class="badge badge--${k}">${DATA.FMT.pct(v)}</span>`
}
function badgeEffort(v) {
  const k = v >= 1.3 ? 'navy' : v >= 0.75 ? 'mute' : 'neg'
  return `<span class="badge badge--${k}">${DATA.FMT.pct(v)}</span>`
}
/* Warna badge dipilih menurut suhu prospek, bukan menurut baik buruknya.
   Teksnya tetap ditulis penuh supaya status terbaca tanpa mengandalkan warna. */
const TONE_STATUS = {
  Hot: 'neg', Warm: 'warn', Cold: 'mute',
  'Terbit Polis': 'pos', Pending: 'mute', Batal: 'mute',
}
function badgeStatus(k) {
  const t = ORG.STATUS_KET[k] || ''
  return `<span class="badge badge--${TONE_STATUS[k] || 'mute'}" title="${esc(t)}">${esc(k)}</span>`
}
function badgeKanal(sub) {
  const k = ORG.KANAL_DARI_SUB[sub]
  return `<span class="tag tag--${k === 'DIRECT' ? 'direct' : 'captive'}">${esc(sub)}</span>`
}

/* Jatuh tempo ditulis sebagai kata, bukan angka mentah, supaya tidak perlu
   dihitung sendiri saat dibaca sekilas. */
function labelTenggat(telat) {
  if (telat > 0) return `<span class="badge badge--neg">telat ${telat} hari</span>`
  if (telat === 0) return `<span class="badge badge--warn">hari ini</span>`
  if (telat >= -3) return `<span class="badge badge--mute">${-telat} hari lagi</span>`
  return `<span class="hint">${-telat} hari lagi</span>`
}

/* ══════════════ Komponen kanal ══════════════ */

/* Batang komposisi Direct dan Captive. Pipeline selalu tersedia karena
   disimulasikan. Produksi menampilkan keterangan menunggu data selama
   export per channel belum masuk. */
function kanalRingkas(scope) {
  const pipe = DATA.kanalPipeline(scope, saring())
  const totalPremi = pipe.reduce((s, x) => s + x.premi, 0)
  const kel = ['DIRECT', 'CAPTIVE'].map((id) => {
    const isi = pipe.filter((x) => x.kanal === id)
    return {
      l: ORG.KANAL[id].label,
      c: id === 'DIRECT' ? 'var(--s2)' : 'var(--pos)',
      v: isi.reduce((s, x) => s + x.premi, 0),
      n: isi.reduce((s, x) => s + x.n, 0),
    }
  })

  const prod = DATA.kanalProduksi(scope)
  const blokProduksi = prod
    ? (() => {
      const kelP = ['DIRECT', 'CAPTIVE'].map((id) => ({
        l: ORG.KANAL[id].label,
        c: id === 'DIRECT' ? 'var(--s2)' : 'var(--pos)',
        v: prod.filter((x) => x.kanal === id).reduce((s, x) => s + x.nwp, 0),
      }))
      return `<div class="kanal-baris">
          <span class="kanal-baris__lbl">Produksi</span>
          ${CH.stack(kelP, { h: 22 })}
          ${CH.legend(kelP.map((x) => ({ ...x, n: DATA.FMT.rpShort(x.v) })))}
        </div>`
    })()
    : `<div class="kanal-baris kanal-baris--tunggu">
        <span class="kanal-baris__lbl">Produksi</span>
        <div class="tunggu">
          ${IK.info}
          <span>Menunggu export produksi per channel dari eReport.
          Rincian kolom yang dibutuhkan ada di README.</span>
        </div>
      </div>`

  return `<div class="kanal-panel">
    <div class="kanal-baris">
      <span class="kanal-baris__lbl">Pipeline prospek</span>
      ${CH.stack(kel, { h: 22 })}
      ${CH.legend(kel.map((x) => ({ ...x, n: DATA.FMT.n(x.n) + ' prospek, ' + DATA.FMT.rpShort(x.v) })))}
    </div>
    ${blokProduksi}
    <p class="hint hint--why"><b>Direct</b> mencakup Direct, Corporate, dan Agency.
    <b>Captive</b> mencakup Banking, Multifinance, Broker, dan Sinar Mas Group. Istilah Captive
    di sini berarti channel berperantara, berbeda dari pemakaian pada Rapim yang menunjuk
    asuransi milik grup mitra.</p>
    <p class="hint">Komposisi produksi bersumber dari export eReport per channel. Karena basis
    ukurnya berbeda dari file produksi, yang diambil hanya persentasenya, lalu diterapkan ke
    NWP 2026 tiap cabang sehingga totalnya tetap sama persis. Komposisi pipeline masih simulasi,
    disusun mengikuti komposisi produksi tiap cabang.</p>
  </div>`
}

/* Rincian per sub-channel, dipakai di panel rincian. */
function kanalRinci(scope) {
  const pipe = DATA.kanalPipeline(scope, saring())
  const prod = DATA.kanalProduksi(scope)
  const maxN = Math.max(...pipe.map((x) => x.n), 1)
  return `<div class="tbl-wrap"><table class="tbl">
    <thead><tr><th>Sub-channel</th><th>Kelompok</th><th class="r">Prospek</th><th>Porsi</th>
      <th class="r">Potensi premi</th><th class="r">Perlu tindakan</th><th class="r">Produksi</th></tr></thead>
    <tbody>${pipe.map((x) => `
      <tr>
        <td class="tbl__name">${esc(x.sub)}</td>
        <td>${badgeKanal(x.sub)}</td>
        <td class="r">${DATA.FMT.n(x.n)}</td>
        <td>${CH.bar(x.n / maxN, x.kanal === 'DIRECT' ? '' : 'mini-bar--pos')}</td>
        <td class="r">${DATA.FMT.rp(x.premi)}</td>
        <td class="r">${x.perlu ? `<span class="badge badge--neg">${DATA.FMT.n(x.perlu)}</span>` : KOSONG}</td>
        <td class="r">${prod
          ? DATA.FMT.rp((prod.find((p) => p.sub === x.sub) || {}).nwp || 0)
          : '<span class="hint">menunggu data</span>'}</td>
      </tr>`).join('')}</tbody></table></div>
    <p class="hint">Kolom produksi bersumber dari export eReport per channel. Kolom prospek dan
    potensi premi masih simulasi, dengan komposisi yang disusun mengikuti komposisi produksi
    cabang ini.</p>`
}

/* ══════════════ Komponen daftar kerja ══════════════ */

function kartuBucket(dk) {
  return `<div class="grid grid--4">${DATA.BUCKET.map((b) => {
    const isi = dk.bucket[b.id]
    const nilai = isi.reduce((s, p) => s + p.premi, 0)
    return card(stat(b.label, DATA.FMT.n(isi.length), {
      foot: `Potensi premi ${DATA.FMT.rp(nilai)}`,
      spark: isi.length
        ? `<span class="hint">${isi.filter((p) => p.status === 'Hot').length} berstatus Hot</span>`
        : '<span class="hint">tidak ada yang tertahan</span>',
    }), { tone: b.tone })
  }).join('')}</div>`
}

function tabelKerja(dk, { batas = 12, tampilMO = true, tampilCabang = false } = {}) {
  const baris = dk.urut.slice(0, batas)
  if (!baris.length) {
    return `<div class="hint">Tidak ada prospek yang menunggu tindak lanjut pada lingkup ini.</div>`
  }
  return `<div class="tbl-wrap${baris.length > 14 ? ' tbl-wrap--tinggi' : ''}"><table class="tbl">
    <thead><tr>
      <th></th><th>Nasabah atau prospek</th><th>Sub-channel</th><th>Status</th><th>Effort terakhir</th>
      ${tampilCabang ? '<th>Cabang</th>' : ''}
      ${tampilMO ? '<th>Marketing Officer</th>' : ''}
      <th class="r">Potensi premi</th><th class="r">Jatuh tempo</th><th>Tindakan disarankan</th>
    </tr></thead>
    <tbody>${baris.map((p, i) => `
      <tr>
        <td class="tbl__rank">${i + 1}</td>
        <td><div class="tbl__name">${esc(p.nama)}</div>
            <div class="tbl__sub">${esc(p.lini)}, ${esc(p.sumber)}</div></td>
        <td>${badgeKanal(p.subKanal)}</td>
        <td>${badgeStatus(p.status)}</td>
        <td>${esc(p.tahap)}</td>
        ${tampilCabang ? `<td><span class="tbl__sub">${esc(ORG.branchById(p.branch).name)}</span></td>` : ''}
        ${tampilMO ? `<td><span class="tbl__sub">${esc(p.moNama)}</span></td>` : ''}
        <td class="r">${DATA.FMT.rp(p.premi)}</td>
        <td class="r">${labelTenggat(p.telat)}</td>
        <td><span class="tbl__sub">${esc(INS.nba(p).t)}</span></td>
      </tr>`).join('')}</tbody></table></div>
    ${dk.urut.length > batas
      ? `<p class="hint">Menampilkan ${batas} teratas dari ${DATA.FMT.n(dk.urut.length)} prospek aktif,
         diurutkan berdasarkan skor prioritas yang menggabungkan status prospek, nilai premi, dan lama keterlambatan.</p>`
      : ''}
    ${ketStatus()}`
}

/* Keterangan status ditulis lengkap di layar, bukan hanya sebagai tooltip.
   Kalimatnya dikutip dari Matrix Distribution supaya istilah di prototipe dan
   di aplikasi yang dipakai sehari-hari terbaca sama persis. */
function ketStatus() {
  return `<div class="ket-status">
    <span class="ket-status__judul">Arti status</span>
    ${ORG.STATUS_HIDUP.map((k) => `
      <span class="ket-status__item">${badgeStatus(k)} ${esc(ORG.STATUS_KET[k])}</span>`).join('')}
    <span class="ket-status__sumber">Mengikuti keterangan pada Matrix Distribution.</span>
  </div>`
}

/* Distribusi beban tindak lanjut per unit di bawahnya, agar terlihat di mana
   penumpukannya. */
function sebaranKerja(daftar, { kolom, gotoAttr }) {
  const rows = daftar.map((d) => {
    const dk = DATA.daftarKerja(d.scope, saring())
    return { d, dk, lewat: dk.bucket.lewat.length, hariIni: dk.bucket.hariIni.length }
  }).sort((a, b) => b.lewat - a.lewat)
  const maxLewat = Math.max(...rows.map((r) => r.lewat), 1)

  return `<div class="tbl-wrap${rows.length > 8 ? ' tbl-wrap--tinggi' : ''}"><table class="tbl tbl--click">
    <thead><tr><th></th><th>${esc(kolom)}</th><th class="r">Lewat tempo</th><th>Beban</th>
      <th class="r">Hari ini</th><th class="r">Prospek aktif</th>
      <th class="r">Nilai perlu tindakan</th></tr></thead>
    <tbody>${rows.map((r, i) => `
      <tr ${gotoAttr}="${esc(r.d.id)}">
        <td class="tbl__rank">${i + 1}</td>
        <td><div class="tbl__name">${esc(r.d.nama)}</div>
            ${r.d.sub ? `<div class="tbl__sub">${esc(r.d.sub)}</div>` : ''}</td>
        <td class="r">${r.lewat ? `<span class="badge badge--neg">${DATA.FMT.n(r.lewat)}</span>` : KOSONG}</td>
        <td>${CH.bar(r.lewat / maxLewat, 'mini-bar--neg')}</td>
        <td class="r">${DATA.FMT.n(r.hariIni)}</td>
        <td class="r">${DATA.FMT.n(r.dk.aktif.length)}</td>
        <td class="r">${DATA.FMT.rp(r.dk.nilaiPerluTindakan)}</td>
      </tr>`).join('')}</tbody></table></div>`
}

/* ── Statistik agregat per unit ── */
function unitStats() {
  const rows = ORG.UNITS.map((u) => {
    const r = DATA.ringkas({ unit: u.id })
    const nMo = (DATA.MO_BY_UNIT.get(u.id) || []).length || 1
    return { u, r, nMo, effortPerMo: r.mtd.effort / nMo, eIdx: 0, konversi: 0 }
  })
  const rata = rows.reduce((s, x) => s + x.effortPerMo, 0) / (rows.length || 1) || 1
  rows.forEach((x) => {
    x.eIdx = x.effortPerMo / rata
    x.konversi = x.r.mtd.prospek_baru > 0 ? x.r.mtd.terbit / x.r.mtd.prospek_baru : 0
  })
  return rows
}

function labelMingguTerakhir(n) {
  const out = []
  for (let w = DATA.NW - n; w < DATA.NW; w++) {
    const idx = DATA.WEEK_OF.findIndex((x) => x === w)
    out.push(DATA.FMT.tglPendek(DATA.DAYS[idx < 0 ? 0 : idx].iso))
  }
  return out
}

function statusPremi(list) {
  const s = (fn) => list.filter(fn).reduce((a, p) => a + p.premi, 0)
  return [
    { l: 'Terbit polis', c: 'var(--pos)', v: s((p) => p.status === 'Terbit Polis') },
    { l: 'Hot', c: 'var(--s3)', v: s((p) => p.status === 'Hot') },
    { l: 'Warm', c: 'var(--s5)', v: s((p) => p.status === 'Warm') },
    { l: 'Cold', c: 'var(--s2)', v: s((p) => p.status === 'Cold') },
    { l: 'Pending dan batal', c: 'var(--sc-highest)', v: s((p) => ['Pending', 'Batal'].includes(p.status)) },
  ]
}

/* ══════════════ SEKSI TAMBAHAN, ORANG KUNCI DAN MO TURUN ══════════════

   Dua seksi ini menjawab pertanyaan yang muncul dari analisa produksi per
   Marketing Officer, dan sengaja dibuat berdampingan karena keduanya bicara
   soal orang, bukan soal angka cabang.

   Semua penilaian ditulis sebagai kata, bukan hanya diwakili warna. Sebagian
   besar pembaca dashboard ini sudah berumur, dan sebagian tidak dapat
   membedakan warna dengan andal. */

function labelRisiko(t) {
  const k = { tinggi: 'neg', sedang: 'warn', rendah: 'pos' }[t] || 'mute'
  const s = { tinggi: 'Bertumpu satu orang', sedang: 'Perlu diperhatikan', rendah: 'Menyebar' }[t] || t
  return `<span class="badge badge--${k}">${esc(s)}</span>`
}

function bandOrangKunci(scope, { judul = 'Ketergantungan orang kunci' } = {}) {
  const ro = DATA.risikoOrang(scope)
  if (!ro.semua.length) {
    return band(judul, card(`<p class="hint">Belum ada cabang dalam lingkup ini yang produksinya
      melewati ${DATA.FMT.rp(DATA.AMBANG_UNIT)}, sehingga belum ada yang dinilai.</p>`,
      { judul: 'Belum ada yang dinilai', tone: 'biru' }))
  }

  const baris = ro.semua.slice(0, 20)
  return band(judul, `
    <div class="grid grid--3">
      ${card(stat('Cabang bertumpu satu orang', DATA.FMT.n(ro.tinggi.length), {
        foot: `Dari ${DATA.FMT.n(ro.semua.length)} cabang berproduksi di atas ${DATA.FMT.rp(DATA.AMBANG_UNIT)}`,
      }), { tone: ro.tinggi.length ? 'merah' : 'hijau' })}
      ${card(stat('Nilai yang duduk di satu orang', DATA.FMT.rp(ro.nilaiTinggi), {
        foot: `${DATA.FMT.pct(ro.porsiNasional, 1)} dari produksi nasional tujuh bulan`,
      }), { tone: 'emas' })}
      ${card(stat('Perlu diperhatikan', DATA.FMT.n(ro.sedang.length), {
        foot: `Porsi terbesar antara ${DATA.FMT.pct(DATA.AMBANG_RISIKO.sedang)} dan ${DATA.FMT.pct(DATA.AMBANG_RISIKO.tinggi)}`,
      }), { tone: 'biru' })}
    </div>

    ${card(`
      <div class="tbl-wrap tbl-wrap--tinggi"><table class="tbl">
        <thead><tr>
          <th>Cabang</th><th class="r">Jumlah MO</th><th class="r">Produksi 2026</th>
          <th>Marketing Officer terbesar</th><th class="r">Porsi</th><th>Penilaian</th>
        </tr></thead>
        <tbody>${baris.map((x) => `
          <tr>
            <td><div class="tbl__name">${esc(x.nama)}</div><div class="tbl__sub">${esc(ORG.unitById(x.unit).name)}</div></td>
            <td class="r">${DATA.FMT.n(x.nMo)}</td>
            <td class="r">${DATA.FMT.rp(x.nwp)}</td>
            <td>${esc(x.moNama)}</td>
            <td class="r"><b>${DATA.FMT.pct(x.porsi)}</b></td>
            <td>${labelRisiko(x.tingkat)}</td>
          </tr>`).join('')}</tbody>
      </table></div>
      <p class="hint">Dibaca begini: pada ${esc(baris[0].nama)}, ${DATA.FMT.pct(baris[0].porsi)}
        produksi 2026 dihasilkan oleh ${esc(baris[0].moNama)} seorang. Bila yang bersangkutan
        berhalangan atau pindah, sebesar itulah produksi yang perlu digantikan.
        Cabang berproduksi di bawah ${DATA.FMT.rp(DATA.AMBANG_UNIT)} tidak dinilai, supaya cabang
        kecil beranggota sedikit tidak ikut ramai.</p>`,
      { judul: 'Cabang menurut porsi Marketing Officer terbesar', sub: 'Diurutkan dari yang paling terpusat', tone: 'navy' })}`,
    { note: 'Dihitung dari produksi 2026 tiap Marketing Officer pada berkas eReport. Angka nyata, bukan simulasi.' })
}

function bandMoTurun(scope) {
  const mt = DATA.moTurun(scope)
  const judul = 'Perlu ditanyakan'
  if (!mt.turun.length) {
    return band(judul, card(`<p class="hint">Tidak ada Marketing Officer dalam lingkup ini yang
      tahun lalu berproduksi di atas ${DATA.FMT.rp(DATA.AMBANG_TURUN)} lalu berhenti pada 2026.</p>`,
      { judul: 'Tidak ada yang perlu ditanyakan', tone: 'hijau' }))
  }

  const pemilahan = mt.nasional ? `
    <div class="grid grid--3">
      ${card(stat('Perlu ditanyakan', DATA.FMT.n(mt.turun.length), {
        foot: `Tahun lalu di atas ${DATA.FMT.rp(DATA.AMBANG_TURUN)}, tahun ini nol atau minus`,
      }), { tone: 'merah' })}
      ${card(stat('Sudah kecil sejak tahun lalu', DATA.FMT.n(mt.kecilSejakDulu), {
        foot: 'Persoalan struktural, bukan penurunan mendadak',
      }), { tone: 'biru' })}
      ${card(stat('Baru bergabung', DATA.FMT.n(mt.baru), {
        foot: 'Belum ada catatan produksi 2025, wajar belum berkontribusi',
      }), { tone: 'hijau' })}
    </div>` : ''

  return band(judul, `
    ${pemilahan}
    ${card(`
      <p class="peringatan">Daftar ini bahan percakapan dengan atasan langsung, bukan penilaian
        kinerja. Produksi bisa jatuh karena pindah peran, cuti panjang, portofolio dialihkan, atau
        pembatalan besar yang bukan berasal dari yang bersangkutan. Tanyakan dulu, jangan simpulkan
        dari angka saja.</p>
      <div class="tbl-wrap tbl-wrap--tinggi"><table class="tbl">
        <thead><tr>
          <th>Marketing Officer</th><th>Cabang</th>
          <th class="r">Produksi 2025</th><th class="r">Produksi 2026</th>
          <th class="r">Selisih</th><th>Kantor Wilayah</th>
        </tr></thead>
        <tbody>${mt.turun.map((x) => `
          <tr>
            <td class="tbl__name">${esc(x.nama)}</td>
            <td>${esc(x.cabang)}</td>
            <td class="r">${DATA.FMT.rp(x.p25)}</td>
            <td class="r">${DATA.FMT.rp(x.p26)}</td>
            <td class="r"><b class="neg">${DATA.FMT.rp(x.selisih)}</b></td>
            <td><span class="tbl__sub">${esc(ORG.unitById(x.unit).name)}</span></td>
          </tr>`).join('')}</tbody>
      </table></div>
      <p class="hint">Gabungan produksi 2025 yang dibawa ${DATA.FMT.n(mt.turun.length)} nama ini
        ${DATA.FMT.rp(mt.nilai25)}. Ambang yang dipakai ${DATA.FMT.rp(DATA.AMBANG_TURUN)} pada 2025,
        dengan produksi 2026 nol atau minus. Angka minus berarti pembatalan dan penurunan endorsemen
        melampaui bisnis baru, bukan berarti tidak bekerja.
        <br>Nilai pada kedua kolom tahun memakai basis ukur berkas Production Longterm, yang
        sedikit berbeda dari NWP pada berkas produksi. Keduanya sah dibandingkan satu sama lain
        karena berasal dari sumber yang sama, tapi jangan disandingkan dengan angka NWP di seksi lain.</p>`,
      { judul: 'Berproduksi tahun lalu, berhenti tahun ini', sub: 'Diurutkan dari produksi 2025 terbesar', tone: 'emas' })}`,
    { note: 'Dihitung dari perbandingan produksi 2025 dan 2026 tiap Marketing Officer pada berkas eReport. Angka nyata, bukan simulasi.' })
}

/* ══════════════ SEKSI 1, RINGKASAN ══════════════ */
function bandRingkas(scope, { judul = 'Ringkasan', catatan = '' } = {}) {
  const r = DATA.ringkas(scope)
  const dk = DATA.daftarKerja(scope, saring())
  const hari = DATA.hariIni
  const set = DATA.moSet(scope)
  const spark30 = DATA.series(set, 'npw', DATA.idxHariIni - 29, DATA.idxHariIni)

  return band(judul, `
    <div class="grid grid--3">
      ${card(stat(`Produksi ${DATA.FMT.bulan(hari.month)}`, DATA.FMT.rp(r.mtd.npw), {
        foot: `${badgeCapaian(r.capaian)} terhadap target ${DATA.FMT.rp(r.targetMtd)} · ${CH.delta(r.wow)} mingguan`,
        spark: CH.spark(spark30),
      }), { kelas: 'card--navy' })}
      ${card(stat('Capaian tahun berjalan', DATA.FMT.pct(r.capaianYtd), {
        foot: `${DATA.FMT.rp(r.ytd.npw)} terhadap porsi ${DATA.BULAN_TERSEDIA} bulan dari target ${DATA.FMT.rp(r.targetTahun)}`,
        spark: CH.bar(r.capaianYtd, r.capaianYtd >= 1 ? 'mini-bar--pos' : r.capaianYtd >= 0.85 ? 'mini-bar--warn' : 'mini-bar--neg'),
      }), { tone: 'biru' })}
      ${card(stat('Perlu tindakan hari ini', DATA.FMT.n(dk.perluTindakan.length), {
        foot: `Potensi premi ${DATA.FMT.rp(dk.nilaiPerluTindakan)} · ${DATA.FMT.n(dk.bucket.lewat.length)} sudah lewat tempo`,
        spark: `<span class="hint">Prospek yang jatuh temponya hari ini atau sudah terlewat.</span>`,
      }), { tone: 'merah' })}
    </div>
    ${kanalRingkas(scope)}`, { note: catatan, why: !!catatan })
}

/* ══════════════ SEKSI PROYEKSI ══════════════
   Menjawab pertanyaan apakah target tahun ini akan tercapai.

   Dua perkiraan disajikan berdampingan dan sengaja tidak dijumlahkan.
   Produksi sisa tahun akan datang dari pipeline yang ada sekarang, sehingga
   menjumlahkan keduanya berarti menghitung sumber yang sama dua kali. */
function bandProyeksi(scope) {
  const pr = DATA.proyeksi(scope, saring())
  const nama = { tercapai: 'tercapai', ketat: 'ketat', tidak: 'tidak' }[pr.verdict]

  const segmen = [
    { l: `Realisasi ${DATA.BULAN_TERSEDIA} bulan`, c: 'var(--s1)', v: pr.realisasi },
    { l: `Perkiraan ${pr.sisaBulan} bulan sisa`, c: 'var(--s4)', v: pr.tambahanLaju },
  ]

  const ikon = pr.verdict === 'tercapai' ? IK.good : pr.verdict === 'ketat' ? IK.warn : IK.risk
  const kalimat = pr.verdict === 'tercapai'
    ? `Dengan rata-rata ${DATA.FMT.rp(pr.lajuBulanan)} per bulan, target
       ${DATA.FMT.rp(pr.target)} <b>diperkirakan tercapai</b> dengan kelebihan
       ${DATA.FMT.rp(pr.kurangLaju)}.`
    : `Dengan rata-rata ${DATA.FMT.rp(pr.lajuBulanan)} per bulan, proyeksi akhir tahun
       ${DATA.FMT.rp(pr.dariLaju)} atau <b>${DATA.FMT.pct(pr.capaianLaju, 1)}</b> dari target
       ${DATA.FMT.rp(pr.target)}. <b>Kurang ${DATA.FMT.rp(Math.abs(pr.kurangLaju))}</b>, yang berarti
       rata-rata bulanan harus naik menjadi ${DATA.FMT.rp((pr.target - pr.realisasi) / pr.sisaBulan)}
       atau ${DATA.FMT.pctSigned((pr.target - pr.realisasi) / pr.sisaBulan / pr.lajuBulanan - 1)}
       selama ${pr.sisaBulan} bulan tersisa.`

  const tahapIsi = pr.perStatus.filter((x) => x.n > 0)
  const maksBerbobot = Math.max(...tahapIsi.map((x) => x.berbobot), 1)

  return band('Proyeksi pencapaian target', `
    <div class="grid grid--3">
      ${card(stat('Realisasi tahun berjalan', DATA.FMT.rp(pr.realisasi), {
        foot: `${DATA.BULAN_TERSEDIA} bulan · rata-rata ${DATA.FMT.rp(pr.lajuBulanan)} per bulan`,
      }), { kelas: 'card--navy' })}
      ${card(stat('Proyeksi akhir tahun', DATA.FMT.rp(pr.dariLaju), {
        foot: `${DATA.FMT.pct(pr.capaianLaju, 1)} dari target · kalau rata-rata bulanan bertahan`,
        spark: CH.bar(pr.capaianLaju, pr.capaianLaju >= 1 ? 'mini-bar--pos' : 'mini-bar--neg'),
      }), { tone: pr.verdict === 'tercapai' ? 'hijau' : 'merah' })}
      ${card(stat('Kecukupan pipeline', DATA.FMT.pct(pr.kecukupan, 1), {
        foot: `Pipeline berbobot ${DATA.FMT.rp(pr.pipelineBerbobot)} terhadap kebutuhan ${DATA.FMT.rp(pr.tambahanLaju)}.
          Angka rendah wajar karena Matrix Distribution hanya merekam sebagian aliran bisnis`,
        spark: CH.bar(pr.kecukupan, pr.kecukupan >= 1 ? 'mini-bar--pos' : pr.kecukupan >= 0.7 ? 'mini-bar--warn' : 'mini-bar--neg'),
      }), { tone: 'emas' })}
    </div>

    ${card(CH.targetBar(segmen, pr.target) +
      `<div class="verdict verdict--${esc(nama)}">${ikon}<div>${kalimat}</div></div>`,
      { judul: 'Posisi terhadap target tahunan', sub: 'Realisasi, perkiraan sisa tahun, dan kekurangannya', tone: 'biru' })}

    ${card(`
      <div class="tbl-wrap"><table class="tbl">
        <thead><tr><th>Status prospek</th><th class="r">Jumlah</th><th class="r">Potensi premi</th>
          <th class="c">Bobot</th><th class="r">Sumbangan</th><th>Porsi sumbangan</th></tr></thead>
        <tbody>${tahapIsi.map((x) => `
          <tr>
            <td class="tbl__name">${esc(x.status)}</td>
            <td class="r">${DATA.FMT.n(x.n)}</td>
            <td class="r">${DATA.FMT.rp(x.premi)}</td>
            <td class="c"><span class="badge badge--mute">${DATA.FMT.pct(x.bobot)}</span></td>
            <td class="r">${DATA.FMT.rp(x.berbobot)}</td>
            <td>${CH.bar(x.berbobot / maksBerbobot)}</td>
          </tr>`).join('')}
          <tr>
            <td class="tbl__name">Jumlah</td>
            <td class="r">${DATA.FMT.n(tahapIsi.reduce((s, x) => s + x.n, 0))}</td>
            <td class="r">${DATA.FMT.rp(pr.pipelineMentah)}</td>
            <td class="c"></td>
            <td class="r"><b>${DATA.FMT.rp(pr.pipelineBerbobot)}</b></td>
            <td></td>
          </tr>
        </tbody></table></div>
      <p class="hint hint--why">Sebagian besar prospek hidup masih berstatus Cold, yang bobotnya rendah.
      Karena itu jumlah prospek yang besar belum tentu berarti pipeline yang kuat. Kecukupan pipeline
      ${DATA.FMT.pct(pr.kecukupan, 1)} berarti isi funnel saat ini
      ${pr.kecukupan >= 1 ? 'sudah cukup' : 'belum cukup'} untuk menopang produksi sisa tahun.</p>
      <p class="disclaim">Bobot tiap status adalah asumsi dan perlu disepakati. Angka prospek dan potensi
      premi masih simulasi karena data Matrix Distribution belum tersedia, sehingga yang bermakna untuk
      saat ini adalah bentuk distribusinya antar status, bukan nilai mutlaknya. Kolom realisasi dan target
      pada seksi ini semuanya dari file produksi.</p>`,
      { kelas: 'card--flush', judul: 'Sumbangan pipeline per status',
        sub: 'Potensi premi dikalikan peluang konversi tiap status', tone: 'ungu' })}`,
    { note: 'Perkiraan dari rata-rata bulanan dan dari pipeline berdiri sendiri, tidak dijumlahkan, agar tidak terjadi hitung ganda.', why: true })
}

/* ══════════════ Perbandingan tahun ke tahun ══════════════ */
function kartuYoY(scope) {
  const y = DATA.yoy(scope)
  if (!y) return ''
  const r25 = y.p25 / DATA.BULAN_P25
  const r26 = y.p26 / DATA.BULAN_P26
  const maks = Math.max(...ORG.SUB_KANAL.map((_, i) =>
    Math.max(y.kanal25 ? y.kanal25[i] / DATA.BULAN_P25 : 0, y.kanal26[i] / DATA.BULAN_P26)), 1)

  return card(`
    <div class="grid grid--3">
      ${stat(`Rata-rata per bulan 2025`, DATA.FMT.rp(r25), { foot: `Total ${DATA.FMT.rp(y.p25)} selama ${DATA.BULAN_P25} bulan` })}
      ${stat(`Rata-rata per bulan 2026`, DATA.FMT.rp(r26), { foot: `Total ${DATA.FMT.rp(y.p26)} selama ${DATA.BULAN_P26} bulan` })}
      ${stat('Perubahan', DATA.FMT.pctSigned(y.yoy, 1), {
        foot: y.yoy >= 0 ? 'Rata-rata bulanan naik' : 'Rata-rata bulanan turun',
        spark: CH.delta(y.yoy),
      })}
    </div>
    ${y.kanal25 ? `
      <div class="tbl-wrap"><table class="tbl">
        <thead><tr><th>Sub-channel</th><th>Kelompok</th><th class="r">Laju 2025</th><th class="r">Laju 2026</th>
          <th>2025 atas, 2026 bawah</th><th class="r">Perubahan</th></tr></thead>
        <tbody>${ORG.SUB_KANAL.map((sub, i) => {
          const a = y.kanal25[i] / DATA.BULAN_P25
          const b = y.kanal26[i] / DATA.BULAN_P26
          const d = DATA.lajuYoY(y.kanal25[i], y.kanal26[i])
          return `<tr>
            <td class="tbl__name">${esc(sub)}</td>
            <td>${badgeKanal(sub)}</td>
            <td class="r">${DATA.FMT.rp(a)}</td>
            <td class="r">${DATA.FMT.rp(b)}</td>
            <td>${CH.duaTahun(a, b, maks)}</td>
            <td class="r">${d === null ? KOSONG : CH.delta(d)}</td>
          </tr>`
        }).join('')}</tbody></table></div>` : ''}
    <p class="hint hint--why">Perbandingan memakai <b>rata-rata per bulan</b>, bukan total mentah, karena
    file 2025 mencakup ${DATA.BULAN_P25} bulan sedangkan file 2026 mencakup ${DATA.BULAN_P26} bulan.
    Membandingkan totalnya langsung akan memunculkan penurunan semu sekitar 40 persen yang sebenarnya
    hanya selisih panjang periode.</p>`,
    { kelas: 'card--flush', judul: 'Perbandingan terhadap tahun lalu',
      sub: 'Disetarakan jadi rata-rata per bulan', tone: 'hijau' })
}

/* ══════════════ SEKSI 2, PERLU TINDAKAN ══════════════ */
function bandTindakan(scope, sebaran) {
  const dk = DATA.daftarKerja(scope, saring())
  return band('Perlu tindakan', `
    ${kartuBucket(dk)}
    ${card(tabelKerja(dk, sebaran ? { batas: 12, tampilCabang: !!sebaran.tampilCabang } : { batas: 12 }),
      { kelas: 'card--flush', judul: 'Prioritas tindak lanjut',
        sub: 'Urutan dihitung dari status prospek, nilai premi, dan lama keterlambatan',
        alat: `<button class="btn btn--primary" data-export="kerja">Download Excel</button>`, tone: 'merah' })}
    ${sebaran ? card(sebaranKerja(sebaran.daftar, sebaran),
      { kelas: 'card--flush', judul: sebaran.judul, sub: 'Klik baris untuk lihat detail', tone: 'biru' }) : ''}`,
    { note: 'Menjawab pertanyaan mana yang harus dikerjakan lebih dulu, bukan hanya apa yang sudah terjadi.', why: true })
}

/* ══════════════ TAMPILAN 1, DIREKSI ══════════════ */
