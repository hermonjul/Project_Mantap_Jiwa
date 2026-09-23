web application/stitch/projects/11127101146307682548/screens/1b5530b2e84549c1ac4957741e381fec
# Design System Specification: UniPort Executive Dashboard

## 1. Executive Summary & Brand Identity
UniPort Executive Dashboard dirancang khusus untuk para eksekutif dan *head of commercial* dalam memantau portofolio produksi asuransi/keuangan, realisasi target multi-wilayah, manajemen *pipeline* prospek, serta analisis risiko operasional cabang. Sistem desain ini memadukan estetika *enterprise analytics* modern, ketegasan visual metrik finansial, dan keterbacaan data berkepadatan tinggi (*high-density data visual hierarchy*).

---

## 2. Design Tokens & Color Palette

### 2.1 Primary & Neutral Colors
- **Background Slate (Canvas):** `#F8FAFC` (`slate-50`)
- **Surface / Card Background:** `#FFFFFF` (`white`)
- **Card Sub-surface / Inactive Fill:** `#F1F5F9` (`slate-100`)
- **Border Default:** `#E2E8F0` (`slate-200`)
- **Border Subtler:** `#F1F5F9` (`slate-100`)
- **Text Primary (Headings & Bold Metrics):** `#0F172A` (`slate-900`)
- **Text Secondary (Labels & Descriptions):** `#475569` (`slate-600`)
- **Text Muted / Footnotes:** `#94A3B8` (`slate-400`)

### 2.2 Semantic & Status Colors
- **Primary Brand Navy:** `#1E293B` (`slate-800`) / Deep Brand Accent `#2563EB` (`blue-600`)
- **Positive / Success / On Target:**
  - Background: `#ECFDF5` (`emerald-50`)
  - Text & Accent: `#059669` (`emerald-600`)
  - Progress Fill: `#10B981` (`emerald-500`)
- **Urgent / Danger / Overdue (Telat Jatuh Tempo):**
  - Background: `#FEF2F2` (`red-50`)
  - Border: `#FEE2E2` (`red-100`)
  - Text & Accent: `#DC2626` (`red-600`)
  - Pill Tag: `#EF4444` (`red-500`)
- **Warning / Moderate Urgency (Jatuh Tempo Hari Ini / Gap):**
  - Background: `#FEFCE8` (`yellow-50` / `amber-50`)
  - Text & Accent: `#D97706` (`amber-600`)
  - Badge Border: `#FDE68A` (`amber-200`)
- **Info / Upcoming (1–3 Hari Lagi / Prospek):**
  - Background: `#EFF6FF` (`blue-50`)
  - Text & Accent: `#2563EB` (`blue-600`)
- **Premium Accent (AI Executive Insights Widget):**
  - Surface Background: `#0F172A` to `#1E1B4B` (Deep Indigo-Slate gradient)
  - Text Heading: `#FFFFFF`
  - Body / Card Container: `rgba(255, 255, 255, 0.08)`
  - Accent Tag: `#6366F1` (`indigo-500`)

### 2.3 Sub-Channel Indicator Badges
- **Banking:** `#EFF6FF` (BG) / `#1D4ED8` (Text) — Soft Blue
- **Multifinance:** `#EEF2FF` (BG) / `#4338CA` (Text) — Soft Indigo
- **Broker:** `#ECFDF5` (BG) / `#047857` (Text) — Soft Emerald
- **Corporate:** `#FAF5FF` (BG) / `#7E22CE` (Text) — Soft Purple
- **Direct / Captive:** `#F1F5F9` (BG) / `#334155` (Text) — Slate Neutral

---

## 3. Typography Hierarchy

Sistem tipografi menggunakan sans-serif modern berorientasi angka monospaced/tabular figures (`Inter`, `Plus Jakarta Sans`, atau `system-ui`).

| Tingkat Hirarki | Ukuran Font / Line-height | Weight | Penggunaan |
| :--- | :--- | :--- | :--- |
| **Display Metric / Hero KPI** | `32px` - `36px` / `40px` | Bold (`700`) | Nilai metrik utama: misal `Rp 49.1 M`, `69%`, `444` |
| **Page Title (H1)** | `22px` - `24px` / `32px` | Bold (`700`) | "Ringkasan Eksekutif Nasional", "Perlu Tindakan & Prioritas Intervensi" |
| **Section Header (H2)** | `18px` / `26px` | Semi-bold (`600`) | Header kartu analitik, judul tabel, proyeksi tahunan |
| **Sub-header / Card Label** | `13px` - `14px` / `20px` | Medium / Semi-bold | "PRODUKSI AGU 2026", "CAPAIAN TAHUNAN YTD", "STATUS PROSPEK" |
| **Body Primary** | `14px` / `20px` | Regular (`400`) / Medium (`500`) | Baris tabel nama prospek, keterangan ringkasan |
| **Body Secondary / Caption** | `12px` - `13px` / `18px` | Regular (`400`) | Tanggal sinkronisasi, sub-teks kantor cabang, target per bulan |
| **Micro Labels / Badges** | `11px` / `14px` | Semi-bold (`600`) / Bold (`700`) | Lencana "HOT", "TELAT 24 HARI", "75% Capaian", persentase MoM |

---

## 4. Layout, Spacing & Grid System

- **Max Container Width:** `1440px` (Desktop Centered) dengan padding horizontal `24px` hingga `32px`.
- **Vertical Spacing Rhythm:**
  - Jarak antar seksi besar: `32px` (`gap-8` / `space-y-8`)
  - Jarak antar kartu grid: `20px` - `24px` (`gap-5` hingga `gap-6`)
  - Padding internal kartu: `20px` - `24px` (`p-5` hingga `p-6`)
