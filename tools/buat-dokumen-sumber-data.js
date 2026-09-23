// buat-dokumen-sumber-data.js, menyusun dokumen Word sumber data untuk tim IT.
//
// Jalankan dari folder project, sesudah node tools/tangkap-peta.mjs:
//     node tools/buat-dokumen-sumber-data.js
//
// Hasil: docs/Sumber Data Uniport Executive Dashboard.docx
// Daftar isi baru terisi setelah dibuka dan diperbarui di Word. Untuk mengisinya
// tanpa membuka Word, lihat bagian "Dokumen untuk tim IT" di README.
//
// Butuh paket npm docx. Bila belum ada: npm install docx --no-save
const fs = require('fs')
const path = require('path')
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType,
  ShadingType, AlignmentType, HeadingLevel, LevelFormat, BorderStyle, Footer, Header,
  PageNumber, TableOfContents, PageBreak, ImageRun,
} = require('docx')

const ROOT = path.join(__dirname, '..')
const { SISTEM_SUMBER, PETA_SUMBER } = require(path.join(ROOT, 'src', 'dokumentasi', 'peta-sumber.ts'))
const KELUAR = path.join(ROOT, 'docs', 'Sumber Data Uniport Executive Dashboard.docx')
const FOLDER_PETA = path.join(ROOT, 'docs', 'peta')

const NAVY = '0A2342'
const EMAS = 'C9A74C'
const ABU = '5B6675'
const GARIS = 'D5DBE3'
const LEBAR = 9638 // A4 dengan margin 2 cm, dalam DXA

// Nama sistem yang dipakai di kolom "Sistem asal", dengan warna yang sama
// persis dengan kotak di gambar peta.
const SISTEM = Object.fromEntries(Object.entries(SISTEM_SUMBER).map(([k, s]) => [s.label, {
  fg: s.warna.replace('#', ''),
  bg: { ereport: 'E6EEF9', etarget: 'EFE8F7', matrix: 'F7F0DC', hcq: 'E3F4EA', uniport: 'FBE7EA', olahan: 'ECEEF1' }[k],
}]))

const t = (text, o = {}) => new TextRun({ text, ...o })
const isiRun = (isi) => (Array.isArray(isi) ? isi : [isi]).map((x) => (typeof x === 'string' ? t(x) : x))
const p = (isi, o = {}) => new Paragraph({ spacing: { after: 120, line: 300 }, ...o, children: isiRun(isi) })
const h1 = (text, o = {}) => new Paragraph({ heading: HeadingLevel.HEADING_1, ...o, children: [t(text)] })
const h2 = (text, o = {}) => new Paragraph({ heading: HeadingLevel.HEADING_2, ...o, children: [t(text)] })
const bullet = (isi) => new Paragraph({ numbering: { reference: 'titik', level: 0 }, spacing: { after: 80, line: 290 }, children: isiRun(isi) })
const nomor = (isi) => new Paragraph({ numbering: { reference: 'angka', level: 0 }, spacing: { after: 80, line: 290 }, children: isiRun(isi) })
const jeda = () => new Paragraph({ spacing: { after: 160 }, children: [] })

const batas = { style: BorderStyle.SINGLE, size: 4, color: GARIS }
const batasSel = { top: batas, bottom: batas, left: batas, right: batas }

function sel(isi, lebar, { kepala = false, sistem = null, tebal = false } = {}) {
  const warna = sistem ? SISTEM[sistem] : null
  return new TableCell({
    width: { size: lebar, type: WidthType.DXA },
    borders: batasSel,
    margins: { top: 70, bottom: 70, left: 100, right: 100 },
    shading: kepala
      ? { type: ShadingType.CLEAR, color: 'auto', fill: NAVY }
      : warna ? { type: ShadingType.CLEAR, color: 'auto', fill: warna.bg } : undefined,
    children: (Array.isArray(isi) ? isi : [isi]).map((x) => new Paragraph({
      spacing: { after: 30, line: 260 },
      children: [t(String(x), {
        size: 18,
        bold: kepala || tebal || !!warna,
        color: kepala ? 'FFFFFF' : warna ? warna.fg : '1C2430',
      })],
    })),
  })
}

