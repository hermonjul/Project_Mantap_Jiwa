function viewNasional() {
  const scope = {}
  const r = DATA.ringkas(scope)
  const hari = DATA.hariIni
  const mingguan = DATA.weekly(DATA.ALL_MO, 'npw').slice(-12)
  const unitRows = unitStats().sort((a, b) => b.r.mtd.npw - a.r.mtd.npw)
  const maxUnit = Math.max(...unitRows.map((x) => x.r.mtd.npw), 1)
  const prod = DATA.kanalProduksi(scope)

  const stats = INS.effortIndex(INS.cabangStat(null))
  const titik = stats.map((s) => ({
    id: s.b.id, label: s.b.name,
    short: s.b.name.length > 18 ? s.b.name.slice(0, 17) + '.' : s.b.name,
    x: s.eIdx, y: s.capaian, r: Math.max(1, s.r.mtd.npw),
  }))
  const prosNas = DATA.prospek(scope, saring())

  return [
    bandRingkas(scope, {
      judul: 'Ringkasan nasional',
      catatan: `Data sampai ${DATA.FMT.tgl(hari.iso)}, mencakup ${ORG.JUMLAH_CABANG} cabang pada tiga Kantor Wilayah.`,
    }),

    bandTindakan(scope, {
      daftar: ORG.UNITS.map((u) => ({ id: u.id, nama: u.name, sub: `${ORG.branchesOf(u.id).length} cabang`, scope: { unit: u.id } })),
      kolom: 'Kantor Wilayah',
      judul: 'Distribusi beban tindak lanjut',
      gotoAttr: 'data-goto-unit',
      tampilCabang: true,
    }),

    bandProyeksi(scope),

    bandOrangKunci(scope),
    bandMoTurun(scope),

    band('Kinerja', `
      <div class="grid grid--3">${unitRows.map((x) => {
        const pk = DATA.kanalProduksi({ unit: x.u.id })
        const porsi = (id) => pk
          ? DATA.FMT.pct(pk.filter((k) => k.kanal === id).reduce((sum, k) => sum + k.porsi, 0))
          : 'menunggu data'
        return card(`
          ${stat('Produksi bulan berjalan', DATA.FMT.rp(x.r.mtd.npw), {
            foot: `${DATA.FMT.pct(x.r.mtd.npw / Math.max(r.mtd.npw, 1))} kontribusi nasional`,
            spark: CH.bar(x.r.capaian),
          })}
          <div class="kw-card__meta"><span>Beban prospek telat</span><strong>${DATA.FMT.pct(x.r.ytd.rasio_beban)}</strong></div>
          <div class="kw-card__meta"><span>Direct</span><strong>${porsi('DIRECT')}</strong></div>
          <div class="kw-card__meta"><span>Captive</span><strong>${porsi('CAPTIVE')}</strong></div>`,
          { judul: esc(x.u.name), sub: `${ORG.branchesOf(x.u.id).length} cabang` })
      }).join('')}</div>
      ${kartuYoY(scope)}
      ${card(`
        <div class="tbl-wrap"><table class="tbl tbl--click">
          <thead><tr>
            <th></th><th>Kantor Wilayah</th><th class="r">Produksi ${esc(DATA.FMT.bulan(hari.month))}</th><th>Porsi</th>
            <th class="r">Capaian bulan</th><th class="r">Capaian tahun</th>
            <th class="r">Direct</th><th class="r">Captive</th>
            <th class="r">vs 2025</th><th class="r">Rasio beban</th>
          </tr></thead>
          <tbody>${unitRows.map((x, i) => {
            const pk = DATA.kanalProduksi({ unit: x.u.id })
            const porsi = (id) => pk
              ? DATA.FMT.pct(pk.filter((k) => k.kanal === id).reduce((s, k) => s + k.porsi, 0))
              : '<span class="hint">menunggu</span>'
            return `<tr data-goto-unit="${esc(x.u.id)}">
              <td class="tbl__rank">${i + 1}</td>
              <td><div class="tbl__name">${esc(x.u.name)}</div>
                  <div class="tbl__sub">${ORG.branchesOf(x.u.id).length} cabang, ${x.nMo} Marketing Officer</div></td>
              <td class="r">${DATA.FMT.rp(x.r.mtd.npw)}</td>
              <td>${CH.bar(x.r.mtd.npw / maxUnit)}</td>
              <td class="r">${badgeCapaian(x.r.capaian)}</td>
              <td class="r">${badgeCapaian(x.r.capaianYtd)}</td>
              <td class="r">${porsi('DIRECT')}</td>
              <td class="r">${porsi('CAPTIVE')}</td>
              <td class="r">${(() => { const yu = DATA.yoy({ unit: x.u.id }); return yu && yu.yoy !== null ? CH.delta(yu.yoy) : KOSONG })()}</td>
              <td class="r">${DATA.FMT.pct(x.r.ytd.rasio_beban)}</td>
            </tr>`
          }).join('')}</tbody></table></div>
        <p class="hint">${prod
          ? 'Kolom Direct dan Captive bersumber dari export eReport per channel, diterapkan sebagai komposisi terhadap NWP tiap cabang.'
          : 'Kolom Direct dan Captive terisi setelah export produksi per channel masuk.'}
        Cakupan file baru meliputi jaringan cabang. Divisi seperti MBU, Health Insurance, dan
        Commercial Lines menyusul begitu datanya dilampirkan.</p>`,
        { kelas: 'card--flush', judul: 'Posisi Kantor Wilayah',
          sub: 'Produksi, capaian, komposisi channel, dan effort dalam satu baris',
          alat: `<button class="btn btn--ghost" data-export="unit">Download Excel</button>`, tone: 'hijau' })}
      ${card(CH.barTarget(mingguan, labelMingguTerakhir(12), r.targetHarian * 7, { fmt: (v) => DATA.FMT.rp(v) }),
        { judul: 'Produksi 12 minggu terakhir', sub: 'Garis emas menunjukkan target mingguan', tone: 'biru' })}`),

    band('AI Insight', card(insightList(INS.untukLingkup(scope, saring())) + DISCLAIM,
      { kelas: 'card--navy card--insight', judul: 'Temuan otomatis', sub: 'Disusun dari aturan atas data yang tersedia' })),

    rincian('Detail dan latar belakang', 'Peta integrasi, komposisi sub-channel, kuadran produksi terhadap effort, dan ringkasan kumulatif', `
      <div class="grid grid--2a">
        ${card(CH.kuadran(titik, { onClickAttr: 'data-goto-branch' }) +
          `<p class="hint hint--why">Sumbu tegak bersumber dari eReport dan sumbu datar dari Matrix
           Distribution. Selama kedua data berada pada aplikasi terpisah, pemetaan seperti ini tidak
           dapat dibuat.</p>`,
          { judul: 'Produksi terhadap effort', sub: 'Semua cabang, bulan berjalan', tone: 'biru' })}
        ${card(kanalRinci(scope), { kelas: 'card--flush', judul: 'Komposisi tujuh sub-channel', sub: 'Pipeline dan produksi', tone: 'hijau' })}
      </div>
      ${card(CH.petaIntegrasi() +
        `<p class="hint hint--why">Tahap pertama menggabungkan eReport sebagai sumber produksi dan
         Pega ASMPro sebagai sumber effort. Aplikasi lain seperti HCC, HCQ, Optimalisasi Treaty,
         serta Cashbank dan eCashier menyusul pada tahap berikutnya, tanpa mengubah cara pengguna
         mengaksesnya.</p>`,
        { judul: 'Kedudukan dashboard ini di dalam Uniport', sub: 'Sumber data, portal, dan pengguna', tone: 'ungu' })}
      <div class="grid grid--2">
        ${card(CH.funnel(ORG.STATUS.map((tp) => ({ l: tp, v: prosNas.filter((p) => p.status === tp).length }))),
          { judul: 'Funnel prospek', sub: `${DATA.FMT.n(prosNas.length)} prospek tercatat`, tone: 'biru' })}
        ${card(`<div class="grid grid--2">
            ${stat('NWP tahun berjalan', DATA.FMT.rp(r.ytd.npw), { foot: `1 Januari sampai ${DATA.FMT.tgl(hari.iso)}` })}
            ${stat('Beban', DATA.FMT.rp(r.ytd.claim), { foot: `Rasio ${DATA.FMT.pct(r.ytd.rasio_beban)} terhadap premi` })}
            ${stat('Profit', DATA.FMT.rp(r.ytd.surplus), { foot: `Marjin ${DATA.FMT.pct(r.ytd.npw > 0 ? r.ytd.surplus / r.ytd.npw : 0)}` })}
            ${stat('Target satu tahun', DATA.FMT.rp(r.targetTahun), { foot: `Terealisasi ${DATA.FMT.pct(r.capaianTahun)}` })}
          </div>
          <p class="hint">Semua angka pada kartu ini bersumber dari file produksi. Beban dihitung
          dari selisih NWP dan profit, sehingga mencakup klaim dan biaya operasional.</p>`,
          { judul: 'Ringkasan kumulatif', sub: 'Penyajian yang selama ini menjadi tampilan utama', tone: 'emas' })}
      </div>`),
  ].join('')
}

/* ══════════════ TAMPILAN 2, PEMIMPIN WILAYAH ══════════════ */
