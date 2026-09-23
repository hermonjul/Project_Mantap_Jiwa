/* ══════════════════════════════════════════════════════════════════
   data.js, lapisan data.

   PEMBAGIAN YANG PERLU DIPAHAMI SEBELUM MEMBACA ANGKA:

   NYATA, bersumber dari berkas Excel yang dilampirkan:
     total NWP per cabang tahun 2025 dan 2026 sampai Juli,
     target NWP 2026, profit 2025 dan 2026, kelas cabang,
     nama cabang, dan Kantor Wilayah induknya.

   SIMULASI, karena datanya belum tersedia:
     sebaran harian dari total tersebut, seluruh angka effort dan prospek
     pada Matrix Distribution, nama Marketing Officer, pembagian produksi
     antar Marketing Officer, serta nama nasabah dan prospek.

   Sebaran harian dihasilkan PRNG ber-seed sehingga identik setiap kali
   berkas dibuka, lalu dikalibrasi agar total per cabang tepat sama
   dengan angka pada berkas sumber.
   ══════════════════════════════════════════════════════════════════ */

/* Berkas produksi memuat realisasi tujuh bulan terhadap target satu tahun. */
/* Asumsi rasio biaya untuk perhitungan combined ratio pada ikhtisar. */

type DataScope = { unit?: string | null; branch?: string | null; mo?: string | null }
type DataFilter = { kanal?: string | null; subKanal?: string | null }