/* kolom: [{judul, lebar}]; kolomSistem: indeks kolom yang berisi nama sistem */
function tabel(kolom, baris, { kolomSistem = -1, kolomTebal = -1 } = {}) {
  const lebar = kolom.map((k) => k.lebar)
  const jumlah = lebar.reduce((a, b) => a + b, 0)
  if (jumlah !== LEBAR) throw new Error('lebar tabel ' + jumlah + ' bukan ' + LEBAR)
  return new Table({
    width: { size: LEBAR, type: WidthType.DXA },
    columnWidths: lebar,
    rows: [
      new TableRow({ tableHeader: true, children: kolom.map((k) => sel(k.judul, k.lebar, { kepala: true })) }),
      ...baris.map((r) => new TableRow({
        cantSplit: true,
        children: r.map((isi, i) => sel(isi, lebar[i], {
          sistem: i === kolomSistem ? isi : null,
          tebal: i === kolomTebal,
        })),
      })),
    ],
  })
}

function kotak(judul, kalimat, warna = EMAS) {
  const tanpa = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
  return new Table({
    width: { size: LEBAR, type: WidthType.DXA },
    columnWidths: [LEBAR],
    rows: [new TableRow({ children: [new TableCell({
      width: { size: LEBAR, type: WidthType.DXA },
      borders: { left: { style: BorderStyle.SINGLE, size: 24, color: warna }, top: tanpa, bottom: tanpa, right: tanpa },
      shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'F7F4EA' },
      margins: { top: 120, bottom: 120, left: 200, right: 160 },
      children: [
        new Paragraph({ spacing: { after: 60 }, children: [t(judul, { bold: true, color: NAVY })] }),
        ...(Array.isArray(kalimat) ? kalimat : [kalimat]).map((k) =>
          new Paragraph({ spacing: { after: 40, line: 280 }, children: [t(k, { size: 20 })] })),
      ],
    })] })],
  })
}

// Ukuran PNG dibaca dari header IHDR, tanpa pustaka tambahan.
function ukuranPng(buf) {
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) }
}

// ───────────────────────── ISI ─────────────────────────
const isi = []
const S = (k) => SISTEM_SUMBER[k].label

// Sampul
isi.push(
  new Paragraph({ spacing: { before: 1800, after: 120 }, children: [t('UNIPORT', { bold: true, color: EMAS, size: 22, characterSpacing: 60 })] }),
  new Paragraph({ spacing: { after: 200 }, children: [t('Sumber Data Executive Dashboard', { bold: true, color: NAVY, size: 52 })] }),
  new Paragraph({
    spacing: { after: 600 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: EMAS, space: 12 } },
    children: [t('Asal data tiap bagian layar, cara pengolahan, dan kebutuhan integrasi untuk tim Teknologi Informasi', { color: ABU, size: 24 })],
  }),
  tabel(
    [{ judul: 'Keterangan', lebar: 2800 }, { judul: 'Isi', lebar: 6838 }],
    [
      ['Aplikasi', 'Uniport Executive Dashboard'],
      ['Tanggal', '17 September 2026'],
      ['Disusun oleh', 'Fernando Widjaja, Quality Control Customer Service'],
      ['Untuk', 'Tim Teknologi Informasi PT Asuransi Sinar Mas'],
      ['Klasifikasi', 'Rahasia internal. Memuat nama Marketing Officer. Tidak untuk diedarkan ke luar perusahaan.'],
    ],
    { kolomTebal: 0 },
  ),
  new Paragraph({ children: [new PageBreak()] }),
  new Paragraph({ spacing: { after: 200 }, children: [t('Daftar isi', { bold: true, color: NAVY, size: 32 })] }),
  new TableOfContents('Daftar isi', { hyperlink: true, headingStyleRange: '1-2' }),
  new Paragraph({ children: [new PageBreak()] }),
)

