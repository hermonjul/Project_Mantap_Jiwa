function viewUnit(unitId) {
  const scope = { unit: unitId }
  const u = ORG.unitById(unitId)
  const r = DATA.ringkas(scope)
  const stats = INS.effortIndex(INS.cabangStat(unitId)).sort((a, b) => b.r.mtd.npw - a.r.mtd.npw)
  const maxProd = Math.max(...stats.map((s) => s.r.mtd.npw), 1)
  const prod = DATA.kanalProduksi(scope)

  const mingguTampil = 16
  const heatRows = stats.map((s) => {
    const set = DATA.MO_BY_BRANCH.get(s.b.id) || []
    const wp = DATA.weekly(set, 'npw').slice(-mingguTampil)
    const we = ORG.AKTIVITAS.map((a) => DATA.weekly(set, a.id).slice(-mingguTampil))
    return { label: s.b.name, vals: wp, noEffort: wp.map((_, i) => we.every((arr) => arr[i] === 0)) }
  })

  const t = DATA.idxHariIni
  const moRows = (DATA.MO_BY_UNIT.get(unitId) || []).map((mi) => {
    const mo = DATA.MOS[mi]
    const rr = DATA.ringkas({ mo: mo.id })
    const dkMo = DATA.daftarKerja({ mo: mo.id }, saring())
    const eff7 = []
    for (let d = t - 6; d <= t; d++) {
      const a = DATA.agg([mi], d, d, `d:mo:${mo.id}:${d}`)
      eff7.push(a.kunjungan + a.telp + a.penawaran + a.follow_up)
    }
    return { mo, rr, eff7, aktif: dkMo.aktif.length, lewat: dkMo.bucket.lewat.length }
  }).sort((a, b) => b.lewat - a.lewat || b.rr.mtd.npw - a.rr.mtd.npw)
  const maxEffMo = Math.max(...moRows.map((m) => m.rr.mtd.effort), 1)

  const prosUnit = DATA.prospek(scope, saring())
  const mapRows = ORG.MAPPING_KAT.map((k) => {
    const sub = prosUnit.filter((p) => p.mapKat === k)
    return {
      k, n: sub.length,
      terbit: sub.filter((p) => p.status === 'Terbit Polis').length,
      premi: sub.reduce((s, p) => s + p.premi, 0),
      rataFU: sub.length ? sub.reduce((s, p) => s + p.hariFU, 0) / sub.length : 0,
    }
  })

  return [
    bandRingkas(scope, {
      judul: `Ringkasan ${u.short}`,
      catatan: `${ORG.branchesOf(unitId).length} cabang, ${(DATA.MO_BY_UNIT.get(unitId) || []).length} Marketing Officer.`,
    }),

    bandTindakan(scope, {
      daftar: ORG.branchesOf(unitId).map((b) => ({ id: b.id, nama: b.name, sub: `Kelas ${b.kelas}, ${b.kota || b.prov}`, scope: { branch: b.id } })),
      kolom: 'Cabang',
      judul: 'Distribusi beban tindak lanjut per cabang',
      gotoAttr: 'data-goto-branch',
    }),

    bandProyeksi(scope),

    bandOrangKunci(scope),
    bandMoTurun(scope),

    band('Kinerja', `
      ${kartuYoY(scope)}
      ${card(`
        <div class="tbl-wrap tbl-wrap--tinggi"><table class="tbl tbl--click">
          <thead><tr>
            <th></th><th>Cabang</th><th class="c">Kelas</th><th class="r">Produksi bulan</th><th>Porsi</th>
            <th class="r">Capaian bulan</th><th class="r">Capaian tahun</th>
            <th class="r">Direct</th><th class="r">Captive</th>
            <th class="r">vs 2025</th><th class="r">Tanpa aktivitas</th>
          </tr></thead>
          <tbody>${stats.map((s, i) => {
            const pk = DATA.kanalProduksi({ branch: s.b.id })
            const porsi = (id) => pk
              ? DATA.FMT.pct(pk.filter((k) => k.kanal === id).reduce((a, k) => a + k.porsi, 0))
              : '<span class="hint">-</span>'
            return `<tr data-goto-branch="${esc(s.b.id)}">
              <td class="tbl__rank">${i + 1}</td>
              <td><div class="tbl__name">${esc(s.b.name)}</div><div class="tbl__sub">${esc(s.b.kota || s.b.prov)}</div></td>
              <td class="c"><span class="badge badge--mute">${esc(s.b.kelas)}</span></td>
              <td class="r">${DATA.FMT.rp(s.r.mtd.npw)}</td>
              <td>${CH.bar(s.r.mtd.npw / maxProd)}</td>
              <td class="r">${badgeCapaian(s.capaian)}</td>
              <td class="r">${badgeCapaian(s.r.capaianYtd)}</td>
              <td class="r">${porsi('DIRECT')}</td>
              <td class="r">${porsi('CAPTIVE')}</td>
              <td class="r">${(() => { const yb = DATA.yoy({ branch: s.b.id }); return yb && yb.yoy !== null ? CH.delta(yb.yoy) : KOSONG })()}</td>
              <td class="r">${s.diam >= 3 ? `<span class="badge badge--neg">${s.diam} hari</span>` : KOSONG}</td>
            </tr>`
          }).join('')}</tbody></table></div>
        <p class="hint hint--why">Semua cabang tercantum, digulir di dalam tabel agar halaman tetap ringkas.
        Sesuai masukan Kantor Wilayah 1, kolom capaian sampai dengan effort disajikan pada satu tabel. Kolom tanpa aktivitas menghitung hari kerja berturut-turut tanpa
        satu pun input pada Matrix Distribution.
        ${prod ? '' : 'Kolom Direct dan Captive menunggu export produksi per channel.'}</p>`,
        { kelas: 'card--flush', judul: `${ORG.branchesOf(unitId).length} cabang pada ${esc(u.short)}`,
          sub: 'Klik baris untuk buka detail cabang',
          alat: `<button class="btn btn--ghost" data-export="cabang">Download Excel</button>`, tone: 'hijau' })}

      ${card(`
        <div class="tbl-wrap tbl-wrap--tinggi"><table class="tbl tbl--click">
          <thead><tr>
            <th></th><th>Marketing Officer</th><th>Cabang</th><th class="r">Produksi bulan</th>
            <th class="r">vs 2025</th><th>Aktivitas tujuh hari</th>
            <th class="r">Prospek aktif</th><th class="r">Lewat tempo</th>
          </tr></thead>
          <tbody>${moRows.map((m, i) => `
            <tr data-goto-mo="${esc(m.mo.id)}">
              <td class="tbl__rank">${i + 1}</td>
              <td><div class="tbl__name">${esc(m.mo.nama)}</div><div class="tbl__sub">${esc(m.mo.kode)}</div></td>
              <td><span class="tbl__sub">${esc(ORG.branchById(m.mo.branch).name)}</span></td>
              <td class="r">${DATA.FMT.rp(m.rr.mtd.npw)}</td>
              <td class="r">${m.mo.yoy === null || m.mo.yoy === undefined ? KOSONG : CH.delta(m.mo.yoy)}</td>
              <td>${CH.miniSeries(m.eff7)}</td>
              <td class="r">${DATA.FMT.n(m.aktif)}</td>
              <td class="r">${m.lewat ? `<span class="badge badge--neg">${m.lewat}</span>` : KOSONG}</td>
            </tr>`).join('')}</tbody></table></div>
        <p class="hint hint--why">Kantor Wilayah 2 melaporkan Marketing Officer hanya terhubung kepada
        Pimpinan Cabang sehingga <b>Pemimpin Wilayah tidak dapat memantau matrix yang dimaksud</b>.
        Tabel ini menyatukan semua Marketing Officer dalam satu wilayah, diurutkan berdasarkan jumlah
        prospek yang sudah lewat tempo.</p>`,
        { kelas: 'card--flush', judul: `${moRows.length} Marketing Officer`,
          sub: 'Lintas cabang dalam satu wilayah', tone: 'biru' })}`),

    band('AI Insight', card(insightList(INS.untukLingkup(scope, saring())) + DISCLAIM,
      { kelas: 'card--navy card--insight', judul: `Temuan untuk ${esc(u.short)}`, sub: 'Disusun otomatis berdasarkan aturan' })),

    rincian('Detail dan latar belakang', 'Peta aktivitas mingguan, komposisi sub-channel, kategori bisnis, dan komposisi nilai premi', `
      ${card(CH.heatmap(heatRows, labelMingguTerakhir(mingguTampil)) +
        `<p class="hint">Intensitas warna menunjukkan besaran produksi. Bingkai putus-putus menandakan
         minggu tanpa satu pun aktivitas yang terekam.</p>`,
        { judul: `Peta aktivitas ${mingguTampil} minggu terakhir`, sub: 'Matriks cabang terhadap minggu', tone: 'biru' })}
      <div class="grid grid--2">
        ${card(kanalRinci(scope), { kelas: 'card--flush', judul: 'Komposisi tujuh sub-channel', sub: 'Pipeline dan produksi', tone: 'hijau' })}
        ${card(CH.stack(statusPremi(prosUnit)) + CH.legend(statusPremi(prosUnit).map((s) => ({ ...s, n: DATA.FMT.rpShort(s.v) }))),
          { judul: 'Premi per status', sub: 'Terbit polis, dalam proses, pending dan close', tone: 'emas' })}
      </div>
      ${card(`
        <div class="tbl-wrap"><table class="tbl">
          <thead><tr><th>Kategori</th><th class="r">Prospek</th><th>Progres terbit polis</th>
          <th class="r">Terbit</th><th class="r">Potensi premi</th><th class="r">Rata-rata jeda follow up</th></tr></thead>
          <tbody>${mapRows.map((m) => `
            <tr>
              <td class="tbl__name">${esc(m.k)}</td>
              <td class="r">${DATA.FMT.n(m.n)}</td>
              <td>${CH.bar(m.n ? m.terbit / m.n : 0, m.n && m.terbit / m.n > 0.2 ? 'mini-bar--pos' : '')}</td>
              <td class="r">${DATA.FMT.n(m.terbit)}</td>
              <td class="r">${DATA.FMT.rp(m.premi)}</td>
              <td class="r">${m.rataFU > 12 ? `<span class="badge badge--warn">${m.rataFU.toFixed(0)} hari</span>` : `${m.rataFU.toFixed(0)} hari`}</td>
            </tr>`).join('')}</tbody></table></div>
        <p class="hint hint--why">Sesuai masukan Kantor Wilayah 1 dan 2 mengenai Mapping dan Extension
        Business, dan indikator progres dan jeda tindak lanjut.</p>`,
        { kelas: 'card--flush', judul: 'Mapping dan Extension Business', sub: 'Progres dan jeda tindak lanjut', tone: 'emas' })}`),
  ].join('')
}

/* ══════════════ TAMPILAN 3, PIMPINAN CABANG ══════════════ */