/* ── PRNG deterministik ── */
function mulberry32(a) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
function hashSeed(str, salt) {
  let h = 2166136261 ^ salt
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
function makeRng(key, salt = 0) {
  const r = mulberry32(hashSeed(key, SEED + salt))
  return {
    next: r,
    range: (lo, hi) => lo + r() * (hi - lo),
    int: (lo, hi) => Math.floor(lo + r() * (hi - lo + 1)),
    pick: (arr) => arr[Math.floor(r() * arr.length)],
    weighted: (arr, weights) => {
      const x = r()
      let acc = 0
      for (let i = 0; i < arr.length; i++) {
        acc += weights[i]
        if (x <= acc) return arr[i]
      }
      return arr[arr.length - 1]
    },
    norm: (mean, sd) => {
      const u = Math.max(1e-9, r()), v = r()
      const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
      return mean + sd * Math.max(-2.6, Math.min(2.6, z))
    },
  }
}

/* ── Kalender ── */
function buildDays() {
  const out = []
  const d = new Date(HARI_MULAI + 'T00:00:00Z')
  const end = new Date(HARI_AKHIR + 'T00:00:00Z')
  while (d <= end) {
    const iso = d.toISOString().slice(0, 10)
    const dow = d.getUTCDay()
    const dim = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate()
    out.push({
      iso, dow, dom: d.getUTCDate(), month: d.getUTCMonth(), dim,
      weekend: dow === 0 || dow === 6,
      libur: ORG.LIBUR_2026.has(iso),
      pos: (d.getUTCDate() - 1) / Math.max(1, dim - 1),
    })
    d.setUTCDate(d.getUTCDate() + 1)
  }
  return out
}

const DAYS = buildDays()
const ND = DAYS.length

const WEEK_OF = new Int16Array(ND)
{
  let w = 0
  for (let i = 0; i < ND; i++) {
    if (i > 0 && DAYS[i].dow === 1) w++
    WEEK_OF[i] = w
  }
}
const NW = WEEK_OF[ND - 1] + 1

const MONTH_START = []
DAYS.forEach((d, i) => { if (i === 0 || d.month !== DAYS[i - 1].month) MONTH_START.push(i) })
const CUR_MONTH_START = MONTH_START[MONTH_START.length - 1]
const PREV_MONTH_START = MONTH_START[MONTH_START.length - 2]

/* ══ Capaian nyata per cabang ══
   Target pada berkas berlaku untuk satu tahun penuh, sedangkan realisasinya
   baru tujuh bulan. Perbandingan dilakukan terhadap porsi tujuh bulan. */
const PORSI_YTD = BULAN_TERSEDIA / BULAN_SETAHUN

function capaianNyata(b) {
  const t = b.target * PORSI_YTD
  return t > 0 ? b.nwp26 / t : 0
}

/* ══ Periode yang dicakup berkas perbandingan ══

   ⚠️ PERIKSA INI SEBELUM MEMBACA ANGKA PERBANDINGAN TAHUN.

   Perbandingan antar tahun memakai laju per bulan, bukan total mentah,
   karena kedua berkas export diduga mencakup panjang periode yang berbeda.

   Buktinya: rasio total 2026 terhadap 2025 adalah 59,9 persen, sementara
   tujuh per dua belas adalah 58,3 persen. Median rasio antar 116 cabang
   juga jatuh tepat di 58,3 persen. Kinerja yang sesungguhnya tidak akan
   menggerombol pada angka yang kebetulan sama dengan rasio panjang periode.
   Penguat lain, kolom SYARAT 1.1 pada berkas produksi dihitung sebagai
   NWP 2025 dikali 1,15, rumus target setahun dari realisasi setahun.

   Bila tim data memastikan berkas 2025 memang hanya Januari sampai Juli,
   ubah BULAN_P25 menjadi 7. Seluruh angka perbandingan mengikuti. */

/* Perbandingan laju per bulan antara dua tahun. */
function lajuYoY(p25, p26) {
  const r25 = p25 / BULAN_P25
  const r26 = p26 / BULAN_P26
  return r25 > 0 ? r26 / r25 - 1 : null
}

/* ══ Marketing Officer ══
   Roster, nama, dan porsi produksi bersumber dari export Production Longterm
   all kanwil. Yang tersisa sebagai simulasi hanya sifat aktivitas hariannya,
   karena data effort dari Matrix Distribution belum tersedia. */
const MO_PER_KELAS = { A1: 8, A2: 6, B: 5, C: 4, D: 3, E: 2, F1: 2, F2: 2, F3: 2 }

function buildMOs() {
  const mos = []
  ORG.BRANCHES.forEach((b) => {
    const cab = typeof MO_DATA !== 'undefined' && MO_DATA ? MO_DATA.cabang[b.code] : null
    const daftar = cab && cab.mo && cab.mo.length ? cab.mo : null

    if (daftar) {
      /* Porsi mengikuti produksi nyata tiap orang. Nilai negatif, yang
         biasanya berasal dari pembatalan, dinolkan lebih dulu karena porsi
         tidak boleh negatif. Orang yang porsinya nol tetap tercantum, karena
         justru itu yang perlu terlihat oleh Pimpinan Cabang. */
      const positif = daftar.map((m) => Math.max(0, m[2]))
      const total = positif.reduce((s, v) => s + v, 0)
      daftar.forEach((m, i) => {
        const rng = makeRng('mo:' + b.id + ':' + m[0], 11)
        mos.push({
          id: `${b.id}-M${i + 1}`,
          kode: 'MO-' + b.code.replace(/\D/g, '') + String(i + 1).padStart(2, '0'),
          nama: m[0],
          branch: b.id, unit: b.unit,
          p25: m[1], p26: m[2], kanal26: m[3],
          yoy: lajuYoY(m[1], m[2]),
          share: total > 0 ? positif[i] / total : 1 / daftar.length,
          /* Sifat aktivitas harian, masih simulasi. Diseed dari nama sehingga
             tetap sama setiap kali berkas dibuka. */
          rajin: rng.range(0.5, 1.5),
          efektif: rng.range(0.55, 1.45),
        })
      })
      return
    }

    /* Cadangan untuk cabang yang tidak ada pada export, misalnya entri yang
       namanya disamarkan. Nama dikarang seperti pada versi sebelumnya. */
    const rng = makeRng('mo:' + b.id, 11)
    const n = MO_PER_KELAS[b.kelas] || 2
    for (let i = 0; i < n; i++) {
      mos.push({
        id: `${b.id}-M${i + 1}`,
        kode: 'MO-' + b.code.replace(/\D/g, '') + String(i + 1).padStart(2, '0'),
        nama: rng.pick(ORG.NAMA_DEPAN) + ' ' + rng.pick(ORG.NAMA_BELAKANG),
        branch: b.id, unit: b.unit,
        p25: 0, p26: 0, kanal26: null, yoy: null, namaSimulasi: true,
        share: 0,
        rajin: rng.range(0.5, 1.5),
        efektif: rng.range(0.55, 1.45),
      })
    }
    const mine = mos.filter((m) => m.branch === b.id)
    const tot = mine.reduce((s, m) => s + m.rajin * m.efektif, 0)
    mine.forEach((m) => { m.share = (m.rajin * m.efektif) / tot })
  })
  return mos
}

const MOS = buildMOs()
const NM = MOS.length
const MO_IDX = new Map(MOS.map((m, i) => [m.id, i]))

/* ══ Perbandingan tahun ke tahun ══
   Bersumber dari export dua tahun. Nilainya memakai basis ukur export, bukan
   NWP, karena yang dibandingkan adalah dua berkas dari sumber dan basis yang
   sama. Perbandingannya dihitung sebagai laju per bulan. */
const YOY = (function () {
  const perCabang = {}
  type YoyUnit = { p25: number; p26: number; kanal25: number[]; kanal26: number[]; keluar: number; yoy?: number | null }
  const perUnit: Record<string, YoyUnit> = {}
  const nasional: Omit<YoyUnit, 'keluar'> = { p25: 0, p26: 0, kanal25: new Array(7).fill(0), kanal26: new Array(7).fill(0) }
  if (typeof MO_DATA === 'undefined' || !MO_DATA) return { perCabang, perUnit, nasional, ada: false }

  ORG.BRANCHES.forEach((b) => {
    const cab = MO_DATA.cabang[b.code]
    if (!cab) return
    const p25 = cab.p25.reduce((s, v) => s + v, 0)
    const p26 = cab.p26.reduce((s, v) => s + v, 0)
    perCabang[b.id] = {
      p25, p26, kanal25: cab.p25, kanal26: cab.p26,
      yoy: lajuYoY(p25, p26),
      keluar: cab.keluar || [],
      nMo25: (cab.mo || []).filter((m) => m[1] !== 0).length + (cab.keluar || []).length,
      nMo26: (cab.mo || []).length,
    }
    const u = perUnit[b.unit] || (perUnit[b.unit] = {
      p25: 0, p26: 0, kanal25: new Array(7).fill(0), kanal26: new Array(7).fill(0), keluar: 0,
    })
    u.p25 += p25
    u.p26 += p26
    u.keluar += (cab.keluar || []).length
    nasional.p25 += p25
    nasional.p26 += p26
    for (let i = 0; i < 7; i++) {
      u.kanal25[i] += cab.p25[i]
      u.kanal26[i] += cab.p26[i]
      nasional.kanal25[i] += cab.p25[i]
      nasional.kanal26[i] += cab.p26[i]
    }
  })
  Object.values(perUnit).forEach((u) => { u.yoy = lajuYoY(u.p25, u.p26) })
  nasional.yoy = lajuYoY(nasional.p25, nasional.p26)
  return { perCabang, perUnit, nasional, ada: true }
})()

/* ══ Ketergantungan orang kunci per unit ══

   Menjawab pertanyaan yang selama ini tidak terjawab dashboard mana pun:
   berapa banyak produksi satu unit yang sebenarnya duduk di satu orang.

   Hanya unit berproduksi di atas AMBANG_UNIT yang dinilai. Tanpa ambang itu,
   unit kecil beranggota dua orang akan selalu muncul sebagai berisiko dan
   menenggelamkan unit besar yang benar benar perlu diperhatikan.

   Nilai yang dipakai adalah p26, yaitu angka mentah export dua tahun. Yang
   dihitung porsinya, bukan nilai mutlaknya, sehingga perbedaan basis ukur
   antara export dan berkas produksi tidak berpengaruh. Nilai rupiah yang
   ditampilkan diambil dari NWP cabang yang sudah terekonsiliasi. */

const RISIKO_ORANG = (function () {
  if (typeof MO_DATA === 'undefined' || !MO_DATA) return []
  const out = []
  ORG.BRANCHES.forEach((b) => {
    const cab = MO_DATA.cabang[b.code]
    if (!cab || !cab.mo || !cab.mo.length) return
    const positif = cab.mo.filter((m) => m[2] > 0)
    const total = positif.reduce((s, m) => s + m[2], 0)
    if (total <= 0) return
    const teratas = positif.reduce((a, m) => (m[2] > a[2] ? m : a), positif[0])
    const porsi = teratas[2] / total
    out.push({
      branch: b.id, unit: b.unit, nama: b.name, kelas: b.kelas,
      nMo: cab.mo.length, nMoAktif: positif.length,
      nwp: b.nwp26,
      /* Nilai yang bertumpu pada satu orang, dinyatakan dalam NWP cabang
         yang sudah terekonsiliasi, bukan dalam basis ukur export. */
      nwpKunci: b.nwp26 * porsi,
      moNama: teratas[0], porsi,
      layakDinilai: b.nwp26 >= AMBANG_UNIT,
      tingkat: porsi >= AMBANG_RISIKO.tinggi ? 'tinggi'
        : porsi >= AMBANG_RISIKO.sedang ? 'sedang' : 'rendah',
    })
  })
  return out.sort((a, b) => b.porsi - a.porsi)
})()

/* ══ Marketing Officer yang berhenti berproduksi ══

   Angka mentahnya menyesatkan kalau ditampilkan apa adanya, karena yang
   ber-NWP nol atau negatif terdiri dari tiga kelompok yang sangat berbeda.
   Hanya kelompok ketiga yang layak jadi bahan percakapan dengan atasan. */

const MO_TURUN = (function () {
  if (typeof MO_DATA === 'undefined' || !MO_DATA) {
    return { turun: [], kecilSejakDulu: 0, baru: 0, total: 0 }
  }
  const turun = []
  let kecilSejakDulu = 0
  let baru = 0
  let total = 0
  ORG.BRANCHES.forEach((b) => {
    const cab = MO_DATA.cabang[b.code]
    if (!cab || !cab.mo) return
    cab.mo.forEach((m) => {
      const p25 = m[1]
      const p26 = m[2]
      if (p26 > 0) return
      total += 1
      if (p25 >= AMBANG_TURUN) {
        turun.push({
          nama: m[0], branch: b.id, unit: b.unit, cabang: b.name,
          p25, p26, selisih: p26 - p25,
        })
      } else if (p25 === 0) baru += 1
      else kecilSejakDulu += 1
    })
  })
  turun.sort((a, b) => b.p25 - a.p25)
  return { turun, kecilSejakDulu, baru, total }
})()

/* ══ Bobot konversi tiap status untuk proyeksi ══
   Bobot weighted pipeline yang lazim dipakai. Angka ini asumsi dan perlu
   disepakati, karena menentukan besarnya sumbangan pipeline pada proyeksi.

   Terbit Polis dan Batal diberi nol dengan sengaja. Yang sudah terbit polis
   sudah masuk realisasi NWP, jadi menghitungnya lagi di pipeline berarti
   menghitung sumber yang sama dua kali. Yang batal sudah tidak ada nilainya. */

/* ══ Fakta harian per Marketing Officer ══ */
const F = {
  npw: new Float64Array(NM * ND),
  claim: new Float64Array(NM * ND),
  polis: new Int16Array(NM * ND),
  kunjungan: new Int16Array(NM * ND),
  telp: new Int16Array(NM * ND),
  penawaran: new Int16Array(NM * ND),
  follow_up: new Int16Array(NM * ND),
  prospek_baru: new Int16Array(NM * ND),
  terbit: new Int16Array(NM * ND),
}

/* ══ Pola aktivitas yang ditanam ══
   Effort tidak tersedia datanya, sehingga disimulasikan. Agar simulasinya
   tidak sekadar acak, tingkat aktivitas dikaitkan dengan capaian nyata
   cabang, lalu kaitan itu sengaja diputus pada beberapa cabang. Cabang
   itulah yang mengisi keempat kuadran pada peta produksi terhadap effort. */
const ANOMALI = {}
;(function tentukanAnomali() {
  const layak = ORG.BRANCHES
    /* Entri yang namanya disamarkan tidak dipakai sebagai contoh dalam
       narasi, agar pembahasan selalu menunjuk cabang yang jelas. */
    .filter((b) => b.nwp26 > 1e9 && !b.name.startsWith('UNIT KHUSUS'))
    .map((b) => ({ b, c: capaianNyata(b) }))
    .sort((x, y) => y.c - x.c)
  if (!layak.length) return

  /* Cabang yang secara nyata merugi tidak boleh dijadikan contoh sehat,
     sekalipun capaian premanya tinggi. Rasio beban dipakai sebagai
     penyaring agar narasi tidak bertentangan dengan angka aslinya. */
  const sehat = layak.filter((x) => x.b.rasioBeban < 0.8 && x.b.rasioBeban > 0)
  const rendah = layak.slice(-10)
  const pakai = (kandidat, jenis, extra = {}) => {
    const t = kandidat.find((x) => !ANOMALI[x.b.id])
    if (t) ANOMALI[t.b.id] = Object.assign({ jenis }, extra || {})
  }
  /* Capaian tertinggi namun aktivitas dibuat sangat rendah. */
  pakai(sehat, 'satu_deal')
  /* Capaian tinggi dengan aktivitas tinggi, sebagai contoh yang sehat. */
  pakai(sehat.slice(2), 'bintang')
  /* Capaian rendah namun aktivitas justru paling tinggi. */
  pakai(rendah, 'effort_boros')
  /* Capaian rendah dan aktivitas berhenti sama sekali. */
  pakai(rendah.slice(2), 'mati_suri', { sejakHari: 12 })
  /* Penurunan tajam pada minggu terakhir. */
  pakai(rendah.slice(4), 'jatuh_wow')
})()

function generate() {
  ORG.BRANCHES.forEach((b) => {
    const anom = ANOMALI[b.id]
    const rngB = makeRng('fact:' + b.id, 23)
    const capaian = capaianNyata(b)
    /* Aktivitas dasar mengikuti capaian nyata cabang dengan sebaran acak,
       sehingga korelasi antara usaha dan hasil terlihat wajar. */
    const aktivitasDasar = Math.max(0.35, Math.min(1.9,
      0.55 + capaian * 0.75 + rngB.range(-0.28, 0.28)))
    const fase = rngB.range(0, Math.PI * 2)
    const amp = rngB.range(0.05, 0.16)
    /* Tren dalam tahun berjalan agar deret mingguan tidak datar. */
    const tren = rngB.range(-0.24, 0.3)

    const mine = MOS.filter((m) => m.branch === b.id)
    const skalaKasar = b.nwp26 / ND

    mine.forEach((mo) => {
      const mi = MO_IDX.get(mo.id)
      const rng = makeRng('mo-fact:' + mo.id, 37)
      const skalaMO = skalaKasar * mo.share

      for (let d = 0; d < ND; d++) {
        const day = DAYS[d]
        const base = mi * ND + d

        let f = 1
        if (day.dow === 0) f *= 0.06
        else if (day.dow === 6) f *= 0.22
        if (day.libur) f *= 0.08
        f *= 1 + Math.pow(day.pos, 4) * 1.05
        if (day.pos < 0.12) f *= 0.78
        f *= 1 + tren * (d / ND)
        f *= 1 + amp * Math.sin((d / ND) * Math.PI * 2 + fase)

        let fEffort = aktivitasDasar
        const sisaHari = ND - 1 - d
        if (anom) {
          if (anom.jenis === 'mati_suri' && sisaHari < anom.sejakHari) fEffort = 0
          if (anom.jenis === 'effort_boros') fEffort = aktivitasDasar * 2.6
          if (anom.jenis === 'satu_deal') fEffort = aktivitasDasar * 0.22
          if (anom.jenis === 'jatuh_wow' && sisaHari < 7) { f *= 0.55; fEffort = aktivitasDasar * 0.4 }
          if (anom.jenis === 'bintang' && sisaHari < 21) { f *= 1.3; fEffort = aktivitasDasar * 1.7 }
        }

        /* Premi tidak masuk setiap hari. Sebagian hari kosong, sesekali ada
           penutupan besar. Bentuk inilah yang membuat deret harian wajar. */
        const adaProduksi = rng.next() < Math.min(0.94, 0.3 + f * 0.5)
        let npw = 0, polis = 0
        if (adaProduksi && f > 0.02) {
          const nPolis = Math.max(1, Math.round(rng.norm(0.5 + mo.rajin * 0.5, 0.5) * Math.min(2.4, f)))
          polis = nPolis
          for (let p = 0; p < nPolis; p++) {
            const u = rng.next()
            const besar = u > 0.965 ? rng.range(9, 26) : u > 0.85 ? rng.range(2.4, 5.5) : rng.range(0.25, 1.5)
            npw += (skalaMO * f * besar) / Math.max(1, nPolis * 0.75)
          }
        }
        F.npw[base] = npw
        F.polis[base] = polis

        /* Beban muncul terpisah dari premi, tidak berkorelasi harian. */
        F.claim[base] = rng.next() < 0.34
          ? npw * rng.range(0.2, 2.6) + skalaMO * rng.range(0, 1.6)
          : 0

        const kerja = !day.weekend && !day.libur
        if (!kerja || fEffort === 0) {
          F.kunjungan[base] = 0; F.telp[base] = 0
          F.penawaran[base] = 0; F.follow_up[base] = 0
          F.prospek_baru[base] = 0; F.terbit[base] = 0
        } else {
          const aktif = mo.rajin * fEffort * (1 + amp * 0.5 * Math.sin(d / 9 + fase))
          F.kunjungan[base] = Math.max(0, Math.round(rng.norm(1.1 * aktif, 0.85)))
          F.telp[base] = Math.max(0, Math.round(rng.norm(2.1 * aktif, 1.4)))
          F.penawaran[base] = Math.max(0, Math.round(rng.norm(0.8 * aktif, 0.7)))
          F.follow_up[base] = Math.max(0, Math.round(rng.norm(1.5 * aktif, 1.1)))
          F.prospek_baru[base] = Math.max(0, Math.round(rng.norm(0.9 * aktif, 0.8)))
          const efek = anom && anom.jenis === 'effort_boros' ? mo.efektif * 0.3 : mo.efektif
          F.terbit[base] = rng.next() < 0.13 * efek * Math.min(2, aktif) ? 1 : 0
        }
      }
    })
  })
}

generate()

/* ══ Kalibrasi ke angka nyata ══
   Sebaran harian di atas hanya menentukan BENTUK. Besarannya dikunci di sini
   agar total setiap cabang tepat sama dengan berkas sumber, baik untuk premi
   maupun beban. Dengan demikian setiap agregat pada tingkat cabang, Kantor
   Wilayah, dan nasional dapat ditelusuri kembali ke berkas Excel. */
;(function kalibrasi() {
  ORG.BRANCHES.forEach((b) => {
    const idxs = MOS.map((m, i) => (m.branch === b.id ? i : -1)).filter((i) => i >= 0)
    let premi = 0, beban = 0
    idxs.forEach((mi) => {
      const off = mi * ND
      for (let d = 0; d < ND; d++) { premi += F.npw[off + d]; beban += F.claim[off + d] }
    })
    const kPremi = premi > 0 ? b.nwp26 / premi : 0
    const kBeban = beban > 0 ? b.beban26 / beban : 0
    idxs.forEach((mi) => {
      const off = mi * ND
      for (let d = 0; d < ND; d++) {
        F.npw[off + d] *= kPremi
        F.claim[off + d] *= kBeban
      }
    })
  })
})()

/* ══ Agregasi ══ */
const MO_BY_BRANCH = new Map()
const MO_BY_UNIT = new Map()
MOS.forEach((m, i) => {
  if (!MO_BY_BRANCH.has(m.branch)) MO_BY_BRANCH.set(m.branch, [])
  MO_BY_BRANCH.get(m.branch).push(i)
  if (!MO_BY_UNIT.has(m.unit)) MO_BY_UNIT.set(m.unit, [])
  MO_BY_UNIT.get(m.unit).push(i)
})

const FIELDS = Object.keys(F)
const aggCache = new Map()

function agg(moIdxs, a, b, cacheKey = '') {
  if (cacheKey) {
    const hit = aggCache.get(cacheKey)
    if (hit) return hit
  }
  const out: Record<string, number> = {}
  FIELDS.forEach((f) => { out[f] = 0 })
  for (const mi of moIdxs) {
    const off = mi * ND
    for (let d = a; d <= b; d++) {
      for (const f of FIELDS) out[f] += F[f][off + d]
    }
  }
  out.surplus = out.npw - out.claim
  out.rasio_beban = out.npw > 0 ? out.claim / out.npw : 0
  out.effort = ORG.AKTIVITAS.reduce((s, a2) => s + out[a2.id] * a2.w, 0)
  if (cacheKey) aggCache.set(cacheKey, out)
  return out
}

function series(moIdxs, field, a, b) {
  const n = b - a + 1
  const out = new Float64Array(n)
  for (const mi of moIdxs) {
    const off = mi * ND
    for (let d = 0; d < n; d++) out[d] += F[field][off + a + d]
  }
  return Array.from(out)
}

function weekly(moIdxs, field) {
  const out = new Float64Array(NW)
  for (const mi of moIdxs) {
    const off = mi * ND
    for (let d = 0; d < ND; d++) out[WEEK_OF[d]] += F[field][off + d]
  }
  return Array.from(out)
}

const ALL_MO = MOS.map((_, i) => i)

function hariKerja(a, b) {
  let n = 0
  for (let d = a; d <= b; d++) if (!DAYS[d].weekend && !DAYS[d].libur) n++
  return n
}

/* ══ Target ══
   Target tahunan bersumber dari kolom SYARAT 1.1 pada berkas produksi.
   Pembagian target ke dalam bulan diasumsikan merata, karena berkas tidak
   memuat rincian bulanan. Sebaran di dalam satu bulan mengikuti pola
   penyerapan yang dihitung dari data. */
function targetTahun(scope) {
  const daftar = scope.branch ? [ORG.branchById(scope.branch)]
    : scope.mo ? [ORG.branchById(MOS.find((m) => m.id === scope.mo).branch)]
      : scope.unit ? ORG.branchesOf(scope.unit) : ORG.BRANCHES
  const total = daftar.reduce((s, b) => s + b.target, 0)
  if (!scope.mo) return total
  return total * MOS.find((m) => m.id === scope.mo).share
}

/* Pangsa kumulatif produksi menurut posisi tanggal dalam bulan.
   Produksi menumpuk di akhir bulan, sehingga target berjalan tidak dibagi
   rata per hari. Pembagian rata akan membuat seluruh cabang tampak
   tertinggal pada pertengahan bulan, padahal itu pola yang normal. */
const PROFIL_KUM = (function () {
  const nas = []
  for (let d = 0; d < ND; d++) {
    let s = 0
    for (let mi = 0; mi < NM; mi++) s += F.npw[mi * ND + d]
    nas.push(s)
  }
  const akum = new Float64Array(101)
  let nBulan = 0
  for (let m = 0; m < MONTH_START.length - 1; m++) {
    const a = MONTH_START[m], b = MONTH_START[m + 1] - 1
    const dim = b - a + 1
    const cum = new Float64Array(dim + 1)
    for (let i = 0; i < dim; i++) cum[i + 1] = cum[i] + nas[a + i]
    if (cum[dim] <= 0) continue
    for (let p = 0; p <= 100; p++) {
      const x = (p / 100) * dim
      const i = Math.min(dim - 1, Math.floor(x))
      akum[p] += (cum[i] + (cum[i + 1] - cum[i]) * (x - i)) / cum[dim]
    }
    nBulan++
  }
  if (!nBulan) { for (let p = 0; p <= 100; p++) akum[p] = p / 100; nBulan = 1 }
  for (let p = 0; p <= 100; p++) akum[p] /= nBulan
  return akum
})()

function pangsaBulan(dom, dim) {
  const p = Math.max(0, Math.min(100, Math.round((dom / dim) * 100)))
  return PROFIL_KUM[p]
}

/* ══ Format ══ */
const FMT = {
  rp(v, digits = undefined) {
    const n = Math.abs(v), s = v < 0 ? '-' : ''
    if (n >= 1e12) return s + 'Rp ' + (n / 1e12).toFixed(digits ?? 2) + ' T'
    if (n >= 1e9) return s + 'Rp ' + (n / 1e9).toFixed(digits ?? 1) + ' M'
    if (n >= 1e6) return s + 'Rp ' + (n / 1e6).toFixed(digits ?? 0) + ' jt'
    return s + 'Rp ' + Math.round(n).toLocaleString('id-ID')
  },
  rpShort(v) {
    const n = Math.abs(v), s = v < 0 ? '-' : ''
    if (n >= 1e12) return s + (n / 1e12).toFixed(2) + ' T'
    if (n >= 1e9) return s + (n / 1e9).toFixed(1) + ' M'
    if (n >= 1e6) return s + (n / 1e6).toFixed(0) + ' jt'
    return s + Math.round(n).toLocaleString('id-ID')
  },
  n(v) { return Math.round(v).toLocaleString('id-ID') },
  pct(v, digits = 0) { return (v * 100).toFixed(digits) + '%' },
  pctSigned(v, digits = 0) { return (v >= 0 ? '+' : '') + (v * 100).toFixed(digits) + '%' },
  tgl(iso) {
    const b = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
    const [y, m, d] = iso.split('-')
    return `${+d} ${b[+m - 1]} ${y}`
  },
  tglPendek(iso) {
    const b = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
    const [, m, d] = iso.split('-')
    return `${+d} ${b[+m - 1]}`
  },
  hari(iso) {
    const h = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
    return h[new Date(iso + 'T00:00:00Z').getUTCDay()]
  },
  bulan(m) {
    return ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli',
      'Agustus', 'September', 'Oktober', 'November', 'Desember'][m]
  },
}

