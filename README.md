# Uniport Executive Dashboard, prototipe

Prototipe dashboard gabungan yang menyatukan data produksi dari **eReport** dengan data
effort pemasaran dari **Matrix Distribution (Pega ASMPro)**, ditampilkan di dalam **Uniport**,
untuk keperluan peragaan kepada Direksi.

> **Rahasia internal.** Berkas ini memuat angka produksi cabang yang sebenarnya
> beserta **nama 744 Marketing Officer dan angka kinerja masing-masing**. Data
> kinerja perorangan tunduk pada UU Nomor 27 Tahun 2022 tentang Pelindungan Data
> Pribadi. Tidak untuk diedarkan ke luar perusahaan, dan sebaiknya tidak
> ditayangkan pada layar yang dapat dilihat pihak di luar lingkup jabatan.

---

## Cara membuka

Buka `dist/uniport-executive-dashboard.html` dengan peramban apa pun. Hasil build berupa
satu berkas tanpa koneksi internet atau server. Pengembangan sumber memakai TypeScript.

Alur peragaan:

1. Executive Dashboard langsung terbuka.
2. Gunakan **Lihat sebagai** di kanan atas untuk berpindah peran, dan pilih baris pada tabel
   untuk menelusuri dari Kantor Wilayah sampai Marketing Officer.
3. Deretan chip **Kanal** di bawah breadcrumb menyaring seluruh tampilan menurut Direct,
   Captive, atau satu sub-kanal tertentu.
4. Panel **Rincian dan latar belakang** di bagian bawah memuat peta integrasi, kuadran
   produksi terhadap effort, dan ikhtisar kumulatif.
5. Tombol **Gelap** atau **Terang** menyesuaikan tampilan dengan kondisi layar ruangan.

## Susunan tampilan

Setiap peran memakai susunan yang sama, yaitu lima seksi dalam satu halaman gulir.

| Seksi | Isi |
|---|---|
| Ringkasan | Tiga indikator utama, salah satunya jumlah yang perlu ditindaklanjuti hari ini, ditambah komposisi Direct dan Captive |
| Perlu tindakan | Empat kelompok jatuh tempo, tabel prioritas, dan sebaran beban ke tingkat di bawahnya |
| Proyeksi pencapaian target | Perkiraan akhir tahun dari laju, kecukupan pipeline, dan sumbangan tiap tahap |
| Kinerja | Perbandingan terhadap tahun lalu, peringkat unit atau cabang, komposisi channel, dan matrix Marketing Officer |
| AI Insight | Tujuh temuan teratas, dengan satu tempat masing-masing untuk temuan proyeksi, perbandingan tahun, dan channel |

Marketing Officer mendapat susunan yang lebih ringkas, karena daftar kerja menjadi isi utama
halamannya.

## Pertimbangan keterbacaan

Pengguna utama dashboard ini jajaran pimpinan yang rata-rata sudah berumur, sehingga
keterbacaan diperlakukan sebagai syarat, bukan penyempurnaan.

| Hal | Penyesuaian |
|---|---|
| Ukuran huruf terkecil | 12,5 piksel, naik dari 10,5. Teks isi 17 piksel, tabel 15 piksel |
| Angka indikator | 32 piksel, cukup terbaca dari jarak ruang rapat |
| Target klik | Minimal 38 piksel untuk semua tombol, filter, dan panel yang bisa dibuka |
| Kontras | Terendah 5,08 pada tema terang dan 5,40 pada tema gelap, di atas ambang WCAG AA 4,5 |
| Jarak antar bagian | Padding kartu dan jarak antar seksi dilonggarkan |
| Tebal huruf label | Dinaikkan ke 700 supaya huruf kapital kecil tetap tegas |

### Warna tidak dipakai sendirian sebagai penanda

Panel **Aktivitas 30 hari terakhir** dulunya kalender kotak dengan empat gradasi biru.
Membedakan gradasi warna adalah hal yang paling cepat menurun seiring usia, dan kotaknya
juga kecil. Sekarang diganti grafik batang:

- Tinggi batang langsung terbaca sebagai jumlah, tanpa menerjemahkan warna
- Hari kerja tanpa aktivitas ditandai garis merah di dasar, tetap terlihat meski batangnya nol
- Garis rata-rata per hari kerja sebagai pembanding
- Lima angka ringkasan di bawahnya: hari kerja, ada aktivitas, hari kosong, kosong beruntun, total

Di tempat lain, warna selalu didampingi teks atau angka. Badge capaian menampilkan
persentasenya, bukan hanya warna hijau atau merah. Kuadran produksi terhadap effort memberi
label tertulis pada tiap kuadran.

---

## Cara membangun ulang

```bash
npm install
npm run typecheck
npm run build
```

`src/` berisi sumber TypeScript, HTML, dan CSS. Build mengompilasi TypeScript menjadi
JavaScript di dalam HTML mandiri pada `dist/`. TypeScript hanya diperlukan saat membangun;
pengguna akhir cukup membuka HTML. `npm run typecheck` memeriksa seluruh berkas `.ts`
di `src/` sebelum hasilnya dibangun.

Untuk membuka lewat alamat lokal, jalankan `npm run dev` lalu kunjungi
`http://localhost:3000/`. Hentikan server dengan `Ctrl+C` di terminal.

Bila berkas produksi diperbarui:

```bash
python tools/extract-real.py "<path MasterDataArea.xlsx>" "<path Produksi.xlsx>"
```

Bila export Production Longterm all kanwil diperbarui:

```bash
python tools/extract-mo.py "<path 2025.xlsx>" "<path 2026.xlsx>"
```

Keduanya menulis ulang berkas di `src/`. Jangan menyunting `src/data/org.ts`, `src/data/kanal.ts`,
maupun `src/data/mo.ts` secara manual.

---

## Mana yang nyata dan mana yang simulasi

Pembedaan ini penting dibawa saat peragaan, karena keduanya bercampur dalam satu layar.

### Bersumber dari data nyata

Diambil dari `MasterDataArea (12).xlsx`, `Produksi up to Juli 2026.xlsx`, serta
`Production Longterm all kanwil 2025.xlsx` dan `2026.xlsx`:

| Data | Keterangan |
|---|---|
| 118 cabang | Nama, Kantor Wilayah induk, kelas cabang, provinsi, kota |
| NWP 2025 | Rp 583,0 miliar, satu tahun penuh |
| NWP 2026 | Rp 298,8 miliar, Januari sampai Juli |
| Target NWP 2026 | Rp 740,0 miliar, dari kolom SYARAT 1.1 |
| Profit 2025 dan 2026 | Rp 260,9 miliar dan Rp 135,6 miliar |
| Beban | Diturunkan dari selisih NWP dan profit, mencakup klaim beserta biaya |
| Komposisi kanal | Persentase tujuh kanal per cabang |
| 744 Marketing Officer | Nama, cabang, produksi 2025 dan 2026, serta komposisi kanal masing-masing |
| Perbandingan tahun | Produksi 2025 dan 2026 per cabang, per kanal, dan per Marketing Officer |

Seluruh agregat pada tingkat cabang, Kantor Wilayah, dan nasional telah **direkonsiliasi dan
sama persis** dengan berkas sumber, dengan selisih 0,0000 persen. Pemeriksaan ini dapat
diulang melalui `tools/probe.js`.

### Bersifat simulasi

| Data | Alasan |
|---|---|
| Sebaran harian dan mingguan | Berkas sumber hanya memuat total tujuh bulan, tanpa rincian tanggal |
| Seluruh angka effort dan prospek | Belum ada ekspor dari Matrix Distribution |
| Komposisi kanal pada prospek | Disusun mengikuti komposisi produksi tiap cabang, karena data prospek dari Matrix Distribution belum ada |
| Aktivitas harian tiap Marketing Officer | Belum ada ekspor dari Matrix Distribution |
| Nama nasabah dan prospek | Data nasabah tidak digunakan, sesuai Aturan Emas nomor 1 |
| Jumlah polis | Tidak tersedia pada berkas sumber |

Sebaran harian dihasilkan generator ber-seed sehingga **identik setiap kali berkas dibuka**,
lalu dikalibrasi agar total setiap cabang tepat sama dengan berkas sumber. Angka tidak akan
berubah di tengah peragaan.