// 1
isi.push(
  h1('1. Tujuan dokumen'),
  p('Executive Dashboard mempertemukan data produksi, target, effort pemasaran, dan struktur organisasi dalam satu tampilan di Uniport, untuk mendukung evaluasi kinerja berkadensi harian dan mingguan.'),
  p('Dokumen ini menjelaskan, untuk setiap bagian layar, dari sistem mana datanya diambil, bagaimana diolah, dan apa yang dibutuhkan dari tim Teknologi Informasi supaya seluruh data dapat ditarik langsung dari sistem sumbernya.'),
  h2('Enam sistem asal data'),
  p('Setiap angka di layar berasal dari salah satu sistem berikut. Warna yang sama dipakai pada kotak di gambar bab 3.'),
  tabel(
    [{ judul: 'Sistem', lebar: 2500 }, { judul: 'Data yang diambil', lebar: 7138 }],
    Object.values(SISTEM_SUMBER).map((s) => [s.label, (s.sub ? s.sub + '. ' : '') + s.data]),
    { kolomSistem: 0 },
  ),
)

// 2
isi.push(
  h1('2. Gambaran alur data'),
  p('Data dari lima sistem sumber dipertemukan di dashboard. Uniport menentukan siapa yang melihat dan lingkup datanya; empat sistem lain menyumbang isinya; dashboard mengolah hasil gabungannya.'),
  tabel(
    [
      { judul: 'Sistem', lebar: 2200 },
      { judul: 'Peran dalam dashboard', lebar: 3538 },
      { judul: 'Yang dibutuhkan', lebar: 3900 },
    ],
    [
      [S('uniport'), 'Login tunggal. Peran pengguna menentukan lingkup: nasional, Kantor Wilayah, cabang, atau portofolio sendiri.', 'Identitas pengguna, peran, dan kode lingkup pada setiap login.'],
      [S('hcq'), 'Organization Master Data Area sebagai kerangka: cabang, Kantor Wilayah induk, serta Marketing Officer dan Pimpinan Cabang yang aktif.', 'Master cabang dan master karyawan aktif dengan kode cabang dan kode MO.'],
      [S('ereport'), 'Seluruh angka produksi: NWP per tanggal, per sumber bisnis, per cabang, dan per Marketing Officer, tahun berjalan dan tahun lalu.', 'Pengambilan data produksi harian otomatis.'],
      [S('etarget'), 'Target NWP setahun dan bulanan, diambil lewat HCC atau ASMPro.', 'Target per cabang dan per Marketing Officer.'],
      [S('matrix'), 'Prospek, status, jatuh tempo tindak lanjut, estimasi premi, dan aktivitas effort Marketing Officer.', 'Endpoint resmi yang terautentikasi.'],
      [S('olahan'), 'Capaian, proyeksi, kecukupan pipeline, tindakan disarankan, dan AI Insight, dihitung dari data di atas.', 'Tidak butuh sumber tambahan.'],
    ],
    { kolomSistem: 0 },
  ),
  jeda(),
  kotak('Kunci penggabungan antar sistem', [
    'Seluruh sistem sebaiknya dipertemukan lewat kode, bukan nama: kode cabang dan kode Marketing Officer dari HCQ.',
    'Pada pengecekan contoh, nama marketing di Matrix Distribution sama persis dengan nama di eReport. Meski begitu nama bisa kembar antar cabang dan ejaannya bisa berubah, sementara kode bersifat tetap.',
  ], NAVY),
)

// 3, peta layar
isi.push(
  h1('3. Peta sumber data di layar', { pageBreakBefore: true }),
  p('Gambar berikut adalah tangkapan layar dashboard. Setiap kotak bernomor menandai satu bagian layar, dan label pada kotak menyebut sistem asal datanya. Rincian tiap nomor ada di tabel di bawah gambar.'),
  p('Tampilan yang ditangkap: Pemimpin Wilayah Kantor Wilayah 1 untuk seluruh seksi, lalu Pimpinan Cabang dan Marketing Officer untuk bagian yang berbeda. Tampilan Direksi memakai sumber yang sama dengan lingkup nasional.'),
  tabel(
    [{ judul: 'Gambar', lebar: 1300 }, { judul: 'Isi', lebar: 6338 }, { judul: 'Jumlah kotak', lebar: 2000 }],
    PETA_SUMBER.map((pt, i) => [String(i + 1), pt.judul, String(pt.kotak.length)]),
  ),
)

