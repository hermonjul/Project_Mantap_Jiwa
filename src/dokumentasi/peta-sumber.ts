/* ══════════════════════════════════════════════════════════════════
   peta-sumber.js, peta sistem asal data untuk tiap bagian layar.

   Satu sumber kebenaran untuk dua keperluan:
   1. src/anotasi.js menggambar kotak bernomor di atas dashboard.
   2. tools/buat-dokumen-sumber-data.js menyusun tabel legenda di dokumen
      untuk tim Teknologi Informasi.
   Karena keduanya membaca berkas yang sama, nomor kotak di gambar dan nomor
   di tabel legenda tidak mungkin berbeda.

   Sistem asal sudah dikonfirmasi pengguna pada 17 September 2026.

   Cara menunjuk elemen (field "di"):
     css        selector pada dokumen
     induk      naik satu tingkat dari hasil css
     band       urutan seksi di #dash-root, dimulai dari 0
     kepala     kepala seksi (judul dan catatan)
     grid       urutan .grid yang langsung berada di dalam seksi
     stat       awal label kartu angka, dengan bagian: val, foot, spark
     kartu      awal judul kartu, dengan bagian: tabel, ket, atau kolom
     kolom      daftar judul kolom yang berdampingan pada tabel kartu
     kanal      urutan baris batang kanal pada panel komposisi

   Field "lebar" opsional mengganti lebar jendela tangkap untuk satu peta, dan
   "satuKolom" menyusun kartu berdampingan menjadi satu kolom. Keduanya dipakai
   bila tabel terpotong atau grafik membesar berlebihan pada layar lebar.

   Field "label" opsional mengatur letak label kotak: kiri atas (bawaan),
   kanan, bawah, dalam-kanan, atau tengah. Dipakai untuk kotak kecil di dalam kartu supaya
   labelnya tidak menutupi angka.
   ══════════════════════════════════════════════════════════════════ */

var SISTEM_SUMBER = {
  ereport: { label: 'eReport', sub: '', warna: '#1D4A86',
    data: 'NWP, profit, dan beban; NWP per tanggal; NWP per sumber bisnis; produksi per Marketing Officer' },
  etarget: { label: 'eTarget', sub: 'diambil lewat HCC atau ASMPro', warna: '#6B3FA0',
    data: 'Target NWP setahun dan bulanan' },
  matrix: { label: 'Matrix Distribution', sub: 'Pega ASMPro', warna: '#9A7A22',
    data: 'Prospek, status prospek, jatuh tempo tindak lanjut, estimasi premi, dan aktivitas effort' },
  hcq: { label: 'HCQ', sub: 'Organization Master Data Area', warna: '#157F3C',
    data: 'Cabang dan Kantor Wilayah induk; Marketing Officer dan Pimpinan Cabang yang aktif' },
  uniport: { label: 'Uniport', sub: '', warna: '#C8102E',
    data: 'Login dan peran pengguna' },
  olahan: { label: 'Olahan dashboard', sub: '', warna: '#5B6675',
    data: 'Hasil hitung dari sistem lain: capaian, proyeksi, kecukupan pipeline, tindakan disarankan, AI Insight' },
}