---

## Ketergantungan orang kunci dan Marketing Officer yang berhenti

Dua seksi ini bersumber dari **data nyata**, yaitu produksi 2025 dan 2026 tiap Marketing
Officer pada berkas Production Longterm. Bukan simulasi.

### Ketergantungan orang kunci

Menjawab pertanyaan berapa banyak produksi satu cabang yang sebenarnya duduk di satu orang.
Ambangnya `AMBANG_UNIT = Rp 2 miliar`; cabang di bawah itu tidak dinilai supaya cabang kecil
beranggota dua orang tidak selalu muncul berisiko dan menenggelamkan cabang besar.

| Penilaian | Porsi Marketing Officer terbesar |
|---|---|
| Bertumpu satu orang | 60 persen ke atas |
| Perlu diperhatikan | 40 sampai 60 persen |
| Menyebar | di bawah 40 persen |

Hasil pada data sekarang: **24 dari 46 cabang** bertumpu pada satu orang, dengan nilai
**Rp 67,7 miliar atau 22,8 persen produksi nasional** tujuh bulan. Yang paling perlu
diperhatikan BSD, karena nilainya terbesar (Rp 14,7 miliar) sementara 85 persennya dihasilkan
satu orang padahal cabang itu punya 10 Marketing Officer.

Porsi dihitung dari produksi 2026 pada basis ukur export, sedangkan nilai rupiah yang
ditampilkan memakai NWP cabang yang sudah terekonsiliasi. Yang diambil dari export hanya
porsinya, sehingga perbedaan basis ukur tidak merusak angka rupiah.

### Marketing Officer yang berhenti berproduksi

226 Marketing Officer ber-NWP nol atau minus pada 2026. Angka itu menyesatkan bila
ditampilkan apa adanya, karena isinya tiga kelompok yang sangat berbeda:

| Kelompok | Jumlah | Ditampilkan? |
|---|---:|---|
| Tahun lalu juga sudah di bawah Rp 100 juta | 178 | Hanya jumlahnya |
| Baru muncul pada 2026 | 5 | Hanya jumlahnya |
| **Tahun lalu di atas Rp 100 juta, kini nol atau minus** | **43** | **Ya, sebagai daftar** |

Kelompok ketiga membawa **Rp 31,2 miliar produksi 2025**. Hanya kelompok inilah yang layak
jadi bahan percakapan.

Tiga pengaman yang dipasang karena daftar ini menyebut nama orang:

1. Judulnya **Perlu ditanyakan**, bukan penilaian kinerja.
2. Kalimat penegas di atas tabel: produksi bisa jatuh karena pindah peran, cuti panjang,
   portofolio dialihkan, atau pembatalan besar yang bukan berasal dari yang bersangkutan.
3. **Tidak muncul pada tampilan Marketing Officer.** Tidak ada gunanya seorang Marketing
   Officer melihat daftar rekannya yang jatuh.

Kolom kanal utama sengaja **tidak** dipasang. Export tidak memuat rincian kanal per
Marketing Officer untuk 2025, dan rincian 2026 pada baris bernilai minus tidak bermakna.
Kolomnya diganti Kantor Wilayah, yang lebih berguna bagi Pemimpin Wilayah.

Nilai pada kedua kolom tahun memakai basis ukur berkas Production Longterm, bukan NWP.
Keduanya sah dibandingkan satu sama lain, tapi jangan disandingkan dengan angka NWP di
seksi lain. Peringatan ini ikut ditulis di layar.

---

## Taksonomi status prospek

Sejak 10 September 2026 prototipe memakai istilah yang sama persis dengan Matrix
Distribution, bukan istilah karangan sendiri. Sumbernya pembacaan langsung dashboard
Matrix Distribution Kanwil 1 pada tanggal tersebut.

Yang berubah:

| Sebelumnya | Sekarang |
|---|---|
| `KATEGORI` = HOT, WARM, COLD | `STATUS` = Cold, Warm, Hot, Terbit Polis, Pending, Batal |
| `TAHAP` 8 nilai, mencampur dua dimensi | `TAHAP` 5 nilai, khusus status effort terakhir |
| `SUMBER_MIX` karangan | Dikalibrasi ke Tabel Summary Matrix Kanwil 1 |