const LEBAR_PX = 642 // lebar isi halaman dalam piksel pada 96 dpi
const TINGGI_MAKS = 820
PETA_SUMBER.forEach((pt, i) => {
  const berkas = path.join(FOLDER_PETA, pt.id + '.png')
  if (!fs.existsSync(berkas)) throw new Error('Gambar belum ada: ' + berkas + '. Jalankan node tools/tangkap-peta.mjs')
  const data = fs.readFileSync(berkas)
  const { w, h } = ukuranPng(data)
  let lebar = LEBAR_PX
  let tinggi = Math.round(LEBAR_PX * h / w)
  if (tinggi > TINGGI_MAKS) { tinggi = TINGGI_MAKS; lebar = Math.round(TINGGI_MAKS * w / h) }

  isi.push(
    h2(`3.${i + 1} ${pt.judul}`, { pageBreakBefore: true }),
    new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { after: 160 },
      children: [new ImageRun({ type: 'png', data, transformation: { width: lebar, height: tinggi },
        altText: { title: pt.judul, description: 'Tangkapan layar ' + pt.judul + ' dengan kotak sistem asal data', name: pt.id } })],
    }),
    tabel(
      [
        { judul: 'No', lebar: 600 },
        { judul: 'Bagian di layar', lebar: 2900 },
        { judul: 'Sistem asal', lebar: 2238 },
        { judul: 'Data yang diambil', lebar: 3900 },
      ],
      pt.kotak.map((k, j) => [String(j + 1), k.bagian, SISTEM_SUMBER[k.sistem].label, k.data]),
      { kolomSistem: 2 },
    ),
  )
})

// 4, berkas ekspor
const TBL_BUTIR = [{ judul: 'Butir', lebar: 2400 }, { judul: 'Keterangan', lebar: 7238 }]
isi.push(
  h1('4. Berkas ekspor yang dipakai sekarang', { pageBreakBefore: true }),
  p('Sebelum integrasi berjalan, data eReport dan struktur cabang diambil dari berkas ekspor berikut. Bagian ini berguna untuk mencocokkan kolom saat merancang pengambilan data otomatis.'),
  h2('4.1 MasterDataArea (12).xlsx'),
  tabel(TBL_BUTIR, [
    ['Sistem asal', 'Organization Master Data Area'],
    ['Sheet', 'Kanwil, 122 baris data'],
    ['Kolom yang dipakai', 'Kategori, Induk (Kantor Wilayah), Nama Lokasi, Provinsi, Kota/Kabupaten'],
    ['Kolom yang tidak dipakai', 'Nama Perusahaan, Nama Lengkap Lokasi, Alamat, Kecamatan, Kelurahan, Kode Pos, Latitude, Longitude, Timezone'],
    ['Dipakai untuk', 'Daftar cabang dan pengelompokannya ke tiga Kantor Wilayah'],
  ], { kolomTebal: 0 }),
  h2('4.2 Produksi up to Juli 2026.xlsx'),
  tabel(TBL_BUTIR, [
    ['Sistem asal', 'eReport'],
    ['Sheet', 'Sheet1, 118 baris cabang'],
    ['Kolom yang dipakai', 'KANWIL, CABANG, KELAS CABANG, NWP 2025, SYARAT 1.1 NWP ALL, NWP 2026, PROFIT 2025, PROFIT 2026'],
    ['Kolom yang tidak dipakai', 'NO, TARGET % NWP ALL, TARGET % PROFIT, MIN. PROFIT, SYARAT 2 PROFIT'],
    ['Periode', 'NWP dan profit 2025 satu tahun penuh. NWP dan profit 2026 Januari sampai Juli.'],
    ['Catatan', 'Kolom SYARAT 1.1 berisi NWP 2025 dikali 115 persen dan untuk sementara dipakai sebagai target. Sumber target yang sebenarnya adalah eTarget.'],
  ], { kolomTebal: 0 }),
  h2('4.3 Production Longterm all kanwil 2025.xlsx dan 2026.xlsx'),
  tabel(TBL_BUTIR, [
    ['Sistem asal', 'eReport, ekspor pivot Flexmonster'],
    ['Sheet', 'Flexmonster Pivot Table. Baris 1 dan 2 berisi judul pivot, kepala kolom di baris 3. Berkas 2025 memuat 1.066 baris data, berkas 2026 memuat 907 baris data.'],
    ['Kolom yang dipakai', 'KANWIL, CABANG, SUB_PERWAKILAN, MO, lalu tujuh kolom sumber bisnis: AGENCY, BANKING, BROKER, CORPORATE, DIRECT, MULTIFINANCE, SMG'],
    ['Dipakai untuk', 'Komposisi sumber bisnis per cabang, produksi tiap Marketing Officer, perbandingan dengan tahun lalu, ketergantungan orang kunci, dan daftar Marketing Officer yang berhenti berproduksi'],
  ], { kolomTebal: 0 }),
)