/* ══ Kanal distribusi ══
   Komposisi kanal untuk prospek disimulasikan, karena data Matrix Distribution
   memang belum pernah tersedia. Produksi per kanal menunggu export tersendiri
   dan dibaca dari kanal.js.

   Bobot tidak dibuat rata. Karakter cabang menentukan condongnya ke kanal mana,
   sehingga perbandingan antar cabang punya bentuk yang dapat dibaca. Arah
   bobotnya mengikuti pembahasan Rapim, yaitu multifinance masih porsi terbesar
   meski menyusut, dan broker tumbuh. */
/* Dipakai hanya sebagai cadangan, untuk cabang yang belum punya komposisi
   pada export eReport. */
const BOBOT_KANAL_DASAR = {
  Direct: 0.12, Corporate: 0.14, Agency: 0.12,
  Banking: 0.12, Multifinance: 0.32, Broker: 0.14, 'Sinar Mas Group': 0.04,
}

function bobotKanal(b) {
  /* Bila komposisi kanal cabang ini sudah tersedia dari export eReport,
     pakai itu. Pipeline prospek jadi mengikuti bentuk bisnis cabang yang
     sebenarnya, dan panel pipeline tidak lagi bertentangan dengan panel
     produksi di layar yang sama. Nilai negatif pada berkas sumber, yang
     biasanya berasal dari pembatalan, dinolkan lebih dulu karena bobot
     tidak boleh negatif. */
  if (typeof KANAL_DATA !== 'undefined' && KANAL_DATA && KANAL_DATA.porsi) {
    const baris = KANAL_DATA.porsi[b.code]
    if (baris) {
      const positif = baris.map((v) => Math.max(0, v))
      const jum = positif.reduce((s, v) => s + v, 0)
      if (jum > 0) {
        /* Diratakan tipis terhadap sebaran merata, supaya sub-kanal yang
           porsi produksinya sangat kecil tetap punya beberapa prospek dan
           tabelnya tidak kosong saat disaring. */
        const rata = 1 / positif.length
        return positif.map((v) => 0.92 * (v / jum) + 0.08 * rata)
      }
    }
  }

  const w = Object.assign({}, BOBOT_KANAL_DASAR)
  const nama = b.name.toUpperCase()
  const besar = b.kelas === 'A1' || b.kelas === 'A2' || b.kelas === 'B'
  const kecil = b.kelas === 'E' || b.kelas.startsWith('F')

  if (nama.includes('AGENCY')) { w.Agency *= 4.2; w.Multifinance *= 0.7; w.Corporate *= 0.5 }
  else if (nama.startsWith('MPA') || nama.startsWith('MP ')) { w.Agency *= 2.4; w.Multifinance *= 1.5; w.Corporate *= 0.4 }
  else if (nama.startsWith('SYARIAH')) { w.Direct *= 1.8; w.Banking *= 1.6; w.Broker *= 0.4 }

  if (besar) { w.Corporate *= 2.1; w.Broker *= 1.9; w.Banking *= 1.4; w.Direct *= 0.7 }
  if (kecil) { w.Direct *= 1.9; w.Multifinance *= 1.3; w.Broker *= 0.35; w.Corporate *= 0.4 }

  const tot = ORG.SUB_KANAL.reduce((s, k) => s + w[k], 0)
  return ORG.SUB_KANAL.map((k) => w[k] / tot)
}