Ternyata Matrix Distribution memang memakai dua dimensi, tapi isinya berbeda dari yang
diperkirakan. **Status Prospek** menerangkan panas dinginnya prospek, sedangkan **Status
Effort Terakhir** menerangkan langkah terakhir yang dikerjakan. Kekeliruan versi terdahulu
adalah mencampur keduanya dalam satu enum.

Keterangan resmi yang dipasang di layar, dikutip dari Pega:

- **Cold**: perkenalan dan komunikasi awal, atau kirim penawaran
- **Warm**: sudah komunikasi lebih lanjut (follow up) atau presentasi dan penjelasan produk
- **Hot**: sudah mengirimkan proposal penawaran atau TC

### Angka acuan, Kanwil 1 per 10 September 2026

2.351 prospek, 40 cabang (38 sudah prospek, 2 belum), estimasi GPW Rp 272,7 miliar,
estimasi NPW Rp 57,9 miliar.

| Status | Jumlah | Porsi |
|---|---:|---:|
| Cold | 208 | 8,8% |
| Warm | 118 | 5,0% |
| Hot | 58 | 2,5% |
| Terbit Polis | 1.422 | 60,5% |
| Pending | 25 | 1,1% |
| Batal | 520 | 22,1% |

Yang paling perlu dicatat: **pipeline yang masih hidup hanya 384 prospek, 16,3 persen dari
total.** Sisanya sudah tutup buku.

Tipe Matrix: New Prospek Marketing 93,3% · Existing Prospek 2,8% · Lapse Prospek 1,6% ·
Tender 0,3% · Crawling AI 2,0%.

### Batas angka ini

Acuan berasal dari **Kanwil 1 saja**. Kanwil 2 dan 3 belum dibaca, jadi porsi yang dipakai
untuk seluruh simulasi nasional adalah asumsi berskala dari satu Kanwil. Perlu dikoreksi
begitu ketiganya tersedia.

### Nilai prospek dijangkarkan, bukan dikarang

Sebelumnya besaran potensi premi memakai pengali `SKALA_PIPELINE = 10` yang dipilih supaya
kecukupan pipeline jatuh di angka yang enak dilihat. Itu sudah diganti. Sekarang nilai
prospek diskalakan ke **rata-rata Rp 24,6 juta per prospek**, yaitu estimasi NPW Kanwil 1
dibagi jumlah prospeknya.

Akibatnya kecukupan pipeline turun tajam, dari sekitar 55 persen menjadi sekitar 4 persen.
Angka itu jujur, tapi jangan dibaca sebagai bisnisnya akan berhenti. Nilai seluruh prospek
yang tercatat hanya sekitar 11 persen dari produksi tujuh bulan, yang berarti **sebagian
besar produksi tidak lewat prospek yang tercatat di Matrix Distribution**. Jadi angka ini
lebih menunjukkan sejauh mana effort terekam, bukan kecukupan bisnis. Kalimat itu ikut
dipasang di layar supaya tidak salah tafsir di depan Direksi.

---

## Kanal distribusi

### Pengelompokan yang dipakai

| Kelompok | Sub-kanal |
|---|---|
| **Direct** | Direct, Corporate, Agency |
| **Captive** | Banking, Multifinance, Broker, Sinar Mas Group |

### Dua penyimpangan yang disengaja dari taksonomi resmi ASM

Materi training ASM, yaitu `MDP Impact ASM, Materi Produk, Transkrip Ringkas d16`, baris 33
sampai 40, menyebut tujuh kategori **Sumber Bisnis** dengan pembelahan tingkat atas
**Direct dan Indirect** pada baris 69. Pengelompokan di atas berbeda pada dua titik, dan
keduanya merupakan keputusan yang diambil secara sadar:

1. **Kelompok kedua dinamai Captive.** Pada Notulen Rapim, kata captive dipakai untuk
   asuransi milik grup mitra yang justru **mengambil** bisnis ASM, misalnya "70 persen lari
   ke captive BCAI" dan "leasing captive ACC dan TAF". Untuk mengurangi salah tangkap,
   keterangan pembeda ditampilkan permanen pada panel komposisi kanal.