// 5, katalog
const KAT = [
  { judul: 'Angka di layar', lebar: 2300 },
  { judul: 'Sistem asal', lebar: 1900 },
  { judul: 'Data dan cara diolah', lebar: 5438 },
]
const bagian = (judul, baris) => [h2(judul), tabel(KAT, baris, { kolomSistem: 1, kolomTebal: 0 }), jeda()]
isi.push(
  h1('5. Katalog data per bagian dashboard', { pageBreakBefore: true }),
  p('Rumus dan aturan pengolahan untuk tiap angka. Urutan mengikuti susunan layar.'),
  ...bagian('5.1 Ringkasan', [
    ['Produksi bulan berjalan dan grafik harian', S('ereport'), 'NWP per tanggal, dijumlah per bulan untuk angka utama dan ditampilkan per hari pada grafik.'],
    ['Target bulan dan target setahun', S('etarget'), 'Target NWP setahun dan bulanan per cabang, diambil lewat HCC atau ASMPro.'],
    ['Capaian tahun berjalan', S('olahan'), 'NWP tahun berjalan dibagi target setahun dikali jumlah bulan berjalan per dua belas.'],
    ['Perlu tindakan hari ini', S('matrix'), 'Jumlah prospek berstatus Cold, Warm, atau Hot yang tanggal tindak lanjutnya sudah lewat atau jatuh hari ini.'],
    ['Komposisi Direct dan Captive', S('ereport'), 'NWP per sumber bisnis. Direct terdiri dari Direct, Corporate, Agency. Captive terdiri dari Banking, Multifinance, Broker, Sinar Mas Group.'],
    ['Pipeline prospek per channel', S('matrix'), 'Jumlah dan estimasi premi prospek per sumber bisnis.'],
    ['Jumlah cabang dan Marketing Officer', S('hcq'), 'Cabang dalam lingkup dan Marketing Officer yang aktif.'],
  ]),
  ...bagian('5.2 Perlu tindakan', [
    ['Empat kelompok jatuh tempo', S('matrix'), 'Hari terlambat dihitung dari tanggal kontak terakhir ditambah batas waktu menurut status: Hot 3 hari, Warm 7 hari, Cold 14 hari. Batas waktu ini usulan dan perlu disepakati.'],
    ['Tabel prioritas', S('matrix'), 'Skor = bobot status (Hot 3, Warm 2, Cold 1) dikali log10(premi dalam juta + 1) dikali (1 + hari terlambat / 7) dikali faktor jatuh tempo.'],
    ['Marketing Officer penanggung jawab', S('hcq'), 'Nama Marketing Officer aktif, dicocokkan ke prospek lewat kode MO.'],
    ['Tindakan disarankan', S('olahan'), 'Aturan tetap menurut status prospek, status effort terakhir, dan keterlambatan.'],
    ['Arti status Cold, Warm, Hot', S('matrix'), 'Kalimat keterangan dikutip apa adanya dari layar Matrix Distribution.'],
  ]),
  ...bagian('5.3 Proyeksi pencapaian target', [
    ['Realisasi tahun berjalan', S('ereport'), 'NWP Januari sampai bulan berjalan.'],
    ['Proyeksi akhir tahun', S('olahan'), 'Realisasi ditambah rata-rata bulanan dikali sisa bulan.'],
    ['Posisi terhadap target', S('etarget'), 'Target NWP setahun, dibandingkan dengan realisasi dan proyeksi.'],
    ['Pipeline berbobot dan kecukupan', S('matrix'), 'Estimasi premi prospek dikali bobot: Cold 10 persen, Warm 25 persen, Hot 50 persen, Pending 5 persen, Terbit Polis dan Batal nol. Kecukupan = pipeline berbobot dibagi kebutuhan produksi sisa tahun. Bobot usulan dan perlu disepakati.'],
  ]),
  ...bagian('5.4 Ketergantungan orang kunci', [
    ['Porsi Marketing Officer terbesar', S('ereport'), 'Produksi Marketing Officer terbesar dibagi total produksi positif cabang. Hanya cabang dengan NWP tahun berjalan minimal Rp 2 miliar yang dinilai.'],
    ['Nama dan jumlah Marketing Officer', S('hcq'), 'Marketing Officer aktif per cabang.'],
    ['Penilaian', S('olahan'), 'Porsi 60 persen ke atas: bertumpu satu orang. 40 sampai 60 persen: perlu diperhatikan. Di bawahnya: menyebar.'],
  ]),
  ...bagian('5.5 Perlu ditanyakan', [
    ['Produksi dua tahun', S('ereport'), 'Produksi per Marketing Officer tahun lalu dan tahun berjalan. Masuk daftar bila tahun lalu minimal Rp 100 juta dan tahun berjalan nol atau minus.'],
    ['Nama, cabang, Kantor Wilayah', S('hcq'), 'Marketing Officer aktif dan penempatannya.'],
    ['Selisih', S('olahan'), 'Produksi tahun berjalan dikurangi produksi tahun lalu.'],
  ]),
  ...bagian('5.6 Kinerja', [
    ['Perbandingan terhadap tahun lalu', S('ereport'), 'Rata-rata per bulan: total tahun lalu dibagi 12, total tahun berjalan dibagi jumlah bulan berjalan.'],
    ['Produksi, kelas, porsi, beban', S('ereport'), 'NWP dan profit per cabang. Beban = NWP dikurangi profit.'],
    ['Capaian bulan dan tahun', S('etarget'), 'Target bulanan dan setahun. Persen dihitung dashboard dari NWP eReport.'],
    ['Daftar cabang dan Marketing Officer', S('hcq'), 'Cabang dalam Kantor Wilayah dan Marketing Officer aktif.'],
    ['Aktivitas tujuh hari, hari tanpa aktivitas, prospek aktif, konversi', S('matrix'), 'Aktivitas effort per hari per Marketing Officer, prospek hidup, dan prospek berstatus Terbit Polis.'],
    ['Distribusi lini usaha dan cross selling', S('matrix'), 'Prospek per lini usaha dengan status dan estimasi premi. Peluang cross selling dihitung dashboard.'],
  ]),
  ...bagian('5.7 Ritme kerja Marketing Officer', [
    ['Aktivitas 30 hari dan komposisi aktivitas', S('matrix'), 'Kunjungan, telepon, penawaran, dan follow up per hari.'],
    ['Pipeline per channel', S('matrix'), 'Prospek dan estimasi premi per sumber bisnis.'],
    ['Produksi per channel', S('ereport'), 'NWP pribadi per sumber bisnis.'],
  ]),
  ...bagian('5.8 AI Insight', [
    ['Temuan otomatis', S('olahan'), 'Aturan tetap atas data seluruh sistem. Pada penerapan sebenarnya perlu verifikasi manusia sebelum ditindaklanjuti.'],
  ]),
)

