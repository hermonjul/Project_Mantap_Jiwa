/* probe.js, pemeriksa angka. Tidak ikut ke dist/.
   Jalankan lewat perintah yang tercantum di README. */
const p = (l, v) => console.log('  ' + String(l).padEnd(34) + ': ' + v)
const uji = (l, ok, ket) => console.log('  ' + (ok ? 'LULUS' : 'GAGAL') + '  ' + String(l).padEnd(46) + (ket || ''))

const r = DATA.ringkas({})
const xlNwp = ORG.BRANCHES.reduce((s, b) => s + b.nwp26, 0)
const xlBeban = ORG.BRANCHES.reduce((s, b) => s + b.beban26, 0)
const xlTgt = ORG.BRANCHES.reduce((s, b) => s + b.target, 0)

console.log('══ 1. Rekonsiliasi terhadap berkas Excel ══')
p('NWP pada Excel', DATA.FMT.rp(xlNwp))
p('NWP pada dashboard', DATA.FMT.rp(r.ytd.npw) + '  selisih ' + ((r.ytd.npw / xlNwp - 1) * 100).toFixed(4) + '%')
p('Beban pada Excel', DATA.FMT.rp(xlBeban))
p('Beban pada dashboard', DATA.FMT.rp(r.ytd.claim) + '  selisih ' + ((r.ytd.claim / xlBeban - 1) * 100).toFixed(4) + '%')
p('Target satu tahun', DATA.FMT.rp(xlTgt))
p('Capaian tahun berjalan', DATA.FMT.pct(r.capaianYtd, 1) + ' terhadap porsi ' + DATA.BULAN_TERSEDIA + '/12')
p('Rasio beban', DATA.FMT.pct(r.ytd.rasio_beban, 1))
uji('Selisih NWP di bawah 0,001 persen', Math.abs(r.ytd.npw / xlNwp - 1) < 1e-5)
uji('Selisih beban di bawah 0,001 persen', Math.abs(r.ytd.claim / xlBeban - 1) < 1e-5)

console.log('\n══ 2. Cakupan ══')
p('Periode', DATA.DAYS[0].iso + ' sampai ' + DATA.hariIni.iso + ' (' + DATA.ND + ' hari, ' + DATA.NW + ' minggu)')
p('Cabang', ORG.BRANCHES.length)
p('Marketing Officer', DATA.MOS.length)
p('Prospek simulasi', DATA.FMT.n(DATA.PROSPECTS.length))

console.log('\n══ 3. Kanal distribusi ══')
const pipe = DATA.kanalPipeline({})
const totN = pipe.reduce((s, x) => s + x.n, 0)
pipe.forEach((x) => console.log(
  '  ' + x.sub.padEnd(18) + x.kanal.padEnd(9) + String(x.n).padStart(5) + ' prospek  ' +
  DATA.FMT.pct(x.n / totN, 1).padStart(6) + '  ' + DATA.FMT.rp(x.premi).padStart(11)))
const nDir = DATA.prospek({}, { kanal: 'DIRECT' }).length
const nCap = DATA.prospek({}, { kanal: 'CAPTIVE' }).length
p('Direct', DATA.FMT.n(nDir) + '  ' + DATA.FMT.pct(nDir / totN, 1))
p('Captive', DATA.FMT.n(nCap) + '  ' + DATA.FMT.pct(nCap / totN, 1))
uji('Direct ditambah Captive sama dengan seluruhnya', nDir + nCap === DATA.PROSPECTS.length)
uji('Jumlah tujuh sub-kanal sama dengan seluruhnya',
  ORG.SUB_KANAL.reduce((s, sub) => s + DATA.prospek({}, { subKanal: sub }).length, 0) === DATA.PROSPECTS.length)
uji('Tidak ada prospek tanpa kanal', DATA.PROSPECTS.filter((x) => !x.kanal || !x.subKanal).length === 0)
uji('Seluruh sub-kanal dikenali',
  DATA.PROSPECTS.filter((x) => !ORG.SUB_KANAL.includes(x.subKanal)).length === 0)