var PETA_SUMBER = [
  {
    id: '01-ringkasan-wilayah', peran: 'pinwil1', band: [0], topbar: true,
    judul: 'Ringkasan, tampilan Pemimpin Wilayah',
    kotak: [
      { di: { css: '#role-select', induk: true }, sistem: 'uniport', bagian: 'Pilihan "Lihat sebagai"', data: 'Identitas login dan peran pengguna, yang menentukan lingkup data' },
      { di: { css: '#dash-scope .crumbs', induk: true }, sistem: 'hcq', bagian: 'Kantor Wilayah yang sedang dilihat', data: 'Kantor Wilayah dan cabang di bawahnya' },
      { di: { css: '#dash-scope .chips' }, sistem: 'ereport', bagian: 'Pilihan channel', data: 'Tujuh kategori sumber bisnis' },
      { di: { band: 0, kepala: true }, sistem: 'hcq', bagian: 'Jumlah cabang dan Marketing Officer', data: 'Cabang dalam Kantor Wilayah dan Marketing Officer yang aktif' },
      { di: { band: 0, stat: 'Produksi' }, sistem: 'ereport', bagian: 'Produksi bulan berjalan dan grafik harian', data: 'NWP per tanggal, dijumlah per bulan' },
      { di: { band: 0, stat: 'Produksi', bagian: 'foot' }, label: 'dalam-kanan', sistem: 'etarget', bagian: 'Target bulan dan persen capaian', data: 'Target NWP bulanan. Persen capaian dihitung dashboard dari NWP eReport' },
      { di: { band: 0, stat: 'Capaian' }, sistem: 'olahan', bagian: 'Persen capaian tahun berjalan', data: 'NWP dari eReport dibagi target dari eTarget' },
      { di: { band: 0, stat: 'Capaian', bagian: 'foot' }, label: 'bawah', sistem: 'etarget', bagian: 'Target setahun', data: 'Target NWP setahun. Realisasi di kalimat yang sama berasal dari eReport' },
      { di: { band: 0, stat: 'Perlu tindakan' }, sistem: 'matrix', bagian: 'Perlu tindakan hari ini', data: 'Prospek hidup, tanggal tindak lanjut berikutnya, dan estimasi premi' },
      { di: { band: 0, kanal: 0 }, label: 'tengah', sistem: 'matrix', bagian: 'Batang pipeline prospek per channel', data: 'Jumlah dan estimasi premi prospek per sumber bisnis' },
      { di: { band: 0, kanal: 1 }, label: 'tengah', sistem: 'ereport', bagian: 'Batang produksi per channel', data: 'NWP per sumber bisnis' },
    ],
  },
  {
    id: '02-perlu-tindakan', peran: 'pinwil1', band: [1],
    judul: 'Perlu tindakan, tampilan Pemimpin Wilayah',
    kotak: [
      { di: { band: 1, grid: 0 }, sistem: 'matrix', bagian: 'Empat kelompok jatuh tempo', data: 'Tanggal tindak lanjut berikutnya, status prospek, dan estimasi premi' },
      { di: { band: 1, kartu: 'Prioritas', kolom: ['Nasabah atau prospek', 'Sub-channel', 'Status', 'Effort terakhir'] }, sistem: 'matrix', bagian: 'Prospek, channel, status, dan effort terakhir', data: 'Nama prospek, sumber bisnis, status prospek, status effort terakhir' },
      { di: { band: 1, kartu: 'Prioritas', kolom: ['Marketing Officer'] }, sistem: 'hcq', bagian: 'Marketing Officer penanggung jawab', data: 'Nama Marketing Officer aktif, dicocokkan ke prospek lewat kode MO' },
      { di: { band: 1, kartu: 'Prioritas', kolom: ['Potensi premi', 'Jatuh tempo'] }, sistem: 'matrix', bagian: 'Potensi premi dan jatuh tempo', data: 'Estimasi premi dan tanggal tindak lanjut berikutnya' },
      { di: { band: 1, kartu: 'Prioritas', kolom: ['Tindakan disarankan'] }, sistem: 'olahan', bagian: 'Tindakan disarankan', data: 'Aturan tetap menurut status, effort terakhir, dan keterlambatan' },
      { di: { band: 1, kartu: 'Prioritas', bagian: 'ket' }, sistem: 'matrix', bagian: 'Arti status', data: 'Keterangan status prospek, dikutip dari Matrix Distribution' },
      { di: { band: 1, kartu: 'Distribusi beban' }, sistem: 'matrix', bagian: 'Sebaran tindak lanjut per cabang', data: 'Prospek hidup per cabang, dikelompokkan menurut jatuh tempo' },
    ],
  },
  {
    id: '03-proyeksi', peran: 'pinwil1', band: [2],
    judul: 'Proyeksi pencapaian target, tampilan Pemimpin Wilayah',
    kotak: [
      { di: { band: 2, stat: 'Realisasi' }, sistem: 'ereport', bagian: 'Realisasi tahun berjalan', data: 'NWP Januari sampai bulan berjalan' },
      { di: { band: 2, stat: 'Proyeksi' }, sistem: 'olahan', bagian: 'Proyeksi akhir tahun', data: 'Realisasi eReport ditambah rata-rata bulanan dikali sisa bulan' },
      { di: { band: 2, stat: 'Kecukupan' }, sistem: 'matrix', bagian: 'Kecukupan pipeline', data: 'Estimasi premi prospek dibobot per status, dibanding kebutuhan sisa tahun' },
      { di: { band: 2, kartu: 'Posisi terhadap target' }, sistem: 'etarget', bagian: 'Posisi terhadap target tahunan', data: 'Target NWP setahun. Realisasi dari eReport' },
      { di: { band: 2, kartu: 'Sumbangan pipeline', bagian: 'tabel' }, sistem: 'matrix', bagian: 'Sumbangan pipeline per status', data: 'Jumlah dan estimasi premi prospek per status prospek' },
    ],
  },
  {
    id: '04-orang-kunci', peran: 'pinwil1', band: [3],
    judul: 'Ketergantungan orang kunci, tampilan Pemimpin Wilayah',
    kotak: [
      { di: { band: 3, grid: 0 }, sistem: 'olahan', bagian: 'Ringkasan cabang bertumpu satu orang', data: 'Dihitung dari produksi per Marketing Officer di eReport' },
      { di: { band: 3, kartu: 'Cabang menurut', kolom: ['Cabang', 'Jumlah MO'] }, sistem: 'hcq', bagian: 'Cabang dan jumlah Marketing Officer', data: 'Cabang, Kantor Wilayah induk, dan Marketing Officer aktif' },
      { di: { band: 3, kartu: 'Cabang menurut', kolom: ['Produksi 2026'] }, sistem: 'ereport', bagian: 'Produksi cabang', data: 'NWP cabang tahun berjalan' },
      { di: { band: 3, kartu: 'Cabang menurut', kolom: ['Marketing Officer terbesar'] }, sistem: 'hcq', bagian: 'Marketing Officer terbesar', data: 'Nama Marketing Officer aktif. Urutannya dari produksi eReport' },
      { di: { band: 3, kartu: 'Cabang menurut', kolom: ['Porsi', 'Penilaian'] }, sistem: 'olahan', bagian: 'Porsi dan penilaian', data: 'Produksi Marketing Officer terbesar dibagi produksi cabang' },
    ],
  },
  {
    id: '05-perlu-ditanyakan', peran: 'pinwil1', band: [4],
    judul: 'Perlu ditanyakan, tampilan Pemimpin Wilayah',
    kotak: [
      { di: { band: 4, kartu: 'Berproduksi', kolom: ['Marketing Officer', 'Cabang'] }, sistem: 'hcq', bagian: 'Marketing Officer dan cabangnya', data: 'Marketing Officer aktif dan penempatan cabangnya' },
      { di: { band: 4, kartu: 'Berproduksi', kolom: ['Produksi 2025', 'Produksi 2026'] }, sistem: 'ereport', bagian: 'Produksi dua tahun', data: 'Produksi per Marketing Officer tahun lalu dan tahun berjalan' },
      { di: { band: 4, kartu: 'Berproduksi', kolom: ['Selisih'] }, sistem: 'olahan', bagian: 'Selisih', data: 'Produksi 2026 dikurangi produksi 2025' },
      { di: { band: 4, kartu: 'Berproduksi', kolom: ['Kantor Wilayah'] }, sistem: 'hcq', bagian: 'Kantor Wilayah', data: 'Kantor Wilayah induk cabang' },
    ],
  },
  {
    id: '06-kinerja-wilayah', peran: 'pinwil1', band: [5],
    judul: 'Kinerja, tampilan Pemimpin Wilayah',
    kotak: [
      { di: { band: 5, kartu: 'Perbandingan terhadap tahun lalu' }, sistem: 'ereport', bagian: 'Perbandingan terhadap tahun lalu', data: 'NWP per sumber bisnis, tahun lalu dan tahun berjalan' },
      { di: { band: 5, kartu: 'cabang pada', kolom: ['Cabang'] }, sistem: 'hcq', bagian: 'Daftar cabang', data: 'Cabang dalam Kantor Wilayah' },
      { di: { band: 5, kartu: 'cabang pada', kolom: ['Kelas', 'Produksi bulan', 'Porsi'] }, sistem: 'ereport', bagian: 'Kelas, produksi, dan porsi', data: 'Kelas cabang dan NWP bulan berjalan' },
      { di: { band: 5, kartu: 'cabang pada', kolom: ['Capaian bulan', 'Capaian tahun'] }, sistem: 'etarget', bagian: 'Capaian bulan dan tahun', data: 'Target NWP. Persen dihitung dashboard dari NWP eReport' },
      { di: { band: 5, kartu: 'cabang pada', kolom: ['Direct', 'Captive', 'vs 2025'] }, sistem: 'ereport', bagian: 'Produksi per channel dan pertumbuhan', data: 'NWP per sumber bisnis, tahun lalu dan tahun berjalan' },
      { di: { band: 5, kartu: 'cabang pada', kolom: ['Tanpa aktivitas'] }, sistem: 'matrix', bagian: 'Hari tanpa aktivitas', data: 'Tanggal aktivitas effort per cabang' },
      { di: { band: 5, kartu: 'Marketing Officer', kolom: ['Marketing Officer', 'Cabang'] }, sistem: 'hcq', bagian: 'Marketing Officer dan cabangnya', data: 'Marketing Officer aktif dan penempatan cabangnya' },
      { di: { band: 5, kartu: 'Marketing Officer', kolom: ['Produksi bulan', 'vs 2025'] }, sistem: 'ereport', bagian: 'Produksi per Marketing Officer', data: 'NWP per Marketing Officer, tahun lalu dan tahun berjalan' },
      { di: { band: 5, kartu: 'Marketing Officer', kolom: ['Aktivitas tujuh hari', 'Prospek aktif', 'Lewat tempo'] }, sistem: 'matrix', bagian: 'Aktivitas dan prospek per Marketing Officer', data: 'Aktivitas effort harian, prospek hidup, dan jatuh tempo' },
    ],
  },
  {
    id: '07-ai-insight', peran: 'pinwil1', band: [6],
    judul: 'AI Insight, tampilan Pemimpin Wilayah',
    kotak: [
      { di: { band: 6, kartu: 'Temuan' }, sistem: 'olahan', bagian: 'Temuan otomatis', data: 'Aturan tetap atas data eReport, eTarget, Matrix Distribution, dan HCQ' },
    ],
  },
  {
    id: '08-ringkasan-cabang', peran: 'pincab', band: [0], topbar: true,
    judul: 'Ringkasan, tampilan Pimpinan Cabang',
    kotak: [
      { di: { css: '#role-select', induk: true }, sistem: 'uniport', bagian: 'Pilihan "Lihat sebagai"', data: 'Identitas login Pimpinan Cabang dan cabang yang dipimpinnya' },
      { di: { css: '#dash-scope .crumbs', induk: true }, sistem: 'hcq', bagian: 'Cabang yang sedang dilihat', data: 'Cabang dan Kantor Wilayah induknya' },
      { di: { band: 0, kepala: true }, sistem: 'hcq', bagian: 'Keterangan cabang', data: 'Nama cabang dan Kantor Wilayah induk. Kelas dan rasio beban dari eReport' },
      { di: { band: 0, stat: 'Produksi' }, sistem: 'ereport', bagian: 'Produksi bulan berjalan dan grafik harian', data: 'NWP per tanggal, dijumlah per bulan' },
      { di: { band: 0, stat: 'Produksi', bagian: 'foot' }, label: 'dalam-kanan', sistem: 'etarget', bagian: 'Target bulan cabang', data: 'Target NWP bulanan cabang' },
      { di: { band: 0, stat: 'Capaian' }, sistem: 'olahan', bagian: 'Capaian tahun berjalan', data: 'NWP dari eReport dibagi target dari eTarget' },
      { di: { band: 0, stat: 'Perlu tindakan' }, sistem: 'matrix', bagian: 'Perlu tindakan hari ini', data: 'Prospek hidup cabang dan tanggal tindak lanjut berikutnya' },
      { di: { band: 0, kanal: 0 }, label: 'tengah', sistem: 'matrix', bagian: 'Batang pipeline prospek per channel', data: 'Jumlah dan estimasi premi prospek per sumber bisnis' },
      { di: { band: 0, kanal: 1 }, label: 'tengah', sistem: 'ereport', bagian: 'Batang produksi per channel', data: 'NWP cabang per sumber bisnis' },
    ],
  },
  {
    id: '09-kinerja-cabang', peran: 'pincab', band: [5],
    judul: 'Kinerja, tampilan Pimpinan Cabang',
    kotak: [
      { di: { band: 5, kartu: 'Perbandingan terhadap tahun lalu' }, sistem: 'ereport', bagian: 'Perbandingan terhadap tahun lalu', data: 'NWP cabang per sumber bisnis, tahun lalu dan tahun berjalan' },
      { di: { band: 5, kartu: 'Marketing Officer', kolom: ['Marketing Officer'] }, sistem: 'hcq', bagian: 'Marketing Officer cabang', data: 'Marketing Officer aktif di cabang' },
      { di: { band: 5, kartu: 'Marketing Officer', kolom: ['Produksi bulan'] }, sistem: 'ereport', bagian: 'Produksi bulan', data: 'NWP per Marketing Officer' },
      { di: { band: 5, kartu: 'Marketing Officer', kolom: ['Prospek aktif', 'Lewat tempo', 'Hari ini', 'Aktivitas tujuh hari'] }, sistem: 'matrix', bagian: 'Prospek dan aktivitas', data: 'Prospek hidup, jatuh tempo, dan aktivitas effort harian' },
      { di: { band: 5, kartu: 'Marketing Officer', kolom: ['vs 2025'] }, sistem: 'ereport', bagian: 'Pertumbuhan terhadap tahun lalu', data: 'Produksi per Marketing Officer dua tahun' },
      { di: { band: 5, kartu: 'Marketing Officer', kolom: ['Konversi'] }, sistem: 'matrix', bagian: 'Konversi', data: 'Prospek berstatus Terbit Polis dibanding seluruh prospek' },
      { di: { band: 5, kartu: 'Distribusi lini usaha', kolom: ['Lini usaha (COB)', 'Prospek', 'Progres terbit polis', 'Terbit', 'Potensi premi', 'Premi terbit'] }, sistem: 'matrix', bagian: 'Prospek per lini usaha', data: 'Lini usaha, status, dan estimasi premi prospek' },
      { di: { band: 5, kartu: 'Distribusi lini usaha', kolom: ['Peluang cross selling'] }, sistem: 'olahan', bagian: 'Peluang cross selling', data: 'Lini usaha yang belum dimiliki nasabah, dihitung dashboard' },
    ],
  },
  {
    id: '10-daftar-kerja-mo', peran: 'mo', band: [0, 1], topbar: true,
    judul: 'Ringkasan dan daftar kerja, tampilan Marketing Officer',
    kotak: [
      { di: { css: '#role-select', induk: true }, sistem: 'uniport', bagian: 'Pilihan "Lihat sebagai"', data: 'Identitas login Marketing Officer' },
      { di: { band: 0, kepala: true }, sistem: 'hcq', bagian: 'Kode MO, cabang, dan Kantor Wilayah', data: 'Data Marketing Officer aktif dan penempatannya' },
      { di: { band: 0, stat: 'Perlu tindakan' }, sistem: 'matrix', bagian: 'Perlu tindakan hari ini', data: 'Prospek hidup milik sendiri dan jatuh temponya' },
      { di: { band: 0, stat: 'Produksi' }, sistem: 'ereport', bagian: 'Produksi bulan berjalan', data: 'NWP milik sendiri' },
      { di: { band: 0, stat: 'Produksi', bagian: 'foot' }, label: 'dalam-kanan', sistem: 'etarget', bagian: 'Target pribadi', data: 'Target NWP Marketing Officer' },
      { di: { band: 0, stat: 'Rata-rata' }, sistem: 'ereport', bagian: 'Rata-rata terhadap tahun lalu', data: 'Produksi pribadi dua tahun. Jumlah aktivitas dan konversi dari Matrix Distribution' },
      { di: { band: 1, grid: 0 }, sistem: 'matrix', bagian: 'Empat kelompok jatuh tempo', data: 'Tanggal tindak lanjut berikutnya prospek milik sendiri' },
      { di: { band: 1, kartu: 'Semua prospek', kolom: ['Nasabah atau prospek', 'Sub-channel', 'Status', 'Effort terakhir', 'Potensi premi', 'Jatuh tempo'] }, sistem: 'matrix', bagian: 'Daftar prospek', data: 'Prospek, sumber bisnis, status, effort terakhir, estimasi premi, jatuh tempo' },
      { di: { band: 1, kartu: 'Semua prospek', kolom: ['Tindakan disarankan'] }, sistem: 'olahan', bagian: 'Tindakan disarankan', data: 'Aturan tetap menurut status dan keterlambatan' },
    ],
  },
  {
    id: '11-ritme-kerja-mo', peran: 'mo', band: [2], lebar: 1280, satuKolom: true,
    judul: 'Ritme kerja, tampilan Marketing Officer',
    kotak: [
      { di: { band: 2, kartu: 'Aktivitas 30 hari' }, sistem: 'matrix', bagian: 'Aktivitas 30 hari terakhir', data: 'Aktivitas effort harian: kunjungan, telepon, penawaran, follow up' },
      { di: { band: 2, kartu: 'Komposisi aktivitas' }, sistem: 'matrix', bagian: 'Komposisi aktivitas', data: 'Jumlah aktivitas effort per jenis pada bulan berjalan' },
      { di: { band: 2, kartu: 'Channel portofolio', kolom: ['Sub-channel', 'Kelompok', 'Prospek', 'Porsi', 'Potensi premi', 'Perlu tindakan'] }, sistem: 'matrix', bagian: 'Pipeline per channel', data: 'Prospek dan estimasi premi per sumber bisnis' },
      { di: { band: 2, kartu: 'Channel portofolio', kolom: ['Produksi'] }, sistem: 'ereport', bagian: 'Produksi per channel', data: 'NWP pribadi per sumber bisnis' },
    ],
  },
]

declare const module: { exports: unknown } | undefined
if (typeof module !== 'undefined') module.exports = { SISTEM_SUMBER, PETA_SUMBER }