/* Batas waktu tindak lanjut menurut status prospek. Angka ini usulan dan
   perlu disepakati, karena menentukan prospek mana yang dianggap terlambat.
   Hanya tiga status hidup yang punya batas waktu; sisanya sudah tutup buku. */

/* Pengali urgensi menurut kelompok jatuh tempo.

   Tanpa pengali ini, satu prospek COLD bernilai sangat besar yang belum jatuh
   tempo dapat menempati urutan teratas dan menggeser prospek HOT yang sudah
   terlambat. Untuk daftar kerja harian, yang sudah lewat tempo harus selalu
   didahulukan, baru kemudian nilainya yang menentukan urutan di dalamnya. */

/* Pengelompokan menurut jatuh tempo. Nilai telat positif berarti lewat tempo. */
const BUCKET = [
  { id: 'lewat', label: 'Lewat jatuh tempo', tone: 'merah', uji: (t) => t > 0 },
  { id: 'hariIni', label: 'Jatuh tempo hari ini', tone: 'emas', uji: (t) => t === 0 },
  { id: 'segera', label: '1 sampai 3 hari lagi', tone: 'biru', uji: (t) => t >= -3 && t <= -1 },
  { id: 'minggu', label: '4 sampai 7 hari lagi', tone: 'hijau', uji: (t) => t >= -7 && t <= -4 },
]