- **Corner Radii (`border-radius`):**
  - Card Containers: `16px` (`rounded-2xl`)
  - Sub-cards / Data Box: `12px` (`rounded-xl`)
  - Action Buttons & Inputs: `8px` - `10px` (`rounded-lg`)
  - Pill Badges & Tags: `9999px` (`rounded-full`)
- **Shadow System:**
  - Standard Card: `0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)`
  - Elevated Card / Hover: `0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.04)`

---

## 5. Key UI Component Specifications

### 5.1 Top Navigation Bar
- Tinggi: `64px` - `70px`, latar belakang putih bersih (`#FFFFFF`) dengan garis batas bawah lembut (`border-b border-slate-200`).
- Terdiri dari:
  - Brand Logo ("UniPort Executive Suite") dengan aksen ungu/biru.
  - Live Status Indicator ("Live Data: Data per 31 Agu 2026").
  - Universal Search Input dengan ikon kaca pembesar dan placeholder ringkas.
  - Sub-navigasi aksi cepat: Produksi, Simulasi, Lihat Sebagai.
  - Profil Executive Avatar (`AD` - Agus Darmawan, Head of Commercial).
- Filter Baris Cepat: Tombol filter kanal berbentuk pills (Semua, Direct, Captive, Corporate, Agency, Banking, Multifinance, Broker, Sinar Mas Group) dengan status aktif berwarna *Slate-900* solid.

### 5.2 Top-tier Executive Metric Cards (KPI Cards)
- Grid 3 kolom responsif:
  1. **Produksi Bulan Berjalan:** Nilai realisasi bold, target pembanding, persentase MoM badge, mini progress bar warna gradien.
  2. **Capaian Tahunan YTD:** Target progres tahunan, tracking bulan (misal "7 dari 12 Bulan"), total sisa target.
  3. **Perlu Tindakan Segera:** Jumlah total prospek aktif, nilai premi rentan berisiko, dan angka mencolok merah untuk jumlah prospek lewat jatuh tempo.

### 5.3 Urgency Buckets & Priority Intervention Table
- **Urgency Buckets (4 Kolom Mini-Card):**
  - "Lewat Jatuh Tempo" (Kritis - Red theme)
  - "Jatuh Tempo Hari Ini" (Warning - Amber theme)
  - "1 Sampai 3 Hari Lagi" (Mendatang - Blue theme)
  - "4 Sampai 7 Hari Lagi" (Wajar - Gray/Neutral theme)
- **Data Table:**
  - Header berlatar abu-abu netral dengan tipografi uppercase tereduksi (`text-xs uppercase tracking-wider text-slate-500`).
  - Kolom esensial: Nomor, Nama Nasabah/Prospek & Produk, Sub-Channel Badge, Status Lead, Tahapan Terakhir, Cabang, Marketing Officer, Potensi Premi (Formatted IDR), Indikator Keterlambatan Jatuh Tempo, dan Action CTA ("Hubungi MO", "Intervensi Kawil", "Eskalasi").

### 5.4 Analytics Charts & Forecasting
- **Proyeksi Target 2026:**
  - Visualisasi progress multi-segmen: Realisasi Berjalan vs Estimasi 5 Bulan vs Gap Defisit Target.
  - Alert Box informatif dengan kalkulasi run-rate target per bulan yang dibutuhkan untuk mengejar defisit.
- **Tren Produksi 12 Minggu Terakhir:**
  - Bar chart vertikal terstruktur dengan garis target mingguan bertitik putus-putus (*dashed benchmark line*) berwarna merah muda/koral.
- **Ketergantungan Orang Kunci (Key-Person Dependency):**
  - Indikator risiko operasional cabang dengan porsi ketergantungan 1 Marketing Officer > 90%, lengkap dengan badge "Risiko Tinggi".

### 5.5 AI Executive Insights (Dark Card Accent)
- Card gelap bertema *deep intelligence* bergradien *Dark Navy* (`#0F172A`).
- Menampilkan diagnosis otomatis sistem:
  - Deteksi prospek *stuck* / *overdue* kritis.
  - Analisis gap pencapaian target akhir tahun dan run-rate yang dibutuhkan.
  - Deteksi konsentrasi risiko produksi ekstrem pada satu personil.
  - Momentum pertumbuhan sub-kanal (misal lonjakan performa Broker).
- Setiap poin temuan dilengkapi rekomendasi aksi langsung (*Direct CTA Recommendation*).

### 5.6 Performa & Portofolio Kantor Wilayah (KW Cards)
- Grid 3 kartu terdistribusi untuk Kantor Wilayah 1, 2, dan 3.
- Rangkuman metrik per wilayah: Total produksi, porsi kontribusi nasional, rasio beban prospek telat, serta breakdown rasio kanal Direct vs Captive.

---

## 6. Tone of Voice & Content Guidelines
- Bahasa antarmuka: **Bahasa Indonesia Baku Korporat / Finansial**.
- Format Angka Mata Uang: Rupiah disingkat `M` (Miliar) atau `Jt` (Juta), misal `Rp 49.1 M`, `Rp 14.2 M`, `Rp 249 Jt`.
- Format Status Waktu: `TELAT 24 HARI`, `HARI INI`, `1-3 HARI LAGI`.
- Hirarki Informasi: Masalah & urgensi ditempatkan di lapisan atas sebelum analisis tren jangka panjang untuk memastikan eksekutif dapat langsung mengambil keputusan (*Actionable First, Diagnostic Second*).