// 6, aturan
isi.push(
  h1('6. Aturan pengolahan yang perlu diketahui', { pageBreakBefore: true }),
  h2('6.1 Kolom kelompok pada ekspor Flexmonster'),
  p('Ekspor pivot Flexmonster hanya mengisi kolom KANWIL, CABANG, dan SUB_PERWAKILAN pada baris pertama tiap kelompok. Baris berikutnya kosong. Tanpa pengisian ke bawah, sekitar 90 persen baris akan terbuang. Pengambilan data dalam bentuk tabel datar dengan kolom terisi penuh menghilangkan risiko ini.'),
  h2('6.2 Penyamaan nama cabang'),
  p('Nama cabang ditulis berbeda antara Organization Master Data Area dan eReport:'),
  tabel(
    [{ judul: 'Pada eReport', lebar: 4819 }, { judul: 'Pada Organization Master Data Area', lebar: 4819 }],
    [
      ['BSD', 'BUMI SERPONG DAMAI'], ['PEKANBARU', 'PEKAN BARU'], ['PADANG SIDEMPUAN', 'PADANGSIDIMPUAN'],
      ['SEMARANG AGENCY', 'AGENCY SEMARANG'], ['PEKAN BARU AGENCY', 'AGENCY PEKAN BARU'],
      ['MANADO AGENCY', 'AGENCY MANADO'], ['MAKASSAR AGENCY', 'AGENCY MAKASSAR'], ['BATAM AGENCY', 'AGENCY BATAM'],
    ],
  ),
  jeda(),
  p('Integrasi sebaiknya memakai kode cabang dari HCQ supaya daftar padanan ini tidak perlu dipelihara.'),
  h2('6.3 Perbedaan basis ukur'),
  p('Total berkas Production Longterm 2026 adalah Rp 363,1 miliar, sedangkan NWP 2026 pada berkas produksi Rp 298,8 miliar, atau selisih sekitar 21,5 persen. Karena itu berkas Longterm hanya dipakai untuk porsi, yaitu porsi sumber bisnis per cabang dan porsi tiap Marketing Officer. Nilai rupiah yang ditampilkan selalu diambil dari NWP berkas produksi.'),
  h2('6.4 Perbedaan panjang periode'),
  p('Data tahun lalu mencakup 12 bulan dan tahun berjalan 7 bulan, sehingga perbandingan tahun dilakukan per bulan. Membandingkan totalnya langsung akan memunculkan penurunan semu sekitar 40 persen.'),
  h2('6.5 Rekonsiliasi'),
  p('Total pada tingkat cabang, Kantor Wilayah, dan nasional sama persis dengan berkas sumber, dengan selisih 0,0000 persen untuk NWP maupun beban. Pemeriksaan ini dijalankan otomatis oleh probe.js.'),
  h2('6.6 Baris yang dikecualikan'),
  bullet('Baris pada kolom MO berisi (blank) atau diawali RENEWAL tidak dihitung sebagai Marketing Officer. Baris RENEWAL menyumbang sekitar 2,5 persen produksi 2026.'),
  bullet('Satu baris pada berkas produksi memuat nama perorangan pada kolom CABANG. Nama tersebut disamarkan menjadi UNIT KHUSUS KANWIL 2, sedangkan angkanya dipertahankan supaya total Kantor Wilayah tetap sesuai.'),
)