function bucketDari(telat) {
  const b = BUCKET.find((x) => x.uji(telat))
  return b ? b.id : 'nanti'
}

/* ══ Prospek, seluruhnya simulasi ══ */
function buildProspects() {
  const list = []
  ORG.BRANCHES.forEach((b) => {
    const mine = MO_BY_BRANCH.get(b.id) || []
    const rng = makeRng('prospek:' + b.id, 53)
    const anom = ANOMALI[b.id]
    const wKanal = bobotKanal(b)
    /* Portofolio prospek per Marketing Officer dibuat pada kisaran belasan,
       agar jumlah aktivitas harian yang disimulasikan punya sasaran yang masuk
       akal. Portofolio yang terlalu kecil membuat angka effort terbaca janggal. */
    const n = Math.max(6, Math.round(mine.length * 9))
    for (let i = 0; i < n; i++) {
      const mo = MOS[mine[rng.int(0, mine.length - 1)]]
      const nama = 'PT ' + rng.pick(ORG.PT_DEPAN) + ' ' + rng.pick(ORG.PT_BELAKANG) +
        (rng.next() > 0.45 ? ' ' + rng.pick(ORG.PT_BIDANG) : '')
      const status = rng.weighted(ORG.STATUS, ORG.STATUS_MIX)
      const hidup = ORG.STATUS_HIDUP.includes(status)
      /* Status effort terakhir hanya bermakna selama prospek masih hidup.
         Yang sudah tutup buku tetap diberi nilai, sebagai catatan langkah
         terakhir yang sempat dikerjakan. */
      const tahap = hidup
        ? rng.weighted(ORG.TAHAP, [0.30, 0.20, 0.26, 0.13, 0.11])
        : rng.weighted(ORG.TAHAP, [0.16, 0.14, 0.24, 0.20, 0.26])
      const lini = rng.weighted(ORG.LINI, ORG.LINI_MIX)
      const sumber = rng.weighted(ORG.SUMBER, ORG.SUMBER_MIX)
      const mapKat = rng.weighted(ORG.MAPPING_KAT, [0.34, 0.21, 0.27, 0.18])

      let hariFU
      if (anom && anom.jenis === 'mati_suri') hariFU = rng.int(12, 34)
      else if (anom && anom.jenis === 'satu_deal') hariFU = rng.int(8, 26)
      else hariFU = rng.weighted([2, 4, 7, 12, 18, 27], [0.3, 0.22, 0.18, 0.13, 0.1, 0.07])
      hariFU += rng.int(0, 2)
      if (!hidup) hariFU = rng.int(0, 5)

      /* Potensi premi mengikuti bentuk produksi cabang, tapi nilai mutlaknya
         dikunci belakangan lewat kalibrasi ke angka Matrix Distribution yang
         sebenarnya. Lihat PREMI_ACUAN di bawah. Yang dihitung di sini hanya
         sebarannya antar cabang dan antar status. */
      const acuan = Math.max(3e6, 10 * (b.nwp26 / BULAN_TERSEDIA) / Math.max(6, n * 1.3))
      const premi = Math.round(acuan * rng.range(0.28, 3.6) *
        (status === 'Hot' ? 1.5 : status === 'Warm' ? 1 : 0.72))

      const subKanal = rng.weighted(ORG.SUB_KANAL, wKanal)
      const kanal = ORG.KANAL_DARI_SUB[subKanal]

      /* Jatuh tempo tindak lanjut berikutnya, dihitung dari kontak terakhir
         ditambah batas waktu menurut status. Nilai telat positif berarti
         sudah lewat tempo. Prospek yang sudah terbit polis, pending, atau
         batal tidak masuk daftar kerja, sehingga diberi nilai netral. */
      const selesai = !hidup
      const sla = SLA_STATUS[status] || 0
      const telat = selesai ? -999 : hariFU - sla
      const jatuhTempo = ND - 1 - telat
      const kelompok = selesai ? 'selesai' : bucketDari(telat)
      const prioritas = selesai ? 0
        : BOBOT_PRIORITAS[status] * Math.log10(premi / 1e6 + 1)
          * (1 + Math.max(0, telat) / 7) * (FAKTOR_TENGGAT[kelompok] || 1)

      list.push({
        id: `${b.id}-P${i + 1}`,
        nama, branch: b.id, unit: b.unit, mo: mo.id, moNama: mo.nama,
        tahap, status, lini, sumber, mapKat, hariFU, premi,
        subKanal, kanal, sla, telat, jatuhTempo, prioritas, selesai,
        bucket: kelompok,
        crossSell: (() => {
          const k = rng.int(0, 2)
          const pool = ORG.LINI.filter((l) => l !== lini)
          const out = []
          for (let j = 0; j < k; j++) {
            const c = pool[rng.int(0, pool.length - 1)]
            if (!out.includes(c)) out.push(c)
          }
          return out
        })(),
      })
    }
  })
  return list
}