const prodK = DATA.kanalProduksi({})
uji('Produksi per kanal tersedia', prodK !== null)
if (prodK) {
  const totK = prodK.reduce((s, x) => s + x.nwp, 0)
  const adaData = ORG.BRANCHES.filter((b) => KANAL_DATA.nwp[b.code])
  const nwpAda = adaData.reduce((s, b) => s + b.nwp26, 0)
  p('Cabang berkomposisi kanal', adaData.length + ' dari ' + ORG.BRANCHES.length)
  p('NWP yang tersebar ke kanal', DATA.FMT.rp(totK))
  console.log('  Komposisi produksi nasional:')
  prodK.forEach((x) => console.log('    ' + x.sub.padEnd(18) + x.kanal.padEnd(9) +
    DATA.FMT.pct(x.porsi, 1).padStart(6) + '  ' + DATA.FMT.rp(x.nwp).padStart(11)))
  const dirP = prodK.filter((x) => x.kanal === 'DIRECT').reduce((s, x) => s + x.porsi, 0)
  p('Direct terhadap Captive', DATA.FMT.pct(dirP, 1) + ' berbanding ' + DATA.FMT.pct(1 - dirP, 1))
  uji('Total kanal sama dengan NWP cabang yang punya data',
    Math.abs(totK / nwpAda - 1) < 1e-6, 'selisih ' + ((totK / nwpAda - 1) * 100).toFixed(6) + '%')
  uji('Porsi seluruh sub-kanal berjumlah 100 persen',
    Math.abs(prodK.reduce((s, x) => s + x.porsi, 0) - 1) < 1e-9)
  const salah = ORG.BRANCHES.filter((b) => {
    const row = KANAL_DATA.nwp[b.code]
    if (!row) return false
    return Math.abs(row.reduce((s, v) => s + v, 0) / b.nwp26 - 1) > 1e-4
  })
  uji('Setiap cabang menjumlah ke NWP 2026 masing-masing', salah.length === 0,
    salah.length ? 'menyimpang: ' + salah.map((b) => b.name).join(', ') : '')
  ORG.UNITS.forEach((u) => {
    const pk = DATA.kanalProduksi({ unit: u.id })
    uji('Komposisi tersedia untuk ' + u.short, pk !== null)
  })
}

console.log('\n══ 4. Daftar kerja ══')
console.log('\n══ 4b. Taksonomi mengikut Matrix Distribution ══')
const ACUAN_STATUS = { Cold: 0.0885, Warm: 0.0502, Hot: 0.0247, 'Terbit Polis': 0.6048, Pending: 0.0106, Batal: 0.2212 }
const ACUAN_SUMBER = { 'New Prospek Marketing': 0.9328, 'Existing Prospek': 0.0281, 'Lapse Prospek': 0.0162, Tender: 0.0026, 'Crawling AI': 0.0204 }
const semua = DATA.PROSPECTS
ORG.STATUS.forEach((st) => {
  const porsi = semua.filter((x) => x.status === st).length / semua.length
  p('Porsi ' + st, DATA.FMT.pct(porsi, 1) + '  acuan Kanwil 1 ' + DATA.FMT.pct(ACUAN_STATUS[st], 1))
})
uji('Porsi tiap status dalam 2 poin persen dari acuan Kanwil 1',
  ORG.STATUS.every((st) => Math.abs(semua.filter((x) => x.status === st).length / semua.length - ACUAN_STATUS[st]) < 0.02))
uji('Porsi tiap Tipe Matrix dalam 2 poin persen dari acuan Kanwil 1',
  ORG.SUMBER.every((sm) => Math.abs(semua.filter((x) => x.sumber === sm).length / semua.length - ACUAN_SUMBER[sm]) < 0.02))
