function viewMO(moId) {
  const scope = { mo: moId }
  const mo = DATA.MOS.find((m) => m.id === moId)
  const b = ORG.branchById(mo.branch)
  const u = ORG.unitById(mo.unit)
  const r = DATA.ringkas(scope)
  const dk = DATA.daftarKerja(scope, saring())
  const t = DATA.idxHariIni
  const mi = DATA.MO_IDX.get(moId)

  const streak = []
  const hari30 = DATA.DAYS.slice(t - 29, t + 1)
  for (let d = t - 29; d <= t; d++) {
    const a = DATA.agg([mi], d, d, `d:mo:${moId}:${d}`)
    streak.push(a.kunjungan + a.telp + a.penawaran + a.follow_up)
  }
  const aktivitas = ORG.AKTIVITAS.map((a) => ({
    ...a, n: r.mtd[a.id],
    c: { kunjungan: 'var(--s1)', penawaran: 'var(--s2)', follow_up: 'var(--s3)', telp: 'var(--s5)' }[a.id],
  }))
  const maxAkt = Math.max(...aktivitas.map((x) => x.n), 1)

  return [
    band(`Ringkasan ${esc(mo.nama)}`, `
      <div class="grid grid--3">
        ${card(stat('Perlu tindakan hari ini', DATA.FMT.n(dk.perluTindakan.length), {
          foot: `${DATA.FMT.n(dk.bucket.lewat.length)} sudah lewat tempo · potensi ${DATA.FMT.rp(dk.nilaiPerluTindakan)}`,
          spark: `<span class="hint">Dari ${DATA.FMT.n(dk.aktif.length)} prospek aktif.</span>`,
        }), { kelas: 'card--navy' })}
        ${card(stat('Produksi bulan berjalan', DATA.FMT.rp(r.mtd.npw), {
          foot: `${badgeCapaian(r.capaian)} terhadap target ${DATA.FMT.rp(r.targetMtd)}`,
          spark: CH.bar(r.capaian, r.capaian >= 1 ? 'mini-bar--pos' : 'mini-bar--warn'),
        }), { tone: 'biru' })}
        ${card(mo.yoy === null || mo.yoy === undefined
          ? stat('Aktivitas bulan berjalan', DATA.FMT.n(r.mtd.kunjungan + r.mtd.telp + r.mtd.penawaran + r.mtd.follow_up), {
            foot: `${DATA.FMT.n(r.mtd.kunjungan)} kunjungan · ${DATA.FMT.n(r.mtd.penawaran)} penawaran`,
          })
          : stat('Rata-rata saya vs tahun lalu', DATA.FMT.pctSigned(mo.yoy, 1), {
            foot: `${DATA.FMT.rp(mo.p25 / DATA.BULAN_P25)} menjadi ${DATA.FMT.rp(mo.p26 / DATA.BULAN_P26)} per bulan`,
            spark: `<span class="hint">${DATA.FMT.n(r.mtd.kunjungan + r.mtd.telp + r.mtd.penawaran + r.mtd.follow_up)} aktivitas bulan ini, konversi ${DATA.FMT.pct(r.mtd.prospek_baru > 0 ? r.mtd.terbit / r.mtd.prospek_baru : 0, 1)}.</span>`,
          }), { tone: mo.yoy >= 0 ? 'hijau' : 'merah' })}
      </div>`, { note: `${esc(mo.kode)} · ${esc(b.name)} · ${esc(u.short)}` }),

    band('Daftar kerja saya', `
      ${kartuBucket(dk)}
      ${card(tabelKerja(dk, { batas: 40, tampilMO: false }),
        { kelas: 'card--flush', judul: 'Semua prospek aktif, diurutkan berdasarkan prioritas',
          sub: 'Urutan dihitung dari status prospek, nilai premi, dan lama keterlambatan',
          alat: `<button class="btn btn--primary" data-export="kerja">Download Excel</button>`, tone: 'merah' })}`,
      { note: 'Batas waktu tindak lanjut: Hot 3 hari, Warm 7 hari, Cold 14 hari. Angka ini masih usulan dan perlu disepakati.', why: true }),

    band('Ritme kerja', `
      ${card(CH.barAktivitas(streak, hari30) + CH.ringkasAktivitas(streak, hari30) +
        `<p class="hint">Tinggi batang adalah jumlah aktivitas pada hari itu. Batang biru muda
         adalah akhir pekan dan hari libur. <b>Garis merah tipis di dasar grafik</b> menandai hari
         kerja yang sama sekali tidak ada aktivitasnya.</p>`,
        { judul: 'Aktivitas 30 hari terakhir', sub: 'Kunjungan, telepon, penawaran, dan follow up digabung', tone: 'biru' })}
      <div class="grid grid--2">
        ${card(`<div class="funnel">${aktivitas.map((a) => `
            <div class="funnel__row">
              <span class="funnel__lbl">${esc(a.label)}</span>
              <span class="funnel__bar"><i style="width:${((a.n / maxAkt) * 100).toFixed(1)}%;background:${a.c}"></i></span>
              <span class="funnel__n">${DATA.FMT.n(a.n)}</span><span class="funnel__drop"></span></div>`).join('')}</div>
          <p class="hint">Bobot indeks effort: kunjungan 3, penawaran 2,5, follow up 1,5, telepon 1.
          <b>Bobot ini masih usulan</b> dan perlu disepakati dulu sebelum dipakai menilai orang.</p>`,
          { judul: 'Komposisi aktivitas', sub: 'Bulan berjalan', tone: 'hijau' })}
        ${card(kanalRinci(scope), { kelas: 'card--flush', judul: 'Channel portofolio saya', sub: 'Pipeline per sub-channel', tone: 'emas' })}
      </div>`),
  ].join('')
}

/* ══════════════ Kerangka, navigasi, peran, penyaring ══════════════ */