/* ══ Kalibrasi nilai prospek ke angka Matrix Distribution ══

   Dashboard Matrix Distribution Kanwil 1 yang dibaca 10 September 2026
   mencatat estimasi NPW Rp 57.909.452.438 untuk 2.351 prospek, yaitu
   rata-rata Rp 24,6 juta per prospek. Angka simulasi diskalakan ke
   rata-rata itu supaya besaran pipeline tidak lagi jadi angka karangan.

   Konsekuensinya kecukupan pipeline turun jauh dibanding versi terdahulu.
   Itu memang gambaran yang sebenarnya: pipeline yang tercatat di Matrix
   Distribution masih jauh dari cukup untuk menutup kebutuhan sisa tahun.
   Angka ini akan terkoreksi sendiri begitu data effort yang asli masuk. */
const PREMI_ACUAN = 57909452438 / 2351

const PROSPECTS = (function () {
  const list = buildProspects()
  const rata = list.reduce((s, p) => s + p.premi, 0) / Math.max(1, list.length)
  const skala = rata > 0 ? PREMI_ACUAN / rata : 1
  list.forEach((p) => {
    p.premi = Math.round(p.premi * skala)
    p.prioritas = p.selesai ? 0
      : BOBOT_PRIORITAS[p.status] * Math.log10(p.premi / 1e6 + 1)
        * (1 + Math.max(0, p.telat) / 7) * (FAKTOR_TENGGAT[p.bucket] || 1)
  })
  return list
})()