uji('Setiap prospek punya status yang sah', semua.every((x) => ORG.STATUS.includes(x.status)))
uji('Setiap prospek punya status effort yang sah', semua.every((x) => ORG.TAHAP.includes(x.tahap)))
uji('Enum lama sudah tidak ada', typeof ORG.KATEGORI === 'undefined' && !ORG.TAHAP.includes('Close'))
uji('Yang hidup persis Cold, Warm, dan Hot',
  semua.every((x) => x.selesai === !ORG.STATUS_HIDUP.includes(x.status)))

const w = DATA.daftarKerja({})
DATA.BUCKET.forEach((b) => p(b.label, DATA.FMT.n(w.bucket[b.id].length)))
p('Di luar tujuh hari', DATA.FMT.n(w.bucket.nanti.length))
p('Jumlah prospek aktif', DATA.FMT.n(w.aktif.length))
p('Perlu tindakan hari ini', DATA.FMT.n(w.perluTindakan.length) + '  senilai ' + DATA.FMT.rp(w.nilaiPerluTindakan))
const jumBucket = DATA.BUCKET.reduce((s, b) => s + w.bucket[b.id].length, 0) + w.bucket.nanti.length
uji('Jumlah seluruh kelompok sama dengan prospek aktif', jumBucket === w.aktif.length)
uji('Prospek selesai tidak masuk daftar kerja', w.aktif.every((x) => !x.selesai))
uji('Daftar kerja hanya berisi status Cold, Warm, dan Hot',
  w.aktif.every((x) => ORG.STATUS_HIDUP.includes(x.status)))
const dkD = DATA.daftarKerja({}, { kanal: 'DIRECT' })
const dkC = DATA.daftarKerja({}, { kanal: 'CAPTIVE' })
uji('Penyaring kanal menjumlah kembali ke seluruhnya',
  dkD.aktif.length + dkC.aktif.length === w.aktif.length)
const perUnit = ORG.UNITS.reduce((s, u) => s + DATA.daftarKerja({ unit: u.id }).aktif.length, 0)
uji('Jumlah tiga Kantor Wilayah sama dengan nasional', perUnit === w.aktif.length)

console.log('\n══ 5. Skor prioritas ══')
w.urut.slice(0, 5).forEach((x, i) => console.log(
  `  ${i + 1}. ${x.nama.slice(0, 28).padEnd(29)}${x.status.padEnd(6)}${x.subKanal.padEnd(16)}` +
  `telat ${String(x.telat).padStart(3)} hari  ${DATA.FMT.rp(x.premi).padStart(10)}  skor ${x.prioritas.toFixed(2)}`))
const hot = w.urut.filter((x) => x.status === 'Hot' && x.telat > 0)
const cold = w.urut.filter((x) => x.status === 'Cold' && x.telat < 0)
uji('Hot lewat tempo selalu di atas Cold belum jatuh tempo',
  !hot.length || !cold.length || Math.min(...hot.map((x) => x.prioritas)) > Math.max(...cold.map((x) => x.prioritas)))
uji('Urutan menurun', w.urut.every((x, i) => i === 0 || w.urut[i - 1].prioritas >= x.prioritas))

console.log('\n══ 6. Temuan otomatis ══')
INS.untukLingkup({}).forEach((i, n) =>
  console.log(`  ${n + 1}. [${i.tone}]${i.grup === 'kanal' ? '[kanal]' : ''} ${i.head}`))
uji('Terdapat satu temuan kanal pada tampilan nasional',
  INS.untukLingkup({}).some((x) => x.grup === 'kanal'))
uji('Setiap Kantor Wilayah menghasilkan temuan',
  ORG.UNITS.every((u) => INS.untukLingkup({ unit: u.id }).length > 0))


