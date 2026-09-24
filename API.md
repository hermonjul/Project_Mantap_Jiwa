# Executive Dashboard API — Matrix Distribution

Dokumentasi API untuk data prospek Matrix Distribution pada Executive Dashboard.

## Daftar isi

1. [Informasi umum](#1-informasi-umum)
2. [Alur penggunaan](#2-alur-penggunaan)
3. [Parameter posisi (position & positionValue)](#3-parameter-posisi-position--positionvalue)
4. [Endpoint lookup (dropdown)](#4-endpoint-lookup-dropdown)
   - [4.1 Daftar Kanwil](#41-daftar-kanwil)
   - [4.2 Daftar Cabang](#42-daftar-cabang)
   - [4.3 Daftar Marketing](#43-daftar-marketing)
5. [Endpoint prospek](#5-endpoint-prospek)
   - [5.1 Daftar prospek](#51-daftar-prospek)
   - [5.2 Prospek jatuh tempo](#52-prospek-jatuh-tempo)
   - [5.3 Detail prospek](#53-detail-prospek)
   - [5.4 Ringkasan prospek (total & jatuh tempo)](#54-ringkasan-prospek-total--jatuh-tempo)
   - [5.5 Rincian jumlah prospek (drill-down)](#55-rincian-jumlah-prospek-drill-down)
6. [Endpoint lain](#6-endpoint-lain)
   - [6.1 Health check](#61-health-check)
7. [Cara mencoba](#7-cara-mencoba)
8. [Catatan & batasan](#8-catatan--batasan)

---

## 1. Informasi umum

### Ringkasan endpoint

| Method | URL | Kegunaan |
|---|---|---|
| GET | `/api/v1/matrix/kanwils` | Dropdown Kanwil |
| POST | `/api/v1/matrix/branches` | Dropdown Cabang berdasarkan Kanwil |
| POST | `/api/v1/matrix/marketings` | Dropdown Marketing berdasarkan Cabang |
| POST | `/api/v1/matrix/prospects` | Daftar prospek + filter nama cabang / nama marketing |
| POST | `/api/v1/matrix/prospects/due` | Prospek yang follow-up-nya jatuh tempo (hari ini / lewat) |
| POST | `/api/v1/matrix/prospects/detail` | Detail prospek + kategori status + effort terakhir |
| POST | `/api/v1/matrix/prospects/summary` | Total prospek & jumlah jatuh tempo (untuk kartu angka dashboard) |
| POST | `/api/v1/matrix/prospects/breakdown` | Jumlah prospek & jatuh tempo per Kanwil / Cabang / Marketing (drill-down) |
| GET | `/healthz` | Cek server & koneksi database |

### Base URL

```
http://192.168.10.97:8080
```

### Aturan request

| Aturan | Keterangan |
|---|---|
| Header | Endpoint POST wajib mengirim `Content-Type: application/json` |
| Field tidak dikenal | Ditolak dengan `400 invalid JSON body` (cek ejaan nama field, case-sensitive) |
| Field opsional | Boleh tidak dikirim, atau dikirim sebagai string kosong `""` |
| Spasi | Spasi di awal/akhir nilai string dibuang otomatis |
| Ukuran body | Maksimal 1 MB |

### Format respons

Semua endpoint mengembalikan format yang sama.

**Sukses**
```json
{
  "success": true,
  "data": [ ... ],
  "meta": { "page": 1, "pageSize": 20, "totalItems": 135, "totalPages": 7 }
}
```

| Field | Keterangan |
|---|---|
| `success` | `true` jika berhasil |
| `data` | Isi data. Array kosong `[]` jika tidak ada data |
| `meta` | Informasi halaman. **Hanya ada** di endpoint daftar prospek (5.1, 5.2, 5.3). Endpoint 5.5 memakai `meta` berisi `groupBy` |
| `meta.page` | Halaman saat ini |
| `meta.pageSize` | Jumlah data per halaman |
| `meta.totalItems` | Total seluruh data yang cocok dengan filter |
| `meta.totalPages` | Total halaman |

**Gagal**
```json
{ "success": false, "message": "pesan error" }
```

### HTTP status

| Status | Arti | Tindakan di front end |
|---|---|---|
| 200 | Sukses | Tampilkan `data` |
| 400 | Request salah (field kosong / nilai tidak valid / JSON rusak) | Tampilkan `message`, perbaiki request |
| 405 | Method salah (mis. GET ke endpoint POST) | Periksa method |
| 500 | Error server / query database | Tampilkan pesan umum, coba lagi |
| 503 | Database tidak tersedia (hanya `/healthz`) | Server belum siap |

### Nilai `null`

Semua field string di dalam `data` bisa bernilai `null` jika kolomnya kosong di database. Front end wajib menangani `null`.

---

## 2. Alur penggunaan

**Langkah 1 — isi dropdown berjenjang**

| Langkah | Request | User memilih | `value` yang disimpan |
|---|---|---|---|
| 1 | `GET /kanwils` | Kanwil 1 | `"1"` |
| 2 | `POST /branches` body `{ "kanwil": "1" }` | JAKARTA | `"101"` |
| 3 | `POST /marketings` body `{ "branch": "101" }` | BUDI SANTOSO | `"MKT001"` |

**Langkah 2 — ambil data prospek** (`/prospects`, `/prospects/due`, `/prospects/detail`, `/prospects/summary`, atau `/prospects/breakdown`)

Gunakan pilihan **paling bawah** yang sudah dipilih user:

| Pilihan terakhir user | Body request |
|---|---|
| Belum memilih apa pun | `{ "position": "DIREKSI" }` |
| Kanwil | `{ "position": "PINWIL", "positionValue": "1" }` |
| Cabang | `{ "position": "PINCAB", "positionValue": "101" }` |
| Marketing | `{ "position": "MARKETING", "positionValue": "MKT001" }` |

Aturan: **`value`** dari endpoint lookup selalu dikirim ke service, **`label`** hanya untuk ditampilkan.

---

## 3. Parameter posisi (position & positionValue)

Dipakai oleh semua endpoint prospek (5.1 – 5.5). Endpoint 5.4 dan 5.5 tidak memakai `page` / `pageSize`. Menentukan **cakupan data** yang diambil.

| Field | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `position` | string | **Ya** | `DIREKSI`, `PINWIL`, `PINCAB`, atau `MARKETING` (huruf besar/kecil bebas) |
| `positionValue` | string | Tergantung `position` | Lihat tabel di bawah |
| `sumbis` | string | Tidak | Filter tambahan kode SOB (sumber bisnis), exact match |
| `page` | number | Tidak | Nomor halaman, mulai dari `1`. Default `1` |
| `pageSize` | number | Tidak | Jumlah data per halaman, `1`–`100`. Default `20` |

### Nilai `positionValue` per `position`

| `position` | Cakupan data | `positionValue` | Diambil dari |
|---|---|---|---|
| `DIREKSI` | Semua data | Kosong / tidak dikirim | – |
| `PINWIL` | Satu Kanwil | `1`, `2`, `3`, `AND`, atau `AD` | `value` [4.1 Daftar Kanwil](#41-daftar-kanwil) |
| `PINCAB` | Satu cabang | Kode cabang, mis. `101` | `value` [4.2 Daftar Cabang](#42-daftar-cabang) |
| `MARKETING` | Satu marketing | Marketing ID, mis. `MKT001` | `value` [4.3 Daftar Marketing](#43-daftar-marketing) |

Untuk `PINWIL`, label Kanwil (mis. `"Kanwil 1"`) juga diterima, tapi **disarankan memakai `value`**.

### Contoh

```json
{ "position": "DIREKSI" }
{ "position": "PINWIL",    "positionValue": "1" }
{ "position": "PINCAB",    "positionValue": "101" }
{ "position": "MARKETING", "positionValue": "MKT001" }
{ "position": "PINWIL",    "positionValue": "2", "sumbis": "SOB01", "page": 2, "pageSize": 50 }
```

### Error

| HTTP | `message` | Penyebab |
|---|---|---|
| 400 | `position must be one of: DIREKSI, PINWIL, PINCAB, MARKETING` | `position` kosong atau salah ejaan |
| 400 | `positionValue for PINWIL must be one of: 1, 2, 3, AND, AD (atau labelnya: ...)` | Kode Kanwil tidak dikenal |
| 400 | `positionValue (branch code) is required for PINCAB` | PINCAB tanpa kode cabang |
| 400 | `positionValue (marketing id) is required for MARKETING` | MARKETING tanpa marketing ID |
| 400 | `page must be a positive integer` | `page` < 1 |
| 400 | `pageSize must be between 1 and 100` | `pageSize` < 1 atau > 100 |
| 400 | `invalid JSON body` | JSON rusak, tipe salah (mis. `page: "1"`), atau ada field tidak dikenal |

---

## 4. Endpoint lookup (dropdown)

Ketiga endpoint lookup mengembalikan format item yang sama:

| Field | Tipe | Keterangan |
|---|---|---|
| `value` | string | Nilai yang **dikirim** ke service berikutnya |
| `label` | string | Teks yang **ditampilkan** di dropdown. Tidak pernah `null` (jika nama kosong, diisi `value`) |

---

### 4.1 Daftar Kanwil

Mengambil daftar Kanwil untuk dropdown pertama.

```
GET /api/v1/matrix/kanwils
```

**Request:** tidak ada body / parameter.

**Response 200**
```json
{
  "success": true,
  "data": [
    { "value": "1",   "label": "Kanwil 1" },
    { "value": "2",   "label": "Kanwil 2" },
    { "value": "3",   "label": "Kanwil 3" },
    { "value": "AND", "label": "Agency Network Development" },
    { "value": "AD",  "label": "Agency Development" }
  ]
}
```

**Aturan data**
- Hanya 5 Kanwil resmi di atas yang bisa muncul. Kode lain, mis. `KP` (Kantor Pusat), tidak ditampilkan karena bukan Kanwil.
- Kanwil hanya muncul jika memiliki cabang di master cabang.
- Urutan selalu: Kanwil 1, Kanwil 2, Kanwil 3, Agency Network Development, Agency Development.

**Error**

| HTTP | `message` |
|---|---|
| 500 | `failed to load kanwils` |

---

### 4.2 Daftar Cabang

Mengambil daftar cabang dari Kanwil yang dipilih.

```
POST /api/v1/matrix/branches
Content-Type: application/json
```

**Request body**

| Field | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `kanwil` | string | **Ya** | `value` dari [4.1 Daftar Kanwil](#41-daftar-kanwil): `1`, `2`, `3`, `AND`, atau `AD` |

```json
{ "kanwil": "1" }
```

Contoh untuk setiap Kanwil:
```json
{ "kanwil": "1" }
{ "kanwil": "2" }
{ "kanwil": "3" }
{ "kanwil": "AND" }
{ "kanwil": "AD" }
```

**Response 200**
```json
{
  "success": true,
  "data": [
    { "value": "101", "label": "JAKARTA" },
    { "value": "102", "label": "BEKASI" }
  ]
}
```

| Field | Keterangan |
|---|---|
| `value` | Kode cabang. Dipakai untuk [4.3 Daftar Marketing](#43-daftar-marketing) dan `positionValue` PINCAB |
| `label` | Nama cabang |

Diurutkan berdasarkan nama cabang.

**Error**

| HTTP | `message` | Penyebab |
|---|---|---|
| 400 | `kanwil is required` | `kanwil` kosong / tidak dikirim |
| 400 | `kanwil must be one of: 1, 2, 3, AND, AD (atau labelnya: ...)` | Kode Kanwil tidak dikenal (mis. `KP` — Kantor Pusat bukan Kanwil) |
| 400 | `invalid JSON body` | JSON rusak / ada field tidak dikenal |
| 500 | `failed to load branches` | Error database |

---

### 4.3 Daftar Marketing

Mengambil daftar marketing dari cabang yang dipilih.

```
POST /api/v1/matrix/marketings
Content-Type: application/json
```

**Request body**

| Field | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `branch` | string | **Ya** | `value` dari [4.2 Daftar Cabang](#42-daftar-cabang) |

```json
{ "branch": "101" }
```

**Response 200**
```json
{
  "success": true,
  "data": [
    { "value": "MKT001", "label": "BUDI SANTOSO" },
    { "value": "MKT002", "label": "SITI AMINAH" }
  ]
}
```

| Field | Keterangan |
|---|---|
| `value` | Marketing ID. Dipakai untuk `positionValue` MARKETING |
| `label` | Nama marketing |

**Aturan data**
- Hanya marketing yang **memiliki prospek** di cabang tersebut (tidak ada tabel master marketing).
- Diurutkan berdasarkan nama marketing.

**Error**

| HTTP | `message` | Penyebab |
|---|---|---|
| 400 | `branch is required` | `branch` kosong / tidak dikirim |
| 400 | `invalid JSON body` | JSON rusak / ada field tidak dikenal |
| 500 | `failed to load marketings` | Error database |

---

## 5. Endpoint prospek

Perbedaan ketiga endpoint prospek:

| | 5.1 `/prospects` | 5.2 `/prospects/due` | 5.3 `/prospects/detail` |
|---|---|---|---|
| Kegunaan | Tabel / pencarian prospek | Daftar prospek yang harus di-follow-up | Ringkasan prospek untuk dashboard |
| Data yang diambil | Semua prospek | Hanya prospek jatuh tempo | Semua prospek |
| Filter posisi & sumbis | ✅ | ✅ | ✅ |
| Filter nama cabang / marketing | ✅ | ❌ | ❌ |
| Data effort terakhir | ❌ | ✅ lengkap | ✅ ringkas |
| Kategori status (Cold/Warm/Hot) | ❌ | ❌ | ✅ |
| Urutan | ID prospek | Tanggal follow-up terlama dulu | ID prospek |

Untuk angka ringkasan gunakan [5.4 Ringkasan prospek](#54-ringkasan-prospek-total--jatuh-tempo) (satu angka total) atau [5.5 Rincian jumlah prospek](#55-rincian-jumlah-prospek-drill-down) (angka per Kanwil / Cabang / Marketing).

**Effort terakhir** = aktivitas follow-up dengan tanggal input paling baru untuk prospek tersebut.

---

### 5.1 Daftar prospek

```
POST /api/v1/matrix/prospects
Content-Type: application/json
```

**Request body**

| Field | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `position` | string | **Ya** | Lihat [bagian 3](#3-parameter-posisi-position--positionvalue) |
| `positionValue` | string | Tergantung | Lihat [bagian 3](#3-parameter-posisi-position--positionvalue) |
| `sumbis` | string | Tidak | Kode SOB, exact match |
| `branchName` | string | Tidak | Cari nama cabang yang **mengandung** teks ini (huruf besar/kecil bebas) |
| `marketingName` | string | Tidak | Cari nama marketing yang **mengandung** teks ini (huruf besar/kecil bebas) |
| `page` | number | Tidak | Default `1` |
| `pageSize` | number | Tidak | Default `20`, maksimal `100` |

Semua filter yang diisi digabung dengan **AND**.

**Contoh — DIREKSI (semua prospek)**
```json
{
  "position": "DIREKSI",
  "positionValue": "",
  "sumbis": "",
  "branchName": "",
  "marketingName": "",
  "page": 1,
  "pageSize": 20
}
```

**Contoh — DIREKSI, cari nama marketing "budi" di cabang yang namanya mengandung "surabaya"**
```json
{
  "position": "DIREKSI",
  "positionValue": "",
  "sumbis": "",
  "branchName": "surabaya",
  "marketingName": "budi",
  "page": 1,
  "pageSize": 20
}
```

**Contoh — PINWIL (Kanwil 1, cabang yang namanya mengandung "jakarta")**
```json
{
  "position": "PINWIL",
  "positionValue": "1",
  "sumbis": "",
  "branchName": "jakarta",
  "marketingName": "",
  "page": 1,
  "pageSize": 20
}
```

**Contoh — PINCAB (cabang 101, marketing yang namanya mengandung "budi")**
```json
{
  "position": "PINCAB",
  "positionValue": "101",
  "sumbis": "",
  "branchName": "",
  "marketingName": "budi",
  "page": 1,
  "pageSize": 20
}
```

**Contoh — MARKETING (marketing MKT001, sumbis SOB01)**
```json
{
  "position": "MARKETING",
  "positionValue": "MKT001",
  "sumbis": "SOB01",
  "branchName": "",
  "marketingName": "",
  "page": 1,
  "pageSize": 20
}
```

**Response 200**
```json
{
  "success": true,
  "data": [
    {
      "idPega": "ASM-FW-GISFW-WORK MTX-0001",
      "inputDate": "2026-09-01T08:00:00Z",
      "branchCode": "101",
      "branchName": "JAKARTA",
      "branchMatrixDistribution": "1",
      "sobCode": "SOB01",
      "sobName": "DIRECT",
      "clientId": "CL0001",
      "clientName": "PT CONTOH",
      "marketingId": "MKT001",
      "marketingName": "BUDI SANTOSO",
      "businessId": "BIZ01",
      "businessName": "PROPERTY",
      "status": "Follow Up",
      "type": "NEW",
      "projectName": "PROJECT A",
      "idRenewal": null
    }
  ],
  "meta": { "page": 1, "pageSize": 20, "totalItems": 1, "totalPages": 1 }
}
```

**Field `data[]`**

| Field | Keterangan |
|---|---|
| `idPega` | ID prospek |
| `inputDate` | Tanggal prospek diinput |
| `branchCode` | Kode cabang |
| `branchName` | Nama cabang |
| `branchMatrixDistribution` | Kode Kanwil cabang (`1`, `2`, `3`, `AND`, `AD`, dll.) |
| `sobCode` | Kode SOB (sumbis) |
| `sobName` | Nama SOB |
| `clientId` | ID client |
| `clientName` | Nama client |
| `marketingId` | Marketing ID |
| `marketingName` | Nama marketing |
| `businessId` | Kode bisnis |
| `businessName` | Nama bisnis |
| `status` | Status prospek |
| `type` | Tipe prospek |
| `projectName` | Nama proyek |
| `idRenewal` | ID renewal |

**Error:** lihat [bagian 3](#error). Error database: `500 failed to load prospects`.

---

### 5.2 Prospek jatuh tempo

Prospek yang **tanggal follow-up** pada effort terakhirnya adalah **hari ini atau sudah lewat**.

```
POST /api/v1/matrix/prospects/due
Content-Type: application/json
```

**Request body**

| Field | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `position` | string | **Ya** | Lihat [bagian 3](#3-parameter-posisi-position--positionvalue) |
| `positionValue` | string | Tergantung | Lihat [bagian 3](#3-parameter-posisi-position--positionvalue) |
| `sumbis` | string | Tidak | Kode SOB, exact match |
| `page` | number | Tidak | Default `1` |
| `pageSize` | number | Tidak | Default `20`, maksimal `100` |

**Contoh — DIREKSI (semua prospek jatuh tempo)**
```json
{
  "position": "DIREKSI",
  "positionValue": "",
  "sumbis": "",
  "page": 1,
  "pageSize": 20
}
```

**Contoh — PINWIL (Kanwil 1)**
```json
{
  "position": "PINWIL",
  "positionValue": "1",
  "sumbis": "",
  "page": 1,
  "pageSize": 20
}
```

**Contoh — PINCAB (cabang 101)**
```json
{
  "position": "PINCAB",
  "positionValue": "101",
  "sumbis": "",
  "page": 1,
  "pageSize": 20
}
```

**Contoh — MARKETING (marketing MKT001, sumbis SOB01)**
```json
{
  "position": "MARKETING",
  "positionValue": "MKT001",
  "sumbis": "SOB01",
  "page": 1,
  "pageSize": 20
}
```

**Response 200**
```json
{
  "success": true,
  "data": [
    {
      "idPega": "ASM-FW-GISFW-WORK MTX-0001",
      "inputDate": "2026-09-01T08:00:00Z",
      "branchCode": "101",
      "branchName": "JAKARTA",
      "branchMatrixDistribution": "1",
      "sobCode": "SOB01",
      "sobName": "DIRECT",
      "clientId": "CL0001",
      "clientName": "PT CONTOH",
      "marketingId": "MKT001",
      "marketingName": "BUDI SANTOSO",
      "businessId": "BIZ01",
      "businessName": "PROPERTY",
      "status": "Follow Up",
      "type": "NEW",
      "projectName": "PROJECT A",
      "idRenewal": null,
      "clientType": "CORPORATE",
      "clientBusinessSector": "MANUFAKTUR",
      "marketingEmail": "budi@contoh.id",
      "gpw": "150000000",
      "npw": "120000000",
      "lastEffort": {
        "idEffort": "5001",
        "effortType": "VISIT",
        "effortDate": "2026-09-20T00:00:00Z",
        "followUpDate": "2026-09-23T00:00:00Z",
        "dueStatus": "TODAY",
        "status": "OPEN",
        "results": "Klien minta penawaran",
        "note": "Follow up via telepon",
        "picName": "IBU SARI",
        "contactStatus": "CONNECTED",
        "contactResult": "INTERESTED",
        "effortPercentage": "50",
        "inputDate": "2026-09-20T10:15:00Z"
      }
    }
  ],
  "meta": { "page": 1, "pageSize": 20, "totalItems": 1, "totalPages": 1 }
}
```

**Field `data[]`**

Semua field [5.1 Daftar prospek](#51-daftar-prospek), ditambah:

| Field | Keterangan |
|---|---|
| `clientType` | Tipe client |
| `clientBusinessSector` | Sektor bisnis client |
| `marketingEmail` | Email marketing |
| `gpw` | Nilai GPW prospek |
| `npw` | Nilai NPW prospek |
| `lastEffort` | Effort terakhir (objek, lihat di bawah) |

**Field `lastEffort`**

| Field | Keterangan |
|---|---|
| `idEffort` | ID effort |
| `effortType` | Jenis effort |
| `effortDate` | Tanggal effort dilakukan |
| `followUpDate` | Tanggal rencana follow-up berikutnya |
| `dueStatus` | `TODAY` = jatuh tempo hari ini, `OVERDUE` = sudah lewat |
| `status` | Status effort |
| `results` | Hasil effort |
| `note` | Catatan effort |
| `picName` | Nama PIC |
| `contactStatus` | Status kontak |
| `contactResult` | Hasil kontak |
| `effortPercentage` | Persentase effort |
| `inputDate` | Tanggal effort diinput |

Diurutkan dari `followUpDate` paling lama (paling telat) ke paling baru.

**Error:** lihat [bagian 3](#error). Error database: `500 failed to load due prospects`.

---

### 5.3 Detail prospek

Ringkasan setiap prospek beserta kategori status dan effort terakhir.

```
POST /api/v1/matrix/prospects/detail
Content-Type: application/json
```

**Request body:** sama dengan [5.2 Prospek jatuh tempo](#52-prospek-jatuh-tempo) (`position`, `positionValue`, `sumbis`, `page`, `pageSize`).

**Contoh — DIREKSI (semua prospek)**
```json
{
  "position": "DIREKSI",
  "positionValue": "",
  "sumbis": "",
  "page": 1,
  "pageSize": 20
}
```

**Contoh — PINWIL (Agency Development)**
```json
{
  "position": "PINWIL",
  "positionValue": "AD",
  "sumbis": "",
  "page": 1,
  "pageSize": 20
}
```

**Contoh — PINCAB (cabang 101, sumbis SOB01)**
```json
{
  "position": "PINCAB",
  "positionValue": "101",
  "sumbis": "SOB01",
  "page": 1,
  "pageSize": 20
}
```

**Contoh — MARKETING (marketing MKT001, halaman 2, 50 data per halaman)**
```json
{
  "position": "MARKETING",
  "positionValue": "MKT001",
  "sumbis": "",
  "page": 2,
  "pageSize": 50
}
```

**Response 200**
```json
{
  "success": true,
  "data": [
    {
      "idPega": "ASM-FW-GISFW-WORK MTX-0001",
      "clientName": "PT CONTOH",
      "sobName": "DIRECT",
      "status": "Negosiasi",
      "statusCategory": "Warm",
      "branchName": "JAKARTA",
      "marketingName": "BUDI SANTOSO",
      "lastEffort": {
        "idEffort": "5001",
        "effortType": "VISIT",
        "effortDate": "2026-09-20T00:00:00Z",
        "followUpDate": "2026-09-23T00:00:00Z",
        "results": "Klien minta penawaran",
        "note": "Follow up via telepon"
      }
    }
  ],
  "meta": { "page": 1, "pageSize": 20, "totalItems": 1, "totalPages": 1 }
}
```

**Field `data[]`**

| Field | Keterangan |
|---|---|
| `idPega` | ID prospek |
| `clientName` | Nama client |
| `sobName` | Nama SOB |
| `status` | Status prospek |
| `statusCategory` | Kategori status (lihat tabel di bawah) |
| `branchName` | Nama cabang |
| `marketingName` | Nama marketing |
| `lastEffort.idEffort` | ID effort terakhir |
| `lastEffort.effortType` | Jenis effort |
| `lastEffort.effortDate` | Tanggal effort dilakukan |
| `lastEffort.followUpDate` | Tanggal rencana follow-up berikutnya |
| `lastEffort.results` | Hasil effort |
| `lastEffort.note` | Catatan effort |

**Kategori status (`statusCategory`)**

| `status` | `statusCategory` |
|---|---|
| Prospek Baru, Tahap Awal | `Cold` |
| Follow Up, Negosiasi | `Warm` |
| Proposal | `Hot` |
| Status lainnya | Sama dengan `status` aslinya |

**Error:** lihat [bagian 3](#error). Error database: `500 failed to load prospect details`.

---

### 5.4 Ringkasan prospek (total & jatuh tempo)

Mengambil **angka ringkasan** dalam satu request: total prospek dan jumlah prospek jatuh tempo. Cocok untuk kartu angka di dashboard.

```
POST /api/v1/matrix/prospects/summary
Content-Type: application/json
```

**Request body**

| Field | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `position` | string | **Ya** | Lihat [bagian 3](#3-parameter-posisi-position--positionvalue) |
| `positionValue` | string | Tergantung | Lihat [bagian 3](#3-parameter-posisi-position--positionvalue) |
| `sumbis` | string | Tidak | Kode SOB, exact match |

Endpoint ini **tidak** menerima `page` / `pageSize` (akan ditolak `400 invalid JSON body`).

**Contoh — DIREKSI (semua data)**
```json
{
  "position": "DIREKSI",
  "positionValue": "",
  "sumbis": ""
}
```

**Contoh — PINWIL (Kanwil 1)**
```json
{
  "position": "PINWIL",
  "positionValue": "1",
  "sumbis": ""
}
```

**Contoh — PINCAB (cabang 101)**
```json
{
  "position": "PINCAB",
  "positionValue": "101",
  "sumbis": ""
}
```

**Contoh — MARKETING (marketing MKT001, sumbis SOB01)**
```json
{
  "position": "MARKETING",
  "positionValue": "MKT001",
  "sumbis": "SOB01"
}
```

**Response 200**
```json
{
  "success": true,
  "data": {
    "totalProspects": 135,
    "totalDue": 18,
    "totalDueToday": 5,
    "totalOverdue": 13
  }
}
```

`data` berupa **objek** (bukan array) dan tidak ada `meta`.

**Field `data`**

| Field | Tipe | Keterangan |
|---|---|---|
| `totalProspects` | number | Total semua prospek dalam cakupan posisi |
| `totalDue` | number | Total prospek jatuh tempo (= `totalDueToday` + `totalOverdue`) |
| `totalDueToday` | number | Prospek yang tanggal follow-up effort terakhirnya **hari ini** |
| `totalOverdue` | number | Prospek yang tanggal follow-up effort terakhirnya **sudah lewat** |

**Konsistensi dengan endpoint lain** (untuk body `position` / `positionValue` / `sumbis` yang sama)

| Angka | Sama dengan |
|---|---|
| `totalProspects` | `meta.totalItems` di [5.3 Detail prospek](#53-detail-prospek) |
| `totalDue` | `meta.totalItems` di [5.2 Prospek jatuh tempo](#52-prospek-jatuh-tempo) |

**Query**

```sql
WITH LAST_EFFORT AS (
    SELECT E.IDPEGA,
           E.FOLLOWUPDATE,
           ROW_NUMBER() OVER (
               PARTITION BY E.IDPEGA
               ORDER BY E.INPUTDATE DESC NULLS LAST, E.IDEFFORT DESC
           ) AS RN
    FROM POOLDATA.T_EFFORT_MATRIX_DISTRIBUTION E
)
SELECT COUNT(*) AS TOTAL_PROSPECTS,
       COUNT(CASE WHEN E.FOLLOWUPDATE < TRUNC(SYSDATE) + 1 THEN 1 END) AS TOTAL_DUE,
       COUNT(CASE WHEN E.FOLLOWUPDATE >= TRUNC(SYSDATE)
                   AND E.FOLLOWUPDATE <  TRUNC(SYSDATE) + 1 THEN 1 END) AS TOTAL_DUE_TODAY,
       COUNT(CASE WHEN E.FOLLOWUPDATE < TRUNC(SYSDATE) THEN 1 END) AS TOTAL_OVERDUE
FROM POOLDATA.T_MATRIX_DISTRIBUTION M
LEFT JOIN LAST_EFFORT E
       ON M.IDPEGA = 'ASM-FW-GISFW-WORK ' || E.IDPEGA
      AND E.RN = 1
LEFT JOIN POOLDATA.BRANCH B
       ON B.ID = M.BRANCHCODE
WHERE 1 = 1
  -- filter sesuai position (hanya satu yang dipakai):
  --   PINWIL    : AND B.BRANCHMATRIXDISTRIBUTION = :kanwil
  --   PINCAB    : AND M.BRANCHCODE = :branch
  --   MARKETING : AND M.MARKETINGID = :marketingId
  -- filter tambahan jika sumbis diisi:
  --              AND M.SOBCODE = :sumbis
```

**Error:** lihat [bagian 3](#error). Error database: `500 failed to load prospect summary`.

---

### 5.5 Rincian jumlah prospek (drill-down)

Jumlah prospek dan jatuh tempo **dipecah ke level di bawah posisi** yang dipilih. Cocok untuk tabel / grafik drill-down di dashboard.

```
POST /api/v1/matrix/prospects/breakdown
Content-Type: application/json
```

**Level rincian per posisi**

| `position` | Dirinci per | `meta.groupBy` | `value` tiap baris | Klik baris → request berikutnya |
|---|---|---|---|---|
| `DIREKSI` | Kanwil | `KANWIL` | Kode Kanwil (`1`, `2`, `3`, `AND`, `AD`, …) | `{ "position": "PINWIL", "positionValue": value }` |
| `PINWIL` | Cabang | `CABANG` | Kode cabang | `{ "position": "PINCAB", "positionValue": value }` |
| `PINCAB` | Marketing | `MARKETING` | Marketing ID | `{ "position": "MARKETING", "positionValue": value }` |
| `MARKETING` | Marketing (1 baris) | `MARKETING` | Marketing ID | – (level paling bawah) |

**Request body:** sama dengan [5.4 Ringkasan prospek](#54-ringkasan-prospek-total--jatuh-tempo) (`position`, `positionValue`, `sumbis`). Tidak menerima `page` / `pageSize`.

**Contoh — DIREKSI (rincian per Kanwil)**
```json
{
  "position": "DIREKSI",
  "positionValue": "",
  "sumbis": ""
}
```

**Response 200**
```json
{
  "success": true,
  "data": [
    { "value": "1",   "label": "Kanwil 1",                   "totalProspects": 60, "totalDue": 8, "totalDueToday": 2, "totalOverdue": 6 },
    { "value": "2",   "label": "Kanwil 2",                   "totalProspects": 40, "totalDue": 5, "totalDueToday": 1, "totalOverdue": 4 },
    { "value": "3",   "label": "Kanwil 3",                   "totalProspects": 20, "totalDue": 3, "totalDueToday": 1, "totalOverdue": 2 },
    { "value": "AND", "label": "Agency Network Development", "totalProspects": 7,  "totalDue": 1, "totalDueToday": 0, "totalOverdue": 1 },
    { "value": "AD",  "label": "Agency Development",         "totalProspects": 5,  "totalDue": 1, "totalDueToday": 1, "totalOverdue": 0 },
    { "value": "KP",  "label": "Kantor Pusat",               "totalProspects": 2,  "totalDue": 0, "totalDueToday": 0, "totalOverdue": 0 },
    { "value": null,  "label": "Tanpa Kanwil",               "totalProspects": 1,  "totalDue": 0, "totalDueToday": 0, "totalOverdue": 0 }
  ],
  "meta": { "groupBy": "KANWIL" }
}
```

**Contoh — PINWIL (rincian per Cabang di Kanwil 1)**
```json
{
  "position": "PINWIL",
  "positionValue": "1",
  "sumbis": ""
}
```

**Response 200**
```json
{
  "success": true,
  "data": [
    { "value": "102", "label": "BEKASI",  "totalProspects": 25, "totalDue": 3, "totalDueToday": 1, "totalOverdue": 2 },
    { "value": "101", "label": "JAKARTA", "totalProspects": 35, "totalDue": 5, "totalDueToday": 1, "totalOverdue": 4 }
  ],
  "meta": { "groupBy": "CABANG" }
}
```

**Contoh — PINCAB (rincian per Marketing di cabang 101)**
```json
{
  "position": "PINCAB",
  "positionValue": "101",
  "sumbis": ""
}
```

**Response 200**
```json
{
  "success": true,
  "data": [
    { "value": "MKT001", "label": "BUDI SANTOSO", "totalProspects": 20, "totalDue": 3, "totalDueToday": 1, "totalOverdue": 2 },
    { "value": "MKT002", "label": "SITI AMINAH",  "totalProspects": 15, "totalDue": 2, "totalDueToday": 0, "totalOverdue": 2 }
  ],
  "meta": { "groupBy": "MARKETING" }
}
```

**Contoh — MARKETING (marketing MKT001, sumbis SOB01)**
```json
{
  "position": "MARKETING",
  "positionValue": "MKT001",
  "sumbis": "SOB01"
}
```

**Response 200**
```json
{
  "success": true,
  "data": [
    { "value": "MKT001", "label": "BUDI SANTOSO", "totalProspects": 12, "totalDue": 2, "totalDueToday": 1, "totalOverdue": 1 }
  ],
  "meta": { "groupBy": "MARKETING" }
}
```

**Field `data[]`**

| Field | Tipe | Keterangan |
|---|---|---|
| `value` | string atau null | Kode grup (lihat tabel level). `null` = prospek yang tidak punya Kanwil / cabang / marketing |
| `label` | string | Teks yang ditampilkan. Tidak pernah `null` |
| `totalProspects` | number | Total prospek di grup ini |
| `totalDue` | number | Prospek jatuh tempo (= `totalDueToday` + `totalOverdue`) |
| `totalDueToday` | number | Follow-up effort terakhir **hari ini** |
| `totalOverdue` | number | Follow-up effort terakhir **sudah lewat** |

**Field `meta`**

| Field | Keterangan |
|---|---|
| `groupBy` | Level rincian: `KANWIL`, `CABANG`, atau `MARKETING` |

**Aturan data**
- Jumlah semua baris = angka [5.4 Ringkasan prospek](#54-ringkasan-prospek-total--jatuh-tempo) untuk body yang sama. Karena itu, pada level Kanwil kode di luar mapping resmi (mis. `KP`) **tetap ditampilkan**. `KP` diberi label `Kantor Pusat`; kode lain yang tidak dikenal memakai label = kodenya.
- Label Kanwil diambil dari mapping resmi; label cabang dari nama cabang; label marketing dari nama marketing. Jika nama kosong, label = `value`.
- Baris dengan `value: null` diberi label `Tanpa Kanwil` / `Tanpa Cabang` / `Tanpa Marketing` dan tidak bisa di-drill-down.
- Urutan: level Kanwil mengikuti mapping (Kanwil 1, 2, 3, AND, AD), lalu kode lain, lalu `Tanpa Kanwil`. Level Cabang / Marketing diurutkan berdasarkan `label`.

**Query**

```sql
WITH LAST_EFFORT AS ( ... sama dengan 5.4 ... )
SELECT <kolom grup>      AS GROUPVALUE,
       <nama grup>       AS GROUPLABEL,
       COUNT(*) AS TOTAL_PROSPECTS,
       COUNT(CASE WHEN E.FOLLOWUPDATE < TRUNC(SYSDATE) + 1 THEN 1 END) AS TOTAL_DUE,
       COUNT(CASE WHEN E.FOLLOWUPDATE >= TRUNC(SYSDATE)
                   AND E.FOLLOWUPDATE <  TRUNC(SYSDATE) + 1 THEN 1 END) AS TOTAL_DUE_TODAY,
       COUNT(CASE WHEN E.FOLLOWUPDATE < TRUNC(SYSDATE) THEN 1 END) AS TOTAL_OVERDUE
FROM POOLDATA.T_MATRIX_DISTRIBUTION M
LEFT JOIN LAST_EFFORT E
       ON M.IDPEGA = 'ASM-FW-GISFW-WORK ' || E.IDPEGA
      AND E.RN = 1
LEFT JOIN POOLDATA.BRANCH B
       ON B.ID = M.BRANCHCODE
WHERE 1 = 1
  -- filter position & sumbis sama dengan 5.4
GROUP BY <kolom grup>
```

| Level | `<kolom grup>` | `<nama grup>` |
|---|---|---|
| Kanwil | `B.BRANCHMATRIXDISTRIBUTION` | (label dari mapping resmi, diisi di service) |
| Cabang | `M.BRANCHCODE` | `MAX(B.BRANCHNAME)` |
| Marketing | `M.MARKETINGID` | `MAX(M.MARKETINGNAME)` |

**Error:** lihat [bagian 3](#error). Error database: `500 failed to load prospect breakdown`.

---

## 6. Endpoint lain

### 6.1 Health check

Mengecek server berjalan dan database bisa diakses.

```
GET /healthz
```

**Response 200**
```json
{ "success": true, "data": { "status": "ok" } }
```

**Response 503**
```json
{ "success": false, "message": "database unavailable" }
```

---

## 7. Cara mencoba

### Browser / Postman
Endpoint GET bisa langsung dibuka di browser:
```
http://192.168.10.97:8080/api/v1/matrix/kanwils
http://192.168.10.97:8080/healthz
```

Untuk POST di Postman: pilih method **POST**, tab **Body** → **raw** → **JSON**, lalu isi body.

### PowerShell
```powershell
$body = @{ kanwil = "1" } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "http://192.168.10.97:8080/api/v1/matrix/branches" `
  -ContentType "application/json" -Body $body | ConvertTo-Json -Depth 5

$body = @{ position = "PINWIL"; positionValue = "1"; page = 1; pageSize = 20 } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "http://192.168.10.97:8080/api/v1/matrix/prospects/due" `
  -ContentType "application/json" -Body $body | ConvertTo-Json -Depth 5
```

### curl (Git Bash / Linux / macOS)
```bash
curl -X POST "http://192.168.10.97:8080/api/v1/matrix/branches" \
  -H "Content-Type: application/json" \
  -d '{"kanwil":"1"}'

curl -X POST "http://192.168.10.97:8080/api/v1/matrix/prospects/due" \
  -H "Content-Type: application/json" \
  -d '{"position":"PINWIL","positionValue":"1","page":1,"pageSize":20}'
```

---

## 8. Catatan & batasan

| Topik | Keterangan |
|---|---|
| Contoh data | Semua nilai contoh (`101`, `MKT001`, `SOB01`, nama, angka) hanya ilustrasi |
| Format tanggal | Contoh tanggal belum final; format asli mengikuti output database dan akan dikonfirmasi |
| Tipe data | Field data prospek dikirim sebagai string (termasuk angka seperti `gpw`, `npw`). Field jumlah (`total...`) pada 5.4 dan 5.5 berupa number |
| Autentikasi | Belum ada. Cakupan data ditentukan dari `position` di body request |
| Pencarian nama | `branchName` / `marketingName` mencari teks yang terkandung; karakter `%` dan `_` dianggap huruf biasa |
