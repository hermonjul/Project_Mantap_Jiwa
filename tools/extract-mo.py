"""
extract-mo.py, menyusun src/data/mo.ts dan src/data/kanal.ts dari export Production
Longterm all kanwil untuk dua tahun.

Bentuk yang dibaca, hasil export pivot Flexmonster dengan kolom melebar:
    KANWIL | CABANG | SUB_PERWAKILAN | MO | AGENCY | BANKING | BROKER |
    CORPORATE | DIRECT | MULTIFINANCE | SMG

Berbeda dari export terdahulu yang memanjang, yaitu satu kolom NAMALEADER0
berisi nama kanal. Berkas ini memuat satu kolom per kanal, ditambah kolom MO.

Jalankan:
    python tools/extract-mo.py "<path 2025.xlsx>" "<path 2026.xlsx>"

KOMPOSISI, BUKAN NILAI ABSOLUT
  Berkas ini memakai basis ukur yang berbeda dari Produksi up to Juli 2026,
  yaitu 121,5 persen pada 2026. Karena itu yang diambil hanya porsi tiap
  Marketing Officer dan porsi tiap kanal, lalu diterapkan ke NWP 2026 cabang
  dari src/data/org.ts. Total per cabang tetap sama persis dengan berkas produksi
  sehingga rekonsiliasi tidak rusak.

  Nilai mentah kedua tahun tetap disimpan apa adanya untuk keperluan
  perbandingan tahun ke tahun, karena keduanya berasal dari sumber dan basis
  ukur yang sama sehingga sah dibandingkan satu sama lain.
"""
import io
import os
import re
import sys

import openpyxl

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_MO = os.path.join(ROOT, 'src', 'data', 'mo.ts')
OUT_KANAL = os.path.join(ROOT, 'src', 'data', 'kanal.ts')
ORG_JS = os.path.join(ROOT, 'src', 'data', 'org.ts')

# Urutan baku, dipakai di seluruh aplikasi.
SUB_KANAL = ['Direct', 'Corporate', 'Agency', 'Banking', 'Multifinance', 'Broker', 'Sinar Mas Group']
KOLOM_KANAL = ['DIRECT', 'CORPORATE', 'AGENCY', 'BANKING', 'MULTIFINANCE', 'BROKER', 'SMG']

ALIAS = {'PEKAN BARU': 'PEKANBARU'}

# Entri pada kolom MO yang bukan nama perorangan.
def bukan_orang(nama):
    u = nama.strip().upper()
    return u == '' or u == '(BLANK)' or u.startswith('RENEWAL') or u.startswith('TOTAL')


def norm(s):
    s = re.sub(r'[^A-Z0-9 ]', ' ', str(s).upper())
    return re.sub(r'\s+', ' ', s).strip()


def rapikan_nama(s):
    """Nama pada export ditulis kapital seluruhnya. Diubah ke huruf judul agar
    terbaca wajar di layar, dengan menjaga singkatan pendek tetap kapital."""
    kecil = {'BIN', 'BINTI', 'VAN', 'DE', 'DA'}
    keluar = []
    for kata in re.sub(r'\s+', ' ', str(s).strip()).split(' '):
        if not kata:
            continue
        inti = kata.strip('.')
        if len(inti) <= 2 and inti.isalpha() and kata.endswith('.'):
            keluar.append(kata.upper())
        elif inti.upper() in kecil:
            keluar.append(inti.lower())
        else:
            keluar.append(kata[0].upper() + kata[1:].lower())
    return ' '.join(keluar)