// 7, kebutuhan
isi.push(
  h1('7. Kebutuhan data dari tim Teknologi Informasi', { pageBreakBefore: true }),
  p('Data minimum agar seluruh bagian dashboard diambil langsung dari sistem sumbernya, tanpa ekspor manual.'),
  tabel(
    [
      { judul: 'No', lebar: 500 },
      { judul: 'Kebutuhan', lebar: 1700 },
      { judul: 'Sistem', lebar: 1700 },
      { judul: 'Field minimum', lebar: 3338 },
      { judul: 'Frekuensi', lebar: 1000 },
      { judul: 'Dipakai di', lebar: 1400 },
    ],
    [
      ['1', 'Produksi per transaksi', S('ereport'), 'Tanggal transaksi, kode cabang, kode Marketing Officer, sumber bisnis (tujuh kategori), GPW, NWP, klaim atau beban', 'Harian', '5.1, 5.3 sampai 5.7'],
      ['2', 'Target', S('etarget'), 'Kode cabang, kode Marketing Officer, target NWP setahun dan bulanan. Diambil lewat HCC atau ASMPro', 'Bulanan', '5.1, 5.3, 5.6'],
      ['3', 'Master cabang', S('hcq'), 'Organization Master Data Area: kode cabang, nama, kode Kantor Wilayah, kelas cabang, status aktif', 'Saat berubah', 'Seluruh bagian'],
      ['4', 'Marketing Officer dan Pimpinan Cabang aktif', S('hcq'), 'Kode karyawan, kode MO, nama, jabatan, kode cabang, status aktif, tanggal bergabung, tanggal keluar', 'Harian', '5.2, 5.4 sampai 5.7'],
      ['5', 'Prospek', S('matrix'), 'ID prospek, kode cabang, kode Marketing Officer, Tipe Matrix, status prospek, status effort terakhir, tanggal effort terakhir, tanggal tindak lanjut berikutnya, estimasi GPW dan NPW, sumber bisnis, lini usaha', 'Harian', '5.1 sampai 5.3, 5.6, 5.7'],
      ['6', 'Aktivitas effort', S('matrix'), 'ID effort, ID prospek, kode Marketing Officer, tanggal, jenis aktivitas, keterangan', 'Harian', '5.6, 5.7'],
      ['7', 'Identitas dan peran', S('uniport'), 'ID pengguna, peran (Direksi, Pemimpin Wilayah, Pimpinan Cabang, Marketing Officer), kode lingkup', 'Setiap login', 'Pembatasan tampilan'],
    ],
    { kolomSistem: 2, kolomTebal: 1 },
  ),
)