2. **Agency ditempatkan pada kelompok Direct**, sedangkan materi training menempatkannya pada
   Indirect karena melalui perantara.

Bila kemudian disepakati mengikuti taksonomi resmi, perubahannya hanya pada satu blok
`KANAL` di dalam `tools/extract-real.py`.

### Angka pembanding dari Rapim

Berguna untuk memvalidasi export ketika sudah masuk, dari `MoM Rapim Direksi.md`:

- Baris 33, portofolio multifinance turun dari 65 persen pada 2025 menjadi 50 persen pada 2026.
- Baris 104, broker KBRU menyumbang Rp 119 miliar atau 44,16 persen dari GPW.

---

## Export Production Longterm all kanwil

Dua berkas, `Production Longterm all kanwil 2025.xlsx` dan `2026.xlsx`, hasil export pivot
Flexmonster pada eReport dengan kolom melebar:

```
KANWIL | CABANG | SUB_PERWAKILAN | MO | AGENCY | BANKING | BROKER | CORPORATE | DIRECT | MULTIFINANCE | SMG
```

Berbeda dari export terdahulu yang memanjang, yaitu satu kolom `NAMALEADER0` berisi nama kanal.

**Grain yang dipakai adalah `SUB_PERWAKILAN`, bukan `CABANG`.** Kolom CABANG berisi 45 unit
induk, sedangkan SUB_PERWAKILAN berisi 122 unit dan itulah yang setara dengan kolom CABANG pada
berkas produksi. Dari 122 unit, 117 cocok dengan daftar 118 cabang.

Yang diambil dari berkas ini:

| Isi | Keterangan |
|---|---|
| Roster Marketing Officer | 744 orang aktif pada 2026, 906 pada 2025 |
| Porsi tiap Marketing Officer | Dipakai sebagai bobot pembagian NWP cabang |
| Komposisi kanal | Per cabang dan per Marketing Officer |
| Perbandingan tahun | Produksi 2025 dan 2026 pada basis ukur yang sama |

Entri pada kolom MO yang bukan nama perorangan, yaitu `(blank)` dan `RENEWAL ...`, dijumlahkan
ke tingkat cabang dan tidak dimunculkan sebagai orang.

---

## ⚠️ Panjang periode kedua berkas berbeda

**Ini temuan paling penting dan perlu dikonfirmasi ke tim data sebelum peragaan.**

Membandingkan total kedua berkas secara langsung menghasilkan **penurunan 40,1 persen**.
Angka itu hampir pasti keliru. Buktinya:

| Uji | Hasil |
|---|---|
| Rasio total 2026 terhadap 2025 | 59,9 persen |
| Tujuh per dua belas | 58,3 persen |
| **Median rasio antar 116 cabang** | **58,3 persen, tepat sama** |

Kinerja yang sesungguhnya tidak akan menggerombol pada angka yang kebetulan sama dengan rasio
panjang periode. Penguat lain, kolom SYARAT 1.1 pada berkas produksi dihitung sebagai
NWP 2025 dikali 1,15, yaitu rumus target setahun dari realisasi setahun sebelumnya. Rumus itu
hanya masuk akal bila NWP 2025 memang setahun penuh.

**Kesimpulan: berkas 2025 mencakup dua belas bulan, berkas 2026 mencakup tujuh bulan.**

Karena itu seluruh perbandingan pada dashboard memakai **laju per bulan**, bukan total mentah:

| | 2025 | 2026 | Perubahan |
|---|---|---|---|
| Total | Rp 601,9 miliar dalam 12 bulan | Rp 360,7 miliar dalam 7 bulan | -40,1 persen, menyesatkan |
| **Laju per bulan** | **Rp 50,2 miliar** | **Rp 51,5 miliar** | **+2,7 persen** |

### Pemeriksaan silang yang menutup keraguan

Hasil per kanal setelah disetarakan dibandingkan dengan `MoM Rapim Direksi.md`:

| Sub-kanal | Hitungan | Catatan Rapim |
|---|---|---|
| Corporate | +26,9 persen | "Corporate tumbuh GPW 27 persen" |
| Broker | +60,7 persen | "Broker tumbuh GPW 41 persen dan NPW 77 persen" |
| Banking | -12,8 persen | "Banking turun karena BRI tidak bisa ditembus" |
| Multifinance | -8,2 persen | "Multifinance turun karena lesunya pasar leasing" |

Corporate meleset 0,1 poin, dan Broker jatuh persis di antara angka GPW dan NPW. Kecocokan ini
menjadi bukti bahwa normalisasi periodenya sudah benar.

**Bila tim data memastikan berkas 2025 memang hanya Januari sampai Juli**, ubah `BULAN_P25`
menjadi 7 pada `config/dashboard.ts`. Seluruh angka perbandingan akan mengikuti secara otomatis.

---

## Proyeksi pencapaian target

Menjawab pertanyaan apakah target tahun ini akan tercapai. Dua perkiraan disajikan
berdampingan dan **sengaja tidak dijumlahkan**, karena produksi sisa tahun akan datang dari
pipeline yang ada sekarang. Menjumlahkan keduanya berarti menghitung sumber yang sama dua kali.

| Perkiraan | Cara hitung | Menjawab |
|---|---|---|
| Dari laju | Realisasi ditambah laju bulanan dikali sisa bulan | Bagaimana bila keadaan berjalan seperti sekarang |
| Dari pipeline | Realisasi ditambah nilai pipeline yang sudah dibobot | Apakah isi funnel cukup untuk menopang laju tersebut |

Selisih antara keduanya disajikan sebagai **kecukupan pipeline**.

**Bobot konversi tiap status prospek**, asumsi yang perlu disepakati:

| Status | Bobot |
|---|---|
| Cold | 10 persen |
| Warm | 25 persen |
| Hot | 50 persen |
| Pending | 5 persen |
| Terbit Polis | 0, sudah masuk realisasi NWP |
| Batal | 0 |

**Hasil pada data saat ini:**

| | Nilai |
|---|---|
| Realisasi 7 bulan | Rp 298,8 miliar, **nyata** |
| Target setahun | Rp 740,0 miliar, **nyata** |
| Proyeksi dari laju | Rp 512,3 miliar, yaitu 69,2 persen dari target |
| Kekurangan | Rp 227,7 miliar |
| Kecukupan pipeline | 3,9 persen, **simulasi** yang nilainya dijangkarkan ke estimasi NPW Kanwil 1 |

Bagian realisasi, target, dan laju seluruhnya bersumber dari berkas produksi. Bagian
pipeline masih simulasi. Penjelasan mengapa kecukupan pipeline rendah ada di bagian
Taksonomi status prospek.

Rincian sumber tiap angka untuk tim Teknologi Informasi:
`docs/Sumber Data Uniport Executive Dashboard.docx`.

---

## Catatan kepatuhan

Satu baris pada berkas produksi memuat **nama perorangan** pada kolom CABANG, yaitu baris
nomor 52 milik Kantor Wilayah 2. Nama tersebut telah **disamarkan** menjadi
`UNIT KHUSUS KANWIL 2` sesuai UU Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi,
sedangkan angkanya dipertahankan agar total Kantor Wilayah tetap sesuai berkas sumber. Entri
tersebut juga dikecualikan dari contoh yang muncul pada narasi AI Insight.

Mohon dikonfirmasi kepada tim data apakah baris tersebut memang portofolio perorangan atau
kekeliruan pengisian, karena hal ini memengaruhi cara membaca peringkat Kantor Wilayah 2.

---

## Asumsi yang perlu dikoreksi

Angka yang bergantung pada asumsi di bawah ini akan berubah bila asumsinya diperbaiki.

1. **Batas waktu tindak lanjut** yaitu HOT 3 hari, WARM 7 hari, COLD 14 hari. Angka inilah
   yang menentukan berapa prospek dianggap terlambat, sehingga **paling menentukan tampilan
   seksi Perlu tindakan**. Perlu disepakati lebih dulu.
2. **Skor prioritas** menggabungkan kategori, nilai premi dalam skala logaritma, dan lama
   keterlambatan. Formulanya ada di `src/logika/data.ts`.