def baca_org():
    teks = io.open(ORG_JS, encoding='utf-8').read()
    blok = re.search(r'const BRANCHES_RAW(?:: any\[\])? = \[(.*?)\n\]', teks, re.S)
    if not blok:
        sys.exit('GAGAL: BRANCHES_RAW tidak ditemukan di src/data/org.ts. Jalankan extract-real.py dulu.')
    out = {}
    for baris in re.findall(r'\[(.*?)\]', blok.group(1)):
        p = [x.strip() for x in baris.split(',')]
        if len(p) < 8:
            continue
        try:
            nwp26 = float(p[7])
        except ValueError:
            continue
        nama = p[1].strip("'")
        out[norm(nama)] = {'kode': p[0].strip("'"), 'nama': nama, 'nwp26': nwp26}
    return out


def baca_pivot(path):
    """Kembalikan daftar (sub_perwakilan, nama_mo, [7 nilai kanal])."""
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    rows = list(wb.worksheets[0].iter_rows(values_only=True))
    wb.close()

    kepala = None
    for i, r in enumerate(rows[:10]):
        nilai = [norm(c) if c else '' for c in r]
        if 'MO' in nilai and 'CABANG' in nilai and 'SUB PERWAKILAN' in nilai:
            kepala = i
            break
    if kepala is None:
        sys.exit('GAGAL: baris kepala tidak dikenali pada %s' % os.path.basename(path))

    kol = {}
    for j, c in enumerate(rows[kepala]):
        if not c:
            continue
        n = norm(c)
        if n == 'SUB PERWAKILAN':
            kol['sub'] = j
        elif n in ('KANWIL', 'CABANG', 'MO'):
            kol[n.lower()] = j
        elif n in KOLOM_KANAL:
            kol[n] = j
    kurang = [k for k in KOLOM_KANAL if k not in kol]
    if kurang:
        sys.exit('GAGAL: kolom kanal tidak lengkap pada %s. Hilang: %s'
                 % (os.path.basename(path), ', '.join(kurang)))

    sub = None
    keluar = []
    for r in rows[kepala + 1:]:
        if r[kol['kanwil']]:
            sub = None
        if r[kol['cabang']]:
            sub = None
        if r[kol['sub']]:
            sub = str(r[kol['sub']]).strip()
        mo = r[kol['mo']]
        if not mo or not sub:
            continue
        mo = str(mo).strip()
        if mo.upper().startswith('TOTAL'):
            continue
        nilai = []
        for k in KOLOM_KANAL:
            v = r[kol[k]]
            nilai.append(float(v) if isinstance(v, (int, float)) else 0.0)
        keluar.append((sub, mo, nilai))
    return keluar