// 8, konfirmasi
isi.push(
  h1('8. Hal yang perlu dikonfirmasi'),
  nomor([t('Kelas cabang. ', { bold: true }), t('Sekarang diambil dari eReport. Apakah sumber resminya eReport atau Organization Master Data Area di HCQ.')]),
  nomor([t('Target di eTarget. ', { bold: true }), t('Apakah tersedia per Marketing Officer atau hanya per cabang, dan apakah ada pembagian bulanan resmi.')]),
  nomor([t('Periode data tahun lalu. ', { bold: true }), t('Berkas Longterm 2025 dianggap 12 bulan, berdasarkan median rasio produksi 116 cabang yang tepat 58,3 persen atau 7 dibagi 12.')]),
  nomor([t('Selisih basis ukur sekitar 21,5 persen ', { bold: true }), t('antara ekspor Longterm dan berkas produksi: apakah karena GPW dan NWP, renewal, atau sebab lain.')]),
  nomor([t('Lima unit yang belum cocok ', { bold: true }), t('dengan Organization Master Data Area: DUMAI, MP GOWA, MALANG AGENCY, PALEMBANG AGENCY, dan GROUP LEADER 183.')]),
  nomor([t('Sumber bisnis di Matrix Distribution. ', { bold: true }), t('Apakah memakai tujuh kategori yang sama dengan eReport.')]),
  nomor([t('Status Pending. ', { bold: true }), t('Apakah masih dianggap prospek hidup atau sudah tutup buku.')]),
)

// 9, keamanan
isi.push(
  h1('9. Keamanan dan kepatuhan'),
  bullet('Dokumen dan dashboard memuat nama Marketing Officer beserta angka kinerjanya. Data ini termasuk data pribadi menurut UU Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi dan diperlakukan sebagai rahasia internal.'),
  bullet('Nama nasabah dan prospek pada gambar di dokumen ini adalah nama contoh, bukan data nasabah.'),
  bullet('Tidak ada kredensial, token, atau alamat layanan internal yang ditanam di dalam kode.'),
  bullet('Pengambilan data Matrix Distribution perlu melalui jalur resmi yang terautentikasi. Catatan keamanan terkait jalur akses yang tersedia saat ini disampaikan secara terpisah.'),
  bullet('Pembatasan data per peran wajib ditegakkan di sisi server berdasarkan identitas dari Uniport, bukan hanya disembunyikan di tampilan.'),
)

const doc = new Document({
  creator: 'Fernando Widjaja',
  title: 'Sumber Data Uniport Executive Dashboard',
  styles: {
    default: { document: { run: { font: 'Arial', size: 21, color: '1C2430' } } },
    paragraphStyles: [
      {
        id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 30, bold: true, color: NAVY },
        paragraph: { spacing: { before: 360, after: 160 }, outlineLevel: 0,
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: EMAS, space: 6 } } },
      },
      {
        id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 24, bold: true, color: NAVY },
        paragraph: { spacing: { before: 240, after: 100 }, outlineLevel: 1 },
      },
    ],
  },
  numbering: {
    config: [
      { reference: 'titik', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 540, hanging: 300 } } } }] },
      { reference: 'angka', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 540, hanging: 360 } } } }] },
    ],
  },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } },
    headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT,
      children: [t('Sumber Data Uniport Executive Dashboard · Rahasia internal', { size: 16, color: ABU })] })] }) },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER,
      children: [t('Halaman ', { size: 16, color: ABU }), new TextRun({ children: [PageNumber.CURRENT], size: 16, color: ABU })] })] }) },
    children: isi,
  }],
})

const tujuan = process.argv[2] || KELUAR
Packer.toBuffer(doc).then((buf) => {
  fs.mkdirSync(path.dirname(tujuan), { recursive: true })
  fs.writeFileSync(tujuan, buf)
  console.log('✓ ' + path.relative(ROOT, tujuan) + ', ' + (buf.length / 1024 / 1024).toFixed(1) + ' MB')
})