console.log('\n══ 7. Marketing Officer, data nyata ══')
const asli = DATA.MOS.filter((m) => !m.namaSimulasi)
p('Marketing Officer', DATA.MOS.length + ' (' + asli.length + ' dari export, ' + (DATA.MOS.length - asli.length) + ' cadangan)')
p('Punya angka 2025 dan 2026', asli.filter((m) => m.p25 !== 0 && m.p26 !== 0).length)
uji('Porsi tiap cabang berjumlah satu', ORG.BRANCHES.every((b) => {
  const mine = (DATA.MO_BY_BRANCH.get(b.id) || []).map((i) => DATA.MOS[i])
  if (!mine.length) return true
  return Math.abs(mine.reduce((s, m) => s + m.share, 0) - 1) < 1e-9
}))
uji('Tidak ada porsi negatif', DATA.MOS.every((m) => m.share >= 0))
const contoh = asli.slice(0, 3)
contoh.forEach((m) => console.log('    ' + m.nama.padEnd(28) + ORG.branchById(m.branch).name.padEnd(16) +
  'porsi ' + DATA.FMT.pct(m.share, 1).padStart(6) + '  vs 2025 ' + (m.yoy === null ? '-' : DATA.FMT.pctSigned(m.yoy))))

console.log('\n══ 8. Perbandingan tahun ══')
const y = DATA.yoy({})
p('Periode berkas', DATA.BULAN_P25 + ' bulan berbanding ' + DATA.BULAN_P26 + ' bulan')
p('Laju 2025', DATA.FMT.rp(y.p25 / DATA.BULAN_P25) + ' per bulan')
p('Laju 2026', DATA.FMT.rp(y.p26 / DATA.BULAN_P26) + ' per bulan')
p('Perubahan disetarakan', DATA.FMT.pctSigned(y.yoy, 1))
p('Bila total dibandingkan mentah', DATA.FMT.pctSigned(y.p26 / y.p25 - 1, 1) + '  (menyesatkan)')
console.log('  Silang uji terhadap Notulen Rapim:')
const cek = [['Corporate', 0.27, 'GPW tumbuh 27 persen'], ['Broker', 0.61, 'GPW 41 dan NPW 77 persen'],
  ['Banking', -0.13, 'turun'], ['Multifinance', -0.08, 'turun']]
cek.forEach(([sub, acuan, ket]) => {
  const i = ORG.SUB_KANAL.indexOf(sub)
  const d = DATA.lajuYoY(y.kanal25[i], y.kanal26[i])
  console.log('    ' + sub.padEnd(15) + DATA.FMT.pctSigned(d, 1).padStart(7) + '   Rapim: ' + ket)
})
uji('Jumlah tiga Kantor Wilayah sama dengan nasional YoY',
  Math.abs(ORG.UNITS.reduce((s, u) => s + DATA.yoy({ unit: u.id }).p26, 0) / y.p26 - 1) < 1e-9)

console.log('\n══ 9. Proyeksi ══')
const pr = DATA.proyeksi({})
p('Realisasi', DATA.FMT.rp(pr.realisasi) + ' dalam ' + DATA.BULAN_TERSEDIA + ' bulan')
p('Target setahun', DATA.FMT.rp(pr.target))
p('Proyeksi dari laju', DATA.FMT.rp(pr.dariLaju) + ' = ' + DATA.FMT.pct(pr.capaianLaju, 1))
p('Pipeline berbobot', DATA.FMT.rp(pr.pipelineBerbobot) + ' dari mentah ' + DATA.FMT.rp(pr.pipelineMentah))
p('Kecukupan pipeline', DATA.FMT.pct(pr.kecukupan, 1))
p('Kesimpulan', pr.verdict)
uji('Proyeksi laju sama dengan realisasi ditambah laju kali sisa bulan',
  Math.abs(pr.dariLaju - (pr.realisasi + pr.lajuBulanan * pr.sisaBulan)) < 1)
uji('Laju dan pipeline tidak dijumlahkan', pr.dariLaju !== pr.dariPipeline)
uji('Sumbangan tiap status sama dengan premi dikali bobotnya',
  pr.perStatus.every((x) => Math.abs(x.berbobot - x.premi * x.bobot) < 1))
uji('Jumlah sumbangan status sama dengan pipeline berbobot',
  Math.abs(pr.perStatus.reduce((s, x) => s + x.berbobot, 0) - pr.pipelineBerbobot) < 1)