def main():
    if len(sys.argv) < 3:
        sys.exit('Pemakaian: python tools/extract-mo.py "<2025.xlsx>" "<2026.xlsx>"')
    p25, p26 = sys.argv[1], sys.argv[2]
    for p in (p25, p26):
        if not os.path.exists(p):
            sys.exit('GAGAL: berkas tidak ditemukan: %s' % p)

    org = baca_org()
    d25, d26 = baca_pivot(p25), baca_pivot(p26)

    # Kumpulkan per cabang. Kunci MO memakai nama yang sudah dinormalkan
    # supaya perbedaan spasi dan huruf besar tidak memecah orang yang sama.
    per = {}
    takCocok = set()

    def masuk(data, tahun):
        for sub, mo, nilai in data:
            kunci = norm(ALIAS.get(sub.upper(), sub))
            ref = org.get(kunci)
            if not ref:
                takCocok.add(sub)
                continue
            cab = per.setdefault(ref['kode'], {'ref': ref, 'mo': {}, 'lain': {'2025': [0.0] * 7, '2026': [0.0] * 7}})
            if bukan_orang(mo):
                for i, v in enumerate(nilai):
                    cab['lain'][tahun][i] += v
                continue
            km = norm(mo)
            ent = cab['mo'].setdefault(km, {'nama': rapikan_nama(mo), '2025': [0.0] * 7, '2026': [0.0] * 7})
            for i, v in enumerate(nilai):
                ent[tahun][i] += v

    masuk(d25, '2025')
    masuk(d26, '2026')

    if takCocok:
        print('CATATAN: %d unit pada export tidak punya padanan di berkas produksi dan dilewati:' % len(takCocok))
        for n in sorted(takCocok):
            print('  - %s' % n)
        print()

    # Susun keluaran.
    barisMo, barisKanal, barisPorsi = [], [], []
    ringkas = {'mo26': 0, 'mo25': 0, 'keluar': 0, 'baru': 0, 'tanpaKomposisi': []}
    totKanal25 = [0.0] * 7
    totKanal26 = [0.0] * 7

    for kode in sorted(per):
        cab = per[kode]
        ref = cab['ref']

        k25 = [cab['lain']['2025'][i] + sum(m['2025'][i] for m in cab['mo'].values()) for i in range(7)]
        k26 = [cab['lain']['2026'][i] + sum(m['2026'][i] for m in cab['mo'].values()) for i in range(7)]
        for i in range(7):
            totKanal25[i] += k25[i]
            totKanal26[i] += k26[i]

        # Komposisi kanal cabang, diterapkan ke NWP 2026.
        pos = [max(0.0, v) for v in k26]
        jum = sum(pos)
        if jum > 0:
            frac = [v / jum for v in pos]
            barisKanal.append("    %s: [%s]" % (repr(kode), ', '.join('%d' % round(ref['nwp26'] * f) for f in frac)))
            barisPorsi.append("    %s: [%s]" % (repr(kode), ', '.join('%.5f' % f for f in frac)))
        else:
            ringkas['tanpaKomposisi'].append(ref['nama'])

        # Marketing Officer yang tercatat pada 2026 dianggap aktif.
        aktif = [m for m in cab['mo'].values() if any(v != 0 for v in m['2026'])]
        keluar = [m for m in cab['mo'].values() if not any(v != 0 for v in m['2026']) and any(v != 0 for v in m['2025'])]
        ringkas['mo26'] += len(aktif)
        ringkas['mo25'] += len([m for m in cab['mo'].values() if any(v != 0 for v in m['2025'])])
        ringkas['keluar'] += len(keluar)
        ringkas['baru'] += len([m for m in aktif if not any(v != 0 for v in m['2025'])])

        aktif.sort(key=lambda m: -sum(m['2026']))
        isiMo = []
        for m in aktif:
            t25, t26 = sum(m['2025']), sum(m['2026'])
            isiMo.append("      ['%s', %d, %d, [%s]]"
                         % (m['nama'].replace("'", "\\'"), round(t25), round(t26),
                            ', '.join('%d' % round(v) for v in m['2026'])))
        # Yang tidak lagi tercatat pada 2026, disimpan untuk keperluan perbandingan.
        isiKeluar = ', '.join("['%s', %d]" % (m['nama'].replace("'", "\\'"), round(sum(m['2025'])))
                              for m in sorted(keluar, key=lambda m: -sum(m['2025']))[:20])

        barisMo.append(
            "  %s: {\n    p25: [%s],\n    p26: [%s],\n    mo: [\n%s\n    ],\n    keluar: [%s],\n  }"
            % (repr(kode),
               ', '.join('%d' % round(v) for v in k25),
               ', '.join('%d' % round(v) for v in k26),
               ',\n'.join(isiMo) if isiMo else '',
               isiKeluar))

    io.open(OUT_MO, 'w', encoding='utf-8').write(TEMPLATE_MO % {
        's25': os.path.basename(p25), 's26': os.path.basename(p26),
        'sub': ', '.join("'%s'" % s for s in SUB_KANAL),
        'cabang': len(barisMo), 'mo': ringkas['mo26'],
        'isi': ',\n'.join(barisMo),
    })
    io.open(OUT_KANAL, 'w', encoding='utf-8').write(TEMPLATE_KANAL % {
        'sumber': os.path.basename(p26),
        'sub': ', '.join("'%s'" % s for s in SUB_KANAL),
        'jumlah': len(barisKanal),
        'nwp': ',\n'.join(barisKanal),
        'porsi': ',\n'.join(barisPorsi),
    })

    t25, t26 = sum(totKanal25), sum(totKanal26)
    print('tertulis: %s' % OUT_MO)
    print('tertulis: %s' % OUT_KANAL)
    print()
    print('cabang berkomposisi kanal : %d dari %d' % (len(barisKanal), len(org)))
    print('Marketing Officer 2026    : %d' % ringkas['mo26'])
    print('Marketing Officer 2025    : %d' % ringkas['mo25'])
    print('  tidak tercatat lagi     : %d' % ringkas['keluar'])
    print('  baru pada 2026          : %d' % ringkas['baru'])
    if ringkas['tanpaKomposisi']:
        print('cabang tanpa komposisi    : %d %s' % (len(ringkas['tanpaKomposisi']), ringkas['tanpaKomposisi']))
    print()
    print('%-18s %12s %12s %9s' % ('KANAL', '2025', '2026', 'PERUBAHAN'))
    for i, s in enumerate(SUB_KANAL):
        d = (totKanal26[i] / totKanal25[i] - 1) * 100 if totKanal25[i] else 0
        print('%-18s %10.1f M %10.1f M %8.1f%%' % (s, totKanal25[i] / 1e9, totKanal26[i] / 1e9, d))
    print('%-18s %10.1f M %10.1f M %8.1f%%' % ('TOTAL', t25 / 1e9, t26 / 1e9, (t26 / t25 - 1) * 100))