3. **Bobot indeks effort** yaitu kunjungan 3, penawaran 2,5, follow up 1,5, telepon 1.
   Perlu disepakati sebelum dipakai menilai kinerja perorangan.
4. **Pembagian target ke dalam bulan diasumsikan merata.** Berkas hanya memuat target satu
   tahun, sehingga capaian tahun berjalan dibandingkan terhadap porsi tujuh per dua belas.
5. **Skala pipeline simulasi** ditetapkan agar totalnya sekitar satu kali target tahunan.
   Ini kalibrasi untuk peragaan, bukan hasil pengukuran. Besaran pipeline yang sebenarnya baru
   diketahui setelah data Matrix Distribution tersedia.
6. **Tahapan funnel** yaitu Prospek Baru, Tahap Awal, Follow Up, Negosiasi, Proposal, Terbit
   Polis, Pending, dan Close dibaca dari tampilan Matrix Distribution. Mohon dikonfirmasi
   kelengkapan dan urutannya.
7. **Divisi belum tercakup.** Berkas yang tersedia baru meliputi jaringan cabang di bawah tiga
   Kantor Wilayah. Divisi seperti MBU, Health Insurance, Commercial Lines, Financial
   Insurance, Agency, dan ASNET belum termasuk. Sebagai gambaran skala, seluruh jaringan
   cabang menyumbang Rp 298,8 miliar, sedangkan GWP perusahaan pada dashboard Direksi berada
   pada orde triliun, sehingga porsi terbesar berasal dari divisi. Struktur aplikasi sudah
   siap menampungnya.

---

## Dokumen untuk tim IT

`docs/Sumber Data Uniport Executive Dashboard.docx` menjelaskan asal data tiap bagian layar,
lengkap dengan 11 tangkapan layar berkotak di `docs/peta/`. Dokumen ini sengaja menyebut
**sistem asal** tiap data, bukan status prototipenya.

### Sistem asal, dikonfirmasi 17 September 2026

| Sistem | Data |
|---|---|
| eReport | NWP, profit, beban; NWP per tanggal; NWP per sumber bisnis; produksi per MO |
| eTarget, lewat HCC atau ASMPro | Target NWP setahun dan bulanan |
| Matrix Distribution di Pega ASMPro | Prospek, status, jatuh tempo, estimasi premi, aktivitas effort |
| HCQ, Organization Master Data Area | Cabang dan Kantor Wilayah; MO dan Pincab yang aktif |
| Uniport | Login dan peran |
| Olahan dashboard | Capaian, proyeksi, kecukupan pipeline, tindakan disarankan, AI Insight |

Peta ini disimpan di `src/dokumentasi/peta-sumber.ts`, satu sumber untuk gambar dan tabel legenda dokumen.

### Membangun ulang gambar dan dokumen

```bash
npm run build
node tools/tangkap-peta.mjs
npm install docx --no-save
node tools/buat-dokumen-sumber-data.js
```

- `build.mjs` juga menghasilkan `dist/peta-sumber.html`, yaitu dashboard yang sama ditambah
  kotak sistem asal. Buka dengan `?peta=01-ringkasan-wilayah` dan seterusnya; tanpa parameter
  tampil daftar semua peta. Dashboard utama tidak memuat skrip ini.
- `tangkap-peta.mjs` memakai Chrome atau Edge yang sudah terpasang dalam mode headless dengan
  profil sementara. Satu peta saja: `node tools/tangkap-peta.mjs 06`.
- Kotak ditempatkan dari posisi elemen yang sebenarnya, jadi tetap pas bila tata letak berubah.
  Bila judul kartu atau kolom tabel diganti, sesuaikan penunjuknya di `src/dokumentasi/peta-sumber.ts`;
  penangkap berhenti dengan pesan kolom atau kartu mana yang tidak ditemukan.
- Daftar isi Word baru terisi setelah klik kanan pada daftar isi lalu Update Field.

---

## Isi folder

