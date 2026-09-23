function viewBranch(branchId) {
  const scope = { branch: branchId }
  const b = ORG.branchById(branchId)
  const u = ORG.unitById(b.unit)
  const r = DATA.ringkas(scope)
  const t = DATA.idxHariIni
  const set = DATA.MO_BY_BRANCH.get(branchId) || []

  const moRows = set.map((mi) => {
    const mo = DATA.MOS[mi]
    const rr = DATA.ringkas({ mo: mo.id })
    const dkMo = DATA.daftarKerja({ mo: mo.id }, saring())
    const eff7 = []
    for (let d = t - 6; d <= t; d++) {
      const a = DATA.agg([mi], d, d, `d:mo:${mo.id}:${d}`)
      eff7.push(a.kunjungan + a.telp + a.penawaran + a.follow_up)
    }
    return {
      mo, rr, eff7,
      aktif: dkMo.aktif.length,
      lewat: dkMo.bucket.lewat.length,
      hariIni: dkMo.bucket.hariIni.length,
      konversi: rr.mtd.prospek_baru > 0 ? rr.mtd.terbit / rr.mtd.prospek_baru : 0,
    }
  }).sort((a, b2) => b2.lewat - a.lewat || b2.rr.mtd.npw - a.rr.mtd.npw)

  const prosCab = DATA.prospek(scope, saring())
  const liniRows = ORG.LINI.map((l) => {
    const sub = prosCab.filter((p) => p.lini === l)
    const terbit = sub.filter((p) => p.status === 'Terbit Polis')
    const cross = prosCab.filter((p) => p.crossSell.includes(l))
    return {
      l, n: sub.length, terbit: terbit.length,
      premi: sub.reduce((s, p) => s + p.premi, 0),
      premiTerbit: terbit.reduce((s, p) => s + p.premi, 0),
      cross: cross.length,
      crossPremi: cross.reduce((s, p) => s + p.premi * 0.32, 0),
    }
  }).sort((a, b2) => b2.premi - a.premi)

  const anom = DATA.ANOMALI[branchId]

  return [
    bandRingkas(scope, {
      judul: `Ringkasan cabang ${b.name}`,
      catatan: `Kelas ${b.kelas}, ${b.kota || b.prov}, bagian dari ${u.short}. Rasio beban tahun berjalan ${DATA.FMT.pct(r.ytd.rasio_beban)}.`,
    }),

    bandTindakan(scope, {
      daftar: set.map((mi) => ({ id: DATA.MOS[mi].id, nama: DATA.MOS[mi].nama, sub: DATA.MOS[mi].kode, scope: { mo: DATA.MOS[mi].id } })),
      kolom: 'Marketing Officer',
      judul: 'Distribusi beban tindak lanjut per Marketing Officer',
      gotoAttr: 'data-goto-mo',
    }),

    bandProyeksi(scope),

    bandOrangKunci(scope),
    bandMoTurun(scope),

    band('Kinerja', `
      ${kartuYoY(scope)}
      ${card(`
        <div class="tbl-wrap"><table class="tbl tbl--click">
          <thead><tr>
            <th>Marketing Officer</th><th class="r">Produksi bulan</th><th class="r">Prospek aktif</th>
            <th class="r">Lewat tempo</th><th class="r">Hari ini</th>
            <th>Aktivitas tujuh hari</th><th class="r">vs 2025</th><th class="r">Konversi</th>
          </tr></thead>
          <tbody>${moRows.map((m) => `
            <tr data-goto-mo="${esc(m.mo.id)}">
              <td><div class="tbl__name">${esc(m.mo.nama)}</div><div class="tbl__sub">${esc(m.mo.kode)}</div></td>
              <td class="r">${DATA.FMT.rp(m.rr.mtd.npw)}</td>
              <td class="r">${DATA.FMT.n(m.aktif)}</td>
              <td class="r">${m.lewat ? `<span class="badge badge--neg">${m.lewat}</span>` : KOSONG}</td>
              <td class="r">${m.hariIni || KOSONG}</td>
              <td>${CH.miniSeries(m.eff7)}</td>
              <td class="r">${m.mo.yoy === null || m.mo.yoy === undefined ? KOSONG : CH.delta(m.mo.yoy)}</td>
              <td class="r">${DATA.FMT.pct(m.konversi, 1)}</td>
            </tr>`).join('')}</tbody></table></div>
        <p class="hint">Kolom aktivitas tujuh hari memakai batang harian, sehingga rangkaian batang
        kosong menunjukkan tidak adanya aktivitas sama sekali, bukan aktivitas yang rendah.</p>`,
        { kelas: 'card--flush', judul: `${moRows.length} Marketing Officer`,
          sub: 'Diurutkan berdasarkan jumlah prospek yang sudah lewat tempo',
          alat: `<button class="btn btn--ghost" data-export="mo">Download Excel</button>`, tone: 'biru' })}

      ${card(`
        <div class="tbl-wrap"><table class="tbl">
          <thead><tr><th>Lini usaha (COB)</th><th class="r">Prospek</th><th>Progres terbit polis</th>
          <th class="r">Terbit</th><th class="r">Potensi premi</th><th class="r">Premi terbit</th>
          <th class="r">Peluang cross selling</th></tr></thead>
          <tbody>${liniRows.map((l) => `
            <tr>
              <td class="tbl__name">${esc(l.l)}</td>
              <td class="r">${DATA.FMT.n(l.n)}</td>
              <td>${CH.bar(l.n ? l.terbit / l.n : 0, l.n && l.terbit / l.n > 0.2 ? 'mini-bar--pos' : '')}</td>
              <td class="r">${DATA.FMT.n(l.terbit)}</td>
              <td class="r">${DATA.FMT.rp(l.premi)}</td>
              <td class="r">${DATA.FMT.rp(l.premiTerbit)}</td>
              <td class="r">${l.cross ? `${DATA.FMT.n(l.cross)} nasabah, ${DATA.FMT.rp(l.crossPremi)}` : KOSONG}</td>
            </tr>`).join('')}</tbody></table></div>
        <p class="hint hint--why">Sesuai masukan Kantor Wilayah 1, penyajian dimulai dari nasabah,
        dilanjutkan lini usaha yang telah dimiliki, kemudian nominalnya. Kolom terakhir menghitung
        nasabah yang sesuai untuk lini itu tapi belum punya.</p>`,
        { kelas: 'card--flush', judul: 'Distribusi lini usaha', sub: 'Termasuk potensi upselling dan cross selling', tone: 'hijau' })}`),

    band('AI Insight', card(insightList(INS.untukCabang(branchId, saring())) + DISCLAIM,
      { kelas: 'card--navy card--insight', judul: `Temuan untuk ${esc(b.name)}`, sub: `Bagian dari ${esc(u.short)}` })),

    rincian('Detail dan latar belakang', 'Komposisi sub-channel cabang dan pola simulasi yang ditanam', `
      ${card(kanalRinci(scope), { kelas: 'card--flush', judul: 'Komposisi tujuh sub-channel', sub: 'Pipeline dan produksi cabang', tone: 'hijau' })}
      ${anom ? card(`<p class="hint hint--why">Pada data simulasi, cabang ini sengaja diberi pola
        <b>${esc(labelAnomali(anom.jenis))}</b> agar contoh temuan AI Insight memiliki bahan pembahasan.
        Pola itu cuma memengaruhi angka effort dan prospek, tidak menyentuh angka produksi yang
        bersumber dari file Excel.</p>`, { judul: 'Catatan simulasi', tone: 'emas' }) : ''}`),
  ].join('')
}

function labelAnomali(j) {
  return {
    mati_suri: 'input effort terhenti',
    effort_boros: 'aktivitas tinggi dengan konversi rendah',
    satu_deal: 'produksi bertumpu pada satu penutupan besar',
    jatuh_wow: 'penurunan tajam pada minggu berjalan',
    bintang: 'aktivitas dan hasil meningkat bersamaan',
  }[j] || j
}

/* ══════════════ TAMPILAN 4, MARKETING OFFICER ══════════════ */