/* ══ Antarmuka ══ */
const DATA = {
  DAYS, ND, NW, WEEK_OF, MONTH_START, CUR_MONTH_START, PREV_MONTH_START,
  MOS, MO_IDX, MO_BY_BRANCH, MO_BY_UNIT, ALL_MO, PROSPECTS, ANOMALI, F, FMT,
  agg, series, weekly, hariKerja, makeRng, pangsaBulan, capaianNyata,
  RASIO_BIAYA, PORSI_YTD, BULAN_TERSEDIA, BULAN_SETAHUN,

  hariIni: DAYS[ND - 1],
  idxHariIni: ND - 1,

  BUCKET, SLA_STATUS, bucketDari,
  AMBANG_UNIT, AMBANG_RISIKO, AMBANG_TURUN,

  /* ── Ketergantungan orang kunci dalam satu lingkup ──
     Hanya unit yang layak dinilai yang dikembalikan, diurutkan dari porsi
     terbesar. Ringkasannya sudah ikut dihitung supaya pemanggil tidak
     mengulang penjumlahan yang sama. */
  risikoOrang(scope: DataScope = {}) {
    const isi = RISIKO_ORANG.filter((x) =>
      (!scope.branch || x.branch === scope.branch) &&
      (!scope.unit || x.unit === scope.unit) &&
      x.layakDinilai)
    const tinggi = isi.filter((x) => x.tingkat === 'tinggi')
    return {
      semua: isi,
      tinggi,
      sedang: isi.filter((x) => x.tingkat === 'sedang'),
      nilaiTinggi: tinggi.reduce((s, x) => s + x.nwpKunci, 0),
      nilaiSeluruh: isi.reduce((s, x) => s + x.nwp, 0),
      porsiNasional: (function () {
        const nas = RISIKO_ORANG.reduce((s, x) => s + x.nwp, 0)
        return nas > 0 ? tinggi.reduce((s, x) => s + x.nwpKunci, 0) / nas : 0
      })(),
    }
  },

  /* ── Marketing Officer yang berhenti berproduksi ──
     Tiga kelompok dipisah dengan sengaja. Yang ditampilkan sebagai daftar
     hanya kelompok pertama, yaitu yang tahun lalu memang berproduksi. */
  moTurun(scope: DataScope = {}) {
    const cocok = (x) => (!scope.branch || x.branch === scope.branch) &&
      (!scope.unit || x.unit === scope.unit)
    const turun = MO_TURUN.turun.filter(cocok)
    return {
      turun,
      nilai25: turun.reduce((s, x) => s + x.p25, 0),
      kecilSejakDulu: MO_TURUN.kecilSejakDulu,
      baru: MO_TURUN.baru,
      total: MO_TURUN.total,
      /* Kedua angka di bawah hanya sahih pada lingkup nasional, karena
         pemilahan kelompok tidak disimpan per cabang. */
      nasional: !scope.branch && !scope.unit,
    }
  },


  moSet(scope) {
    if (scope.mo) return [MO_IDX.get(scope.mo)]
    if (scope.branch) return MO_BY_BRANCH.get(scope.branch) || []
    if (scope.unit) return MO_BY_UNIT.get(scope.unit) || []
    return ALL_MO
  },

  /* ── Prospek dalam satu lingkup, disaring kanal bila diminta ── */
  prospek(scope: DataScope = {}, filter: DataFilter = {}) {
    return PROSPECTS.filter((p) =>
      (!scope.mo || p.mo === scope.mo) &&
      (!scope.branch || p.branch === scope.branch) &&
      (!scope.unit || p.unit === scope.unit) &&
      (!filter.kanal || p.kanal === filter.kanal) &&
      (!filter.subKanal || p.subKanal === filter.subKanal))
  },

  /* ── Daftar kerja menurut jatuh tempo ──
     Menjawab pertanyaan mana yang harus dikerjakan lebih dulu. Prospek yang
     sudah terbit polis atau ditutup tidak masuk hitungan. */
  daftarKerja(scope: DataScope = {}, filter: DataFilter = {}) {
    const aktif = DATA.prospek(scope, filter).filter((p) => !p.selesai)
    const bucket: Record<string, (typeof aktif)[number][]> = {}
    BUCKET.forEach((b) => { bucket[b.id] = [] })
    bucket.nanti = []
    aktif.forEach((p) => { bucket[p.bucket].push(p) })
    Object.keys(bucket).forEach((k) => bucket[k].sort((a, b) => b.prioritas - a.prioritas))

    const perluTindakan = bucket.lewat.concat(bucket.hariIni)
    return {
      aktif, bucket, perluTindakan,
      urut: aktif.slice().sort((a, b) => b.prioritas - a.prioritas),
      nilaiLewat: bucket.lewat.reduce((s, p) => s + p.premi, 0),
      nilaiPerluTindakan: perluTindakan.reduce((s, p) => s + p.premi, 0),
    }
  },

  /* ── Pipeline menurut sub-kanal, bersumber dari data simulasi ── */
  kanalPipeline(scope: DataScope = {}, filter: DataFilter = {}) {
    const list = DATA.prospek(scope, filter)
    return ORG.SUB_KANAL.map((sub) => {
      const isi = list.filter((p) => p.subKanal === sub)
      return {
        sub, kanal: ORG.KANAL_DARI_SUB[sub],
        n: isi.length,
        premi: isi.reduce((s, p) => s + p.premi, 0),
        perlu: isi.filter((p) => !p.selesai && p.telat >= 0).length,
      }
    })
  },

  /* ── Perbandingan tahun ke tahun untuk satu lingkup ── */
  yoy(scope: DataScope = {}) {
    if (!YOY.ada) return null
    if (scope.mo) {
      const mo = MOS.find((m) => m.id === scope.mo)
      return mo && mo.p25 !== undefined
        ? { p25: mo.p25, p26: mo.p26, yoy: mo.yoy, kanal25: null, kanal26: mo.kanal26 }
        : null
    }
    if (scope.branch) return YOY.perCabang[scope.branch] || null
    if (scope.unit) return YOY.perUnit[scope.unit] || null
    return YOY.nasional
  },
  YOY, BULAN_P25, BULAN_P26, lajuYoY, BOBOT_STATUS,

  /* ── Proyeksi pencapaian target ──

     Dua perkiraan yang berdiri sendiri, sengaja tidak dijumlahkan agar tidak
     terjadi hitung ganda. Produksi sisa tahun akan datang dari pipeline yang
     ada sekarang, sehingga menjumlahkan laju dan pipeline berarti menghitung
     sumber yang sama dua kali.

     1. Perkiraan dari laju, yaitu realisasi ditambah laju bulanan dikali
        sisa bulan. Menjawab pertanyaan bagaimana bila keadaan berjalan
        seperti sekarang.
     2. Perkiraan dari pipeline, yaitu realisasi ditambah nilai pipeline
        yang sudah dibobot menurut tahapnya. Menjawab pertanyaan apakah isi
        funnel saat ini memang cukup untuk menopang laju tersebut.

     Selisih antara keduanya adalah ukuran kecukupan pipeline. */
  proyeksi(scope: DataScope = {}, filter: DataFilter = {}) {
    const r = DATA.ringkas(scope)
    const sisaBulan = BULAN_SETAHUN - BULAN_TERSEDIA
    const lajuBulanan = r.ytd.npw / BULAN_TERSEDIA
    const dariLaju = r.ytd.npw + lajuBulanan * sisaBulan

    const aktif = DATA.prospek(scope, filter).filter((p) => !p.selesai)
    const perStatus = ORG.STATUS_HIDUP.map((t) => {
      const isi = aktif.filter((p) => p.status === t)
      const premi = isi.reduce((s, p) => s + p.premi, 0)
      const bobot = BOBOT_STATUS[t] || 0
      return { status: t, n: isi.length, premi, bobot, berbobot: premi * bobot }
    })
    const berbobot = perStatus.reduce((s, x) => s + x.berbobot, 0)
    const dariPipeline = r.ytd.npw + berbobot

    const target = r.targetTahun
    const kurangLaju = dariLaju - target
    const kurangPipeline = dariPipeline - target

    return {
      realisasi: r.ytd.npw,
      target,
      sisaBulan,
      lajuBulanan,
      tambahanLaju: lajuBulanan * sisaBulan,
      dariLaju,
      capaianLaju: target > 0 ? dariLaju / target : 0,
      perStatus,
      pipelineMentah: aktif.reduce((s, p) => s + p.premi, 0),
      pipelineBerbobot: berbobot,
      dariPipeline,
      capaianPipeline: target > 0 ? dariPipeline / target : 0,
      kurangLaju,
      kurangPipeline,
      /* Kecukupan pipeline, yaitu seberapa besar isi funnel menutup kebutuhan
         produksi sisa tahun. Di bawah 100 persen berarti pipeline belum cukup
         untuk mempertahankan laju sekarang. */
      kecukupan: lajuBulanan * sisaBulan > 0 ? berbobot / (lajuBulanan * sisaBulan) : 0,
      verdict: dariLaju >= target ? 'tercapai' : dariPipeline >= target ? 'ketat' : 'tidak',
    }
  },

  /* ── Produksi menurut sub-kanal ──
     Mengembalikan null selama export per kanal belum tersedia. Pemanggil wajib
     memeriksa nilai null dan menampilkan keterangan menunggu data, bukan nol. */
  kanalProduksi(scope: DataScope = {}) {
    if (!KANAL_DATA || !KANAL_DATA.nwp) return null
    const daftar = scope.branch ? [ORG.branchById(scope.branch)]
      : scope.mo ? [ORG.branchById(MOS.find((m) => m.id === scope.mo).branch)]
        : scope.unit ? ORG.branchesOf(scope.unit) : ORG.BRANCHES
    const jum = ORG.SUB_KANAL.map(() => 0)
    let ada = false
    daftar.forEach((b) => {
      const baris = KANAL_DATA.nwp[b.code]
      if (!baris) return
      ada = true
      baris.forEach((v, i) => { jum[i] += v })
    })
    if (!ada) return null
    const total = jum.reduce((s, v) => s + v, 0)
    return ORG.SUB_KANAL.map((sub, i) => ({
      sub, kanal: ORG.KANAL_DARI_SUB[sub], nwp: jum[i],
      porsi: total > 0 ? jum[i] / total : 0,
    }))
  },
  scopeKey(scope) {
    return scope.mo ? 'mo:' + scope.mo : scope.branch ? 'br:' + scope.branch
      : scope.unit ? 'un:' + scope.unit : 'nas'
  },

  ringkas(scope) {
    const set = DATA.moSet(scope)
    const key = DATA.scopeKey(scope)
    const t = ND - 1
    const hari = DAYS[t]

    const ytd = agg(set, 0, t, 'ytd:' + key)
    const mtd = agg(set, CUR_MONTH_START, t, 'mtd:' + key)
    const hariIni = agg(set, t, t, 'hri:' + key)
    const m7 = agg(set, Math.max(0, t - 6), t, 'm7:' + key)
    const m7prev = agg(set, Math.max(0, t - 13), t - 7, 'm7p:' + key)
    const nHari = t - CUR_MONTH_START
    const lm = agg(set, PREV_MONTH_START, Math.min(CUR_MONTH_START - 1, PREV_MONTH_START + nHari), 'lm:' + key)

    const tahunan = targetTahun(scope)
    const targetBulan = tahunan / BULAN_SETAHUN
    const pangsa = pangsaBulan(hari.dom, hari.dim)
    const targetMtd = targetBulan * pangsa
    const targetYtd = tahunan * PORSI_YTD

    return {
      set, key, ytd, mtd, hariIni, m7, m7prev, lm, pangsa,
      targetTahun: tahunan, targetBulan, targetMtd, targetYtd,
      targetHarian: targetBulan / hari.dim,
      capaian: targetMtd > 0 ? mtd.npw / targetMtd : 0,
      capaianYtd: targetYtd > 0 ? ytd.npw / targetYtd : 0,
      capaianTahun: tahunan > 0 ? ytd.npw / tahunan : 0,
      proyeksi: pangsa > 0 ? mtd.npw / pangsa : 0,
      bulanSelesai: pangsa >= 0.999,
      wow: m7prev.npw > 0 ? m7.npw / m7prev.npw - 1 : 0,
      wowEffort: m7prev.effort > 0 ? m7.effort / m7prev.effort - 1 : 0,
      mom: lm.npw > 0 ? mtd.npw / lm.npw - 1 : 0,
    }
  },
}