```text
src/
  tampilan/      HTML, CSS, chart, komponen UI, dan tampilan setiap peran
  logika/        perhitungan data, insight, navigasi, dan filter
  data/          org.ts, kanal.ts, mo.ts (hasil ekstraksi Excel)
  dokumentasi/   peta sumber data dan anotasi
config/
  dashboard.ts   pengaturan publik: periode, ambang, bobot, SLA
  build.mjs      urutan aset yang dimasukkan ke HTML
  server.mjs     pemuatan .env dan konfigurasi server lokal
.env             kredensial lokal, diabaikan Git
.env.example     contoh nama variabel tanpa kredensial asli
tools/           build, server lokal, ekstraksi, pemeriksaan, dan pembuatan dokumen
docs/            desain, dokumen sumber data, dan tangkapan layar
dist/            HTML hasil build
```

Gunakan Node.js 22.6 atau lebih baru. Jalankan pemeriksaan lengkap dengan
`npm run check` (TypeScript, build, dan rekonsiliasi angka).
Pemeriksaan tambahan: `node tools/cek.js tools/cek2.js`.

### Konfigurasi dan rahasia

- Ubah periode, asumsi bobot, dan ambang dashboard di `config/dashboard.ts`.
  File ini masuk HTML hasil build dan dapat dibaca pengguna.
- Salin `.env.example` menjadi `.env`, lalu isi konfigurasi lokal.
  Di PowerShell: `Copy-Item .env.example .env` (hanya jika belum ada).
- `npm run dev` memuat `.env` otomatis. Variabel lingkungan proses yang sudah ada
  diprioritaskan. `PORT` mengatur port server lokal (default 3000).
- Variabel DB, auth, dan service pada template disiapkan untuk integrasi backend;
  prototipe ini belum menggunakannya. Jangan isi password, token, atau client secret
  di `src/`, `config/dashboard.ts`, atau `config/build.mjs`.
- `config/server.mjs` hanya berjalan di Node. Build tidak membaca `.env`, dan
  server hanya menyajikan dua halaman HTML yang terdaftar.
- Data produksi yang ditampilkan masih tertanam dalam HTML prototipe. Pemisahan
  `.env` tidak menggantikan autentikasi dan pembatasan akses backend.


---

## Yang belum dikerjakan

Seluruhnya di luar lingkup prototipe dan menjadi pekerjaan tim Teknologi Informasi setelah
arah ini memperoleh persetujuan.

- Integrasi ke eReport, Pega ASMPro, dan Matrix Distribution. Spesifikasi pertukaran datanya
  masih berupa usulan, lihat pertanyaan terbuka OQ-1 sampai OQ-6 pada
  `Crawling Prospek/docs/04-Technical-Design.md` bagian 7.2.
- Autentikasi tunggal Uniport dan penegakan hak akses di sisi peladen. Pembatasan peran pada
  prototipe ini hanya berlaku di sisi tampilan.
- Pengingat yang benar-benar terkirim, misalnya lewat surel atau notifikasi. Prototipe hanya
  menampilkan daftar, belum mengirim apa pun.
- Penggantian mesin narasi berbasis aturan dengan model bahasa, beserta alur review manusia.
- Data harian yang sebenarnya, yang akan menggantikan sebaran hasil simulasi.

## Rujukan

- `D:\dezar.ai\Laporan Konsolidasi Masukan User, Optimalisasi Kapasitas Treaty & Matrix Distribution.md`,
  masukan Kantor Wilayah 1 dan 2 yang dijawab langsung oleh beberapa tabel pada dashboard ini.
- `D:\dezar.ai\work\sinarmas\MPD IMPACT\MDP Impact ASM, Knowledge Base\Materi Produk\Transkrip Ringkas, d16.md`,
  tujuh kategori Sumber Bisnis dan pembelahan Direct dan Indirect.
- `D:\dezar.ai\work\sinarmas\Rapim\MoM Rapim Direksi.md`, angka share kanal dan nama mitra.
- `D:\Development Apps Folder\Crawling Prospek\docs\07-Blueprint-Platform-Prospek-Intelligence-v3.md`,
  Pilar B Dashboard 360 dan Pilar D AI Effort Analysis.
- `D:\dezar.ai\_steering\DESIGN-ASM.md`, kontrak desain. Dua penyimpangan yang disengaja yaitu
  penggunaan font sistem agar berkas berjalan luring, serta penambahan palet chart turunan
  navy karena kontrak mengunci merah dan emas sebagai aksen langka.