TEMPLATE_MO = u'''/* ═════════════════════════════════════════════════════════════
   mo.js, Marketing Officer dan produksi dua tahun per kanal.

   BERKAS INI DIHASILKAN OTOMATIS. Jangan disunting langsung.
   Sumber: %(s25)s dan %(s26)s
   Pembuat: tools/extract-mo.py

   Berisi nama Marketing Officer yang sebenarnya beserta angka
   kinerjanya. Berkas dan hasil buildnya bersifat rahasia internal
   dan tidak untuk diedarkan ke luar perusahaan.

   Nilai p25 dan p26 adalah angka mentah dari export, dipakai hanya
   untuk perbandingan antar tahun karena keduanya berasal dari sumber
   dan basis ukur yang sama. Untuk nilai produksi yang ditampilkan,
   aplikasi memakai porsi tiap Marketing Officer terhadap cabangnya,
   lalu menerapkannya ke NWP 2026 pada berkas produksi.

   Bentuk tiap Marketing Officer: [nama, total 2025, total 2026, [7 kanal 2026]]
   Bentuk tiap entri keluar     : [nama, total 2025]
   ═════════════════════════════════════════════════════════════ */

const MO_DATA: any = {
  urutan: [%(sub)s],
  jumlahCabang: %(cabang)d,
  jumlahMO: %(mo)d,
  cabang: {
%(isi)s
  },
}
'''

TEMPLATE_KANAL = u'''/* ═════════════════════════════════════════════════════════════
   kanal.js, produksi per kanal distribusi.

   BERKAS INI DIHASILKAN OTOMATIS. Jangan disunting langsung.
   Sumber: %(sumber)s
   Pembuat: tools/extract-mo.py

   Yang diambil dari berkas sumber hanya KOMPOSISI per cabang, karena
   basis ukurnya berbeda dari berkas produksi. Persentase tersebut lalu
   diterapkan ke NWP 2026 masing-masing cabang, sehingga totalnya tetap
   sama persis dengan berkas produksi.
   ═════════════════════════════════════════════════════════════ */

const KANAL_DATA: any = {
  urutan: [%(sub)s],
  jumlahCabang: %(jumlah)d,
  metode: 'komposisi dari export eReport, diterapkan ke NWP 2026',
  nwp: {
%(nwp)s
  },
  porsi: {
%(porsi)s
  },
}
'''

if __name__ == '__main__':
    main()