uji('Proyeksi tersedia untuk setiap Kantor Wilayah',
  ORG.UNITS.every((u) => DATA.proyeksi({ unit: u.id }).target > 0))

console.log('\n== 10. Ketergantungan orang kunci ==')
const ro = DATA.risikoOrang({})
p('Cabang dinilai', DATA.FMT.n(ro.semua.length) + '  ambang ' + DATA.FMT.rp(DATA.AMBANG_UNIT))
p('Bertumpu satu orang', DATA.FMT.n(ro.tinggi.length) + '  senilai ' + DATA.FMT.rp(ro.nilaiTinggi) +
  ' = ' + DATA.FMT.pct(ro.porsiNasional, 1) + ' nasional')
p('Perlu diperhatikan', DATA.FMT.n(ro.sedang.length))
ro.tinggi.slice(0, 5).forEach((x) => console.log(
  '  ' + x.nama.slice(0, 22).padEnd(23) + String(x.nMo).padStart(3) + ' MO  ' +
  DATA.FMT.rp(x.nwp).padStart(9) + '  ' + x.moNama.slice(0, 26).padEnd(27) + DATA.FMT.pct(x.porsi)))
uji('Porsi selalu antara nol dan satu', ro.semua.every((x) => x.porsi > 0 && x.porsi <= 1))
uji('Hanya cabang di atas ambang yang dinilai', ro.semua.every((x) => x.nwp >= DATA.AMBANG_UNIT))
uji('Nilai yang bertumpu tidak melampaui produksi cabang',
  ro.semua.every((x) => x.nwpKunci <= x.nwp + 1))
uji('Tingkat risiko sesuai ambangnya', ro.semua.every((x) =>
  (x.tingkat === 'tinggi') === (x.porsi >= DATA.AMBANG_RISIKO.tinggi)))
uji('Jumlah tiga Kantor Wilayah sama dengan nasional',
  ORG.UNITS.reduce((s, u) => s + DATA.risikoOrang({ unit: u.id }).semua.length, 0) === ro.semua.length)
uji('Cabang dengan satu Marketing Officer selalu seratus persen',
  ro.semua.filter((x) => x.nMoAktif === 1).every((x) => Math.abs(x.porsi - 1) < 1e-9))

console.log('\n== 11. Marketing Officer yang berhenti berproduksi ==')
const mt = DATA.moTurun({})
p('Ber-NWP nol atau minus', DATA.FMT.n(mt.total))
p('Perlu ditanyakan', DATA.FMT.n(mt.turun.length) + '  membawa produksi 2025 ' + DATA.FMT.rp(mt.nilai25))
p('Sudah kecil sejak 2025', DATA.FMT.n(mt.kecilSejakDulu))
p('Baru bergabung', DATA.FMT.n(mt.baru))
mt.turun.slice(0, 5).forEach((x) => console.log(
  '  ' + x.nama.slice(0, 28).padEnd(29) + x.cabang.slice(0, 16).padEnd(17) +
  DATA.FMT.rp(x.p25).padStart(9) + ' -> ' + DATA.FMT.rp(x.p26).padStart(9)))
uji('Tiga kelompok berjumlah sama dengan seluruh yang nol atau minus',
  mt.turun.length + mt.kecilSejakDulu + mt.baru === mt.total)
uji('Yang perlu ditanyakan memenuhi kedua syaratnya',
  mt.turun.every((x) => x.p25 >= DATA.AMBANG_TURUN && x.p26 <= 0))
uji('Urutan menurun menurut produksi 2025',
  mt.turun.every((x, i) => i === 0 || mt.turun[i - 1].p25 >= x.p25))
uji('Jumlah tiga Kantor Wilayah sama dengan nasional',
  ORG.UNITS.reduce((s, u) => s + DATA.moTurun({ unit: u.id }).turun.length, 0) === mt.turun.length)
uji('Seksi ini tidak muncul pada tampilan Marketing Officer',
  !/function viewMO[\s\S]*?bandOrangKunci/.test(String(viewMO)))
