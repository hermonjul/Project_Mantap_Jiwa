/* ═════════════════════════════════════════════════════════════════
   insights.js, mesin narasi berbasis aturan.

   Bukan LLM. Setiap kalimat dihasilkan aturan deterministik sehingga
   isinya dapat diperiksa dan tidak berubah antar sesi peragaan. Pada
   penerapan sebenarnya, lapisan inilah yang diganti model bahasa dengan
   review manusia sebelum ditindaklanjuti.

   Aturan disusun untuk menjelaskan penyebab, bukan mengulang angka yang
   sudah tampil pada kartu indikator. Keluaran dibatasi enam temuan
   teratas menurut tingkat kegentingan, supaya panelnya tetap terbaca.
   ═════════════════════════════════════════════════════════════════ */

const IK = {
  risk: `<svg viewBox="0 0 20 20"><path d="M10 3 2 17h16L10 3Z"/><path d="M10 8v4"/><path d="M10 14.5v.5"/></svg>`,
  warn: `<svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="7.5"/><path d="M10 6v5"/><path d="M10 13.5v.5"/></svg>`,
  good: `<svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="7.5"/><path d="m6.5 10 2.5 2.5L14 8"/></svg>`,
  info: `<svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="7.5"/><path d="M10 9v5"/><path d="M10 6.5v.5"/></svg>`,
}

const URUT_TONE = { risk: 0, warn: 1, good: 2, info: 3 }
const BATAS_TEMUAN = 8

/* Urutkan menurut kegentingan, namun sediakan satu tempat khusus untuk
   temuan kanal. Tanpa itu, temuan kanal selalu kalah oleh temuan bertingkat
   risiko dan dimensi yang justru ingin ditonjolkan tidak pernah muncul. */
function ringkasTemuan(out) {
  const urut = out
    .map((x, i) => ({ x, i }))
    .sort((a, b) => URUT_TONE[a.x.tone] - URUT_TONE[b.x.tone] || a.i - b.i)
    .map((o) => o.x)

  const pilih = urut.slice(0, BATAS_TEMUAN)
  /* Tiga dimensi ini selalu ingin ditampilkan, sehingga masing-masing diberi
     satu tempat bila belum terpilih menurut kegentingan. Tanpa penjagaan ini,
     temuan bertingkat risiko akan memenuhi seluruh panel dan dimensi yang
     justru diminta tidak pernah muncul. */
  let sisa = BATAS_TEMUAN - 1
  ;['proyeksi', 'yoy', 'kanal', 'orang'].forEach((grup) => {
    if (pilih.some((x) => x.grup === grup)) return
    const cari = urut.find((x) => x.grup === grup)
    if (cari && sisa >= 0) { pilih.splice(sisa, 1, cari); sisa-- }
  })
  return pilih
}

const INS = {
  /* Ringkasan per cabang untuk satu unit, atau seluruh cabang bila unit kosong. */
  cabangStat(unitId) {
    const daftar = unitId ? ORG.branchesOf(unitId) : ORG.BRANCHES
    const t = DATA.idxHariIni
    return daftar.map((b) => {
      const set = DATA.MO_BY_BRANCH.get(b.id) || []
      const key = 'br:' + b.id
      const r = DATA.ringkas({ branch: b.id })
      let diam = 0
      for (let d = t; d >= 0; d--) {
        if (DATA.DAYS[d].weekend || DATA.DAYS[d].libur) continue
        if (DATA.agg(set, d, d, `d:${key}:${d}`).effort > 0) break
        diam++
      }
      return {
        b, r, m7: r.m7, m7p: r.m7prev, diam,
        effortMtd: r.mtd.effort,
        konversi: r.mtd.prospek_baru > 0 ? r.mtd.terbit / r.mtd.prospek_baru : 0,
        capaian: r.capaian,
      }
    })
  },

  /* Indeks effort dinormalisasi. Nilai 100 persen setara rata-rata per Marketing Officer. */
  effortIndex(stats) {
    const perMo = stats.map((s) => {
      const n = (DATA.MO_BY_BRANCH.get(s.b.id) || []).length || 1
      return s.effortMtd / n
    })
    const rata = perMo.reduce((a, c) => a + c, 0) / (perMo.length || 1) || 1
    stats.forEach((s, i) => { s.eIdx = perMo[i] / rata })
    return stats
  },

  /* ══ Temuan tingkat nasional atau wilayah ══ */
  untukLingkup(scope: DataScope = {}, filter: DataFilter = {}) {
    const out = []
    const r = DATA.ringkas(scope)
    const stats = INS.effortIndex(INS.cabangStat(scope.unit || null))
    const acuan = scope.unit ? ORG.unitById(scope.unit).short : 'nasional'
    const dk = DATA.daftarKerja(scope, filter)

    /* 1. Penumpukan tindak lanjut, temuan utama pada susunan baru. */
    if (dk.bucket.lewat.length) {
      const perCabang: Record<string, number> = {}
      dk.bucket.lewat.forEach((p) => { perCabang[p.branch] = (perCabang[p.branch] || 0) + 1 })
      const teratas = Object.entries(perCabang).sort((a, b) => b[1] - a[1]).slice(0, 3)
      const porsi = dk.aktif.length ? dk.bucket.lewat.length / dk.aktif.length : 0
      const hot = dk.bucket.lewat.filter((p) => p.status === 'Hot').length
      out.push({
        tone: porsi > 0.3 ? 'risk' : 'warn',
        head: `${DATA.FMT.n(dk.bucket.lewat.length)} prospek melewati batas waktu tindak lanjut`,
        text: `Setara <b>${DATA.FMT.pct(porsi)}</b> dari semua prospek aktif, dengan potensi premi
          <b>${DATA.FMT.rp(dk.nilaiLewat)}</b>. Sebanyak ${DATA.FMT.n(hot)} di antaranya berstatus
          Hot yang batas waktunya hanya ${DATA.SLA_STATUS.Hot} hari. Penumpukan terbesar pada
          ${teratas.map(([id, n]) => `<b>${esc(ORG.branchById(id).name)}</b> (${n})`).join(', ')}.`,
        act: `Bagikan daftar prioritas ini kepada cabang yang dimaksud sebagai agenda pertama rapat mingguan.`,
      })
    }

    /* 2. Perbandingan antar channel. */
    const perKanal = ['DIRECT', 'CAPTIVE'].map((id) => {
      const list = DATA.prospek(scope, { kanal: id })
      const aktif = list.filter((p) => !p.selesai)
      const lewat = aktif.filter((p) => p.telat > 0)
      return {
        id, label: ORG.KANAL[id].label,
        n: list.length, aktif: aktif.length,
        lewat: lewat.length,
        porsiLewat: aktif.length ? lewat.length / aktif.length : 0,
        terbit: list.filter((p) => p.status === 'Terbit Polis').length,
        konversi: list.length ? list.filter((p) => p.status === 'Terbit Polis').length / list.length : 0,
        premi: list.reduce((s, p) => s + p.premi, 0),
      }
    })
    if (perKanal[0].aktif && perKanal[1].aktif) {
      const tertinggal = perKanal[0].porsiLewat > perKanal[1].porsiLewat ? perKanal[0] : perKanal[1]
      const lawan = tertinggal === perKanal[0] ? perKanal[1] : perKanal[0]
      const beda = tertinggal.porsiLewat - lawan.porsiLewat
      if (beda > 0.04) {
        out.push({
          tone: beda > 0.1 ? 'warn' : 'info',
          grup: 'kanal',
          head: `Channel ${tertinggal.label} paling banyak tertinggal tindak lanjutnya`,
          text: `<b>${DATA.FMT.pct(tertinggal.porsiLewat)}</b> prospek ${tertinggal.label} melewati batas
            waktu, dibanding <b>${DATA.FMT.pct(lawan.porsiLewat)}</b> pada ${lawan.label}. Porsi pipeline
            ${tertinggal.label} sendiri ${DATA.FMT.pct(tertinggal.premi / (tertinggal.premi + lawan.premi))}
            dari potensi premi ${acuan}, dengan konversi ${DATA.FMT.pct(tertinggal.konversi, 1)}
            berbanding ${DATA.FMT.pct(lawan.konversi, 1)}.`,
          act: `Periksa apakah perbedaan ini berasal dari beban kerja, ketersediaan personel, atau perbedaan proses pada kanal tersebut.`,
        })
      }
    }

    /* 3. Sub-kanal dengan tumpukan terbesar. */
    const pipe = DATA.kanalPipeline(scope, filter)
      .filter((x) => x.n > 10)
      .map((x) => {
        const aktif = DATA.prospek(scope, { subKanal: x.sub }).filter((p) => !p.selesai)
        const lewat = aktif.filter((p) => p.telat > 0)
        return { ...x, aktifN: aktif.length, lewatN: lewat.length, nilai: lewat.reduce((s, p) => s + p.premi, 0) }
      })
      .sort((a, b) => b.nilai - a.nilai)
    if (pipe.length && pipe[0].lewatN > 0) {
      const s0 = pipe[0]
      out.push({
        tone: 'info',
        grup: 'kanal',
        head: `Nilai tertahan terbesar berada pada sub-channel ${s0.sub}`,
        text: `<b>${DATA.FMT.rp(s0.nilai)}</b> potensi premi tertahan dari ${DATA.FMT.n(s0.lewatN)}
          prospek yang melewati batas waktu, dari ${DATA.FMT.n(s0.aktifN)} prospek aktif pada sub-channel
          ini. Berikutnya ${pipe.slice(1, 3).map((x) => `${esc(x.sub)} ${DATA.FMT.rp(x.nilai)}`).join(', ')}.`,
        act: `Sub-channel berperantara biasanya punya ritme tindak lanjut sendiri. Sesuaikan batas waktunya bila memang berbeda dari channel langsung.`,
      })
    }

    /* 3b. Proyeksi pencapaian target, pertanyaan utama Direksi. */
    const pr = DATA.proyeksi(scope, filter)
    if (pr.target > 0) {
      const perlu = (pr.target - pr.realisasi) / pr.sisaBulan
      const naik = perlu / pr.lajuBulanan - 1
      out.push({
        tone: pr.verdict === 'tercapai' ? 'good' : pr.capaianLaju < 0.85 ? 'risk' : 'warn',
        grup: 'proyeksi',
        head: pr.verdict === 'tercapai'
          ? `Target tahun ini diperkirakan tercapai`
          : `Target tahun ini diperkirakan meleset ${DATA.FMT.rp(Math.abs(pr.kurangLaju))}`,
        text: `Realisasi ${DATA.BULAN_TERSEDIA} bulan ${DATA.FMT.rp(pr.realisasi)} dengan rata-rata
          ${DATA.FMT.rp(pr.lajuBulanan)} per bulan. Kalau rata-rata ini bertahan, proyeksi akhir tahun
          <b>${DATA.FMT.rp(pr.dariLaju)}</b> atau ${DATA.FMT.pct(pr.capaianLaju, 1)} dari target
          ${DATA.FMT.rp(pr.target)}. Untuk menutupnya, rata-rata bulanan harus naik menjadi
          <b>${DATA.FMT.rp(perlu)}</b> per bulan, setara ${DATA.FMT.pctSigned(naik)},
          selama ${pr.sisaBulan} bulan tersisa.`,
        act: pr.verdict === 'tercapai'
          ? `Jaga rata-rata bulanan dan pastikan pipeline tetap terisi agar capaian tidak bergantung pada penutupan akhir tahun.`
          : `Kenaikan sebesar ini jarang tercapai hanya dengan menambah aktivitas. Tinjau juga target per cabang dan peluang penutupan bernilai besar.`,
      })

      if (pr.kecukupan < 1) {
        out.push({
          tone: pr.kecukupan < 0.6 ? 'risk' : 'warn',
          grup: 'proyeksi',
          head: `Pipeline hanya menutup ${DATA.FMT.pct(pr.kecukupan, 1)} kebutuhan produksi sisa tahun`,
          text: `Nilai pipeline setelah dibobot per status ${DATA.FMT.rp(pr.pipelineBerbobot)},
            sedangkan untuk mempertahankan rata-rata sekarang dibutuhkan ${DATA.FMT.rp(pr.tambahanLaju)}
            selama ${pr.sisaBulan} bulan. Dari ${DATA.FMT.n(pr.perStatus.reduce((s, x) => s + x.n, 0))}
            prospek yang masih hidup, ${DATA.FMT.pct(pr.perStatus.filter((x) => x.bobot <= 0.1).reduce((s, x) => s + x.n, 0) /
              Math.max(1, pr.perStatus.reduce((s, x) => s + x.n, 0)))} masih berstatus Cold, yaitu
            peluang konversi paling rendah.
            <br><br>Perlu dibaca dengan hati hati. Nilai seluruh prospek yang tercatat hanya
            ${DATA.FMT.pct(pr.pipelineMentah / Math.max(1, pr.realisasi), 1)} dari produksi
            ${DATA.BULAN_TERSEDIA} bulan berjalan, artinya sebagian besar produksi tidak lewat
            prospek yang tercatat di Matrix Distribution. Jadi ini lebih menunjukkan sejauh mana
            effort terekam, bukan bahwa bisnisnya akan berhenti.`,
          act: `Dua hal sekaligus. Dorong prospek Cold naik ke Warm dan Hot, dan pastikan effort yang sudah dikerjakan benar benar tercatat di Matrix Distribution.`
        })
      }
    }

    /* 3c. Perbandingan terhadap tahun lalu. */
    const y = DATA.yoy(scope)
    if (y && y.yoy !== null && y.kanal25) {
      const perKanalYoY = ORG.SUB_KANAL
        .map((sub, i) => ({ sub, d: DATA.lajuYoY(y.kanal25[i], y.kanal26[i]), n26: y.kanal26[i] }))
        .filter((x) => x.d !== null && x.n26 > 0)
      const naik = [...perKanalYoY].sort((a, b) => b.d - a.d)[0]
      const turun = [...perKanalYoY].sort((a, b) => a.d - b.d)[0]
      out.push({
        tone: y.yoy >= 0 ? 'good' : 'warn',
        grup: 'yoy',
        head: y.yoy >= 0
          ? `Rata-rata bulanan naik ${DATA.FMT.pctSigned(y.yoy, 1)} dibanding tahun lalu`
          : `Rata-rata bulanan turun ${DATA.FMT.pct(Math.abs(y.yoy), 1)} dibanding tahun lalu`,
        text: `Dari ${DATA.FMT.rp(y.p25 / DATA.BULAN_P25)} menjadi
          ${DATA.FMT.rp(y.p26 / DATA.BULAN_P26)} per bulan. Pertumbuhan tertinggi pada
          <b>${esc(naik.sub)}</b> ${DATA.FMT.pctSigned(naik.d, 1)}, penurunan terdalam pada
          <b>${esc(turun.sub)}</b> ${DATA.FMT.pctSigned(turun.d, 1)}.
          Perbandingan memakai rata-rata per bulan karena kedua file mencakup panjang periode
          yang berbeda, yaitu ${DATA.BULAN_P25} bulan berbanding ${DATA.BULAN_P26} bulan.`,
        act: `Telusuri apa yang berubah pada ${esc(naik.sub)} dan apakah polanya dapat diterapkan pada ${esc(turun.sub)}.`,
      })
    }

    /* 3d. Ketergantungan pada satu Marketing Officer. */
    const ro = DATA.risikoOrang(scope)
    if (ro.tinggi.length) {
      const puncak = ro.tinggi.reduce((a, x) => (x.nwpKunci > a.nwpKunci ? x : a), ro.tinggi[0])
      out.push({
        tone: ro.tinggi.length >= 3 ? 'risk' : 'warn',
        grup: 'orang',
        head: `${DATA.FMT.n(ro.tinggi.length)} cabang menggantungkan produksinya pada satu orang`,
        text: `Sebesar ${DATA.FMT.rp(ro.nilaiTinggi)} produksi, atau
          ${DATA.FMT.pct(ro.porsiNasional, 1)} dari nasional, duduk di satu Marketing Officer per
          cabang. Yang terbesar <b>${esc(puncak.nama)}</b>, ${DATA.FMT.pct(puncak.porsi)} dari
          ${DATA.FMT.rp(puncak.nwp)} dihasilkan <b>${esc(puncak.moNama)}</b> seorang, padahal
          cabang itu punya ${DATA.FMT.n(puncak.nMo)} Marketing Officer.`,
        act: `Siapkan pendamping pada cabang tersebut, dan pastikan hubungan nasabah utama tidak hanya dipegang satu orang.`,
      })
    }

    /* 3e. Marketing Officer yang berhenti berproduksi. */
    const mt = DATA.moTurun(scope)
    if (mt.turun.length) {
      const puncak = mt.turun[0]
      out.push({
        tone: 'warn',
        grup: 'orang',
        head: `${DATA.FMT.n(mt.turun.length)} Marketing Officer berhenti berproduksi tahun ini`,
        text: `Tahun lalu masing-masing di atas ${DATA.FMT.rp(DATA.AMBANG_TURUN)}, tahun ini nol
          atau minus. Gabungan produksi 2025 yang mereka bawa ${DATA.FMT.rp(mt.nilai25)}.
          Terbesar <b>${esc(puncak.nama)}</b> di ${esc(puncak.cabang)}, dari
          ${DATA.FMT.rp(puncak.p25)} menjadi ${DATA.FMT.rp(puncak.p26)}.
          Angka minus berarti pembatalan melampaui bisnis baru.`,
        act: `Tanyakan sebabnya ke atasan langsung sebelum menyimpulkan. Bisa jadi pindah peran, cuti panjang, atau portofolio dialihkan.`,
      })
    }

    /* 4. Penurunan mingguan yang disertai penurunan aktivitas. */
    const jatuh = stats
      .filter((s) => s.m7p.npw > 0 && s.m7.npw / s.m7p.npw - 1 < -0.2 && s.m7p.effort > 0)
      .sort((a, b) => a.m7.npw / a.m7p.npw - b.m7.npw / b.m7p.npw)[0]
    if (jatuh) {
      const dProd = jatuh.m7.npw / jatuh.m7p.npw - 1
      const dEff = jatuh.m7.effort / jatuh.m7p.effort - 1
      const searah = dEff < -0.15
      out.push({
        tone: searah ? 'risk' : 'warn',
        head: `${jatuh.b.name} turun ${DATA.FMT.pct(Math.abs(dProd))} dibanding minggu sebelumnya`,
        text: searah
          ? `Produksi tujuh hari terakhir turun <b>${DATA.FMT.pctSigned(dProd)}</b> dengan penurunan
             effort <b>${DATA.FMT.pctSigned(dEff)}</b> pada periode yang sama. Jumlah follow up
             berkurang dari ${DATA.FMT.n(jatuh.m7p.follow_up)} menjadi ${DATA.FMT.n(jatuh.m7.follow_up)}.
             Pola penurunan yang searah mengindikasikan persoalan pada pelaksanaan aktivitas pemasaran.`
          : `Produksi tujuh hari terakhir turun <b>${DATA.FMT.pctSigned(dProd)}</b>, sementara effort
             relatif tetap pada ${DATA.FMT.pctSigned(dEff)}. Aktivitas tetap berjalan namun belum
             menghasilkan penutupan, sehingga indikasinya mengarah pada kualitas prospek atau
             daya saing penawaran.`,
        act: searah
          ? `Konfirmasi kepada Pimpinan Cabang ${jatuh.b.name} mengenai kendala pelaksanaan follow up pada minggu berjalan.`
          : `Bandingkan rate dan persyaratan penawaran ${jatuh.b.name} terhadap cabang dengan skala setara.`,
      })
    }

    /* 5. Cabang tanpa aktivitas tercatat. */
    const diam = stats.filter((s) => s.diam >= 5).sort((a, b) => b.diam - a.diam)
    if (diam.length) {
      const d0 = diam[0]
      out.push({
        tone: 'risk',
        head: diam.length > 1
          ? `${diam.length} cabang tanpa input effort sama sekali`
          : `${d0.b.name} tanpa input effort selama ${d0.diam} hari kerja`,
        text: diam.length > 1
          ? `Periode terpanjang pada <b>${esc(d0.b.name)}</b> selama ${d0.diam} hari kerja berturut-turut
             tanpa kunjungan, telepon, penawaran, maupun follow up yang terekam pada Matrix Distribution.
             Cabang lainnya yaitu
             ${diam.slice(1, 4).map((s) => esc(s.b.name) + ' (' + s.diam + ' hari)').join(', ')}.`
          : `Selama ${d0.diam} hari kerja berturut-turut tidak terdapat satu pun aktivitas yang terekam.
             Produksi cabang masih berjalan dari polis yang diproses sebelumnya, sehingga laporan
             produksi belum menunjukkan gejala penurunan.`,
        act: `Pastikan penyebabnya, apakah terkait ketersediaan personel, kendala input pada sistem, atau pelaksanaan aktivitas yang memang terhenti.`,
      })
    }

    /* 6. Aktivitas tinggi dengan hasil yang belum sepadan. */
    const boros = stats
      .filter((s) => s.eIdx > 1.35 && s.capaian < 0.85 && s.r.mtd.prospek_baru > 4)
      .sort((a, b) => b.eIdx - a.eIdx)[0]
    if (boros) {
      const banding = stats
        .filter((s) => s.b.id !== boros.b.id && s.capaian > 1 && s.eIdx < 1.05 && s.konversi > 0)
        .sort((a, b) => b.konversi - a.konversi)[0]
      out.push({
        tone: 'warn',
        head: `${boros.b.name} beraktivitas tinggi dengan capaian yang tertinggal`,
        text: `Effort bulan berjalan mencapai <b>${DATA.FMT.pct(boros.eIdx)}</b> dari rata-rata ${acuan},
          terdiri atas ${DATA.FMT.n(boros.r.mtd.kunjungan)} kunjungan dan
          ${DATA.FMT.n(boros.r.mtd.penawaran)} penawaran. Capaian target baru
          <b>${DATA.FMT.pct(boros.capaian)}</b> dengan konversi prospek menjadi polis
          <b>${DATA.FMT.pct(boros.konversi, 1)}</b>.` +
          (banding
            ? ` Sebagai pembanding, ${banding.b.name} mencatat konversi
                ${DATA.FMT.pct(banding.konversi, 1)} pada tingkat effort ${DATA.FMT.pct(banding.eIdx)}.`
            : ''),
        act: `Evaluasi kualitas prospek yang diinput dan kesiapan materi penawaran sebelum menambah target aktivitas.`,
      })
    }

    /* 7. Capaian baik dengan pipeline yang tipis. */
    const rawan = stats
      .filter((s) => s.capaian > 1.05 && s.eIdx < 0.6)
      .sort((a, b) => a.eIdx - b.eIdx)[0]
    if (rawan) {
      const set = DATA.MO_BY_BRANCH.get(rawan.b.id) || []
      const harian = DATA.series(set, 'npw', DATA.CUR_MONTH_START, DATA.idxHariIni)
      const konsentrasi = rawan.r.mtd.npw > 0 ? Math.max(...harian, 0) / rawan.r.mtd.npw : 0
      out.push({
        tone: konsentrasi > 0.5 ? 'risk' : 'warn',
        head: `${rawan.b.name} melampaui target dengan pipeline yang terbatas`,
        text: `Capaian tercatat <b>${DATA.FMT.pct(rawan.capaian)}</b> sehingga posisinya aman pada
          laporan produksi. Namun effort hanya <b>${DATA.FMT.pct(rawan.eIdx)}</b> dari rata-rata,
          prospek baru bulan berjalan sebanyak <b>${DATA.FMT.n(rawan.r.mtd.prospek_baru)}</b>, dan
          <b>${DATA.FMT.pct(konsentrasi)}</b> premi bulan ini berasal dari satu hari transaksi.`,
        act: `Mintakan rencana penambahan prospek baru agar capaian tidak bergantung pada satu penutupan.`,
      })
    }

    /* 8. Cabang dengan beban melampaui premi.
          Temuan ini semuanya dari file produksi, bukan simulasi. */
    const rugi = (scope.unit ? ORG.branchesOf(scope.unit) : ORG.BRANCHES)
      .filter((b) => b.profit26 < 0)
      .sort((a, b) => a.profit26 - b.profit26)
    if (rugi.length) {
      const r0 = rugi[0]
      const totalRugi = rugi.reduce((s, b) => s + b.profit26, 0)
      out.push({
        tone: 'risk',
        head: `${r0.name} mencatat beban melampaui premi sebesar ${DATA.FMT.rp(Math.abs(r0.profit26))}`,
        text: `Premi ${DATA.FMT.rp(r0.nwp26)} berhadapan dengan beban ${DATA.FMT.rp(r0.beban26)},
          sehingga rasio beban mencapai <b>${DATA.FMT.pct(r0.rasioBeban)}</b> terhadap premi.
          Pada tahun sebelumnya cabang ini membukukan profit ${DATA.FMT.rp(r0.profit25)}.` +
          (rugi.length > 1
            ? ` Totalnya ada ${rugi.length} cabang dengan posisi serupa dan akumulasi
                ${DATA.FMT.rp(Math.abs(totalRugi))}.`
            : ''),
        act: `Dalami komposisi klaim cabang ini bersama tim Underwriting sebelum menetapkan target premi periode berikutnya.`,
      })
    }

    /* 9. Capaian positif yang layak dijadikan acuan. */
    const bintang = stats
      .filter((s) => s.capaian > 1.05 && s.eIdx > 1.15 && s.m7p.npw > 0 && s.m7.npw > s.m7p.npw)
      .sort((a, b) => b.capaian - a.capaian)[0]
    if (bintang) {
      const dProd = bintang.m7.npw / bintang.m7p.npw - 1
      out.push({
        tone: 'good',
        head: `${bintang.b.name} tumbuh disertai peningkatan aktivitas`,
        text: `Capaian target <b>${DATA.FMT.pct(bintang.capaian)}</b> dengan effort
          <b>${DATA.FMT.pct(bintang.eIdx)}</b> dari rata-rata. Produksi tujuh hari terakhir naik
          ${DATA.FMT.pctSigned(dProd)} sehingga pertumbuhan berjalan seiring aktivitas, bukan
          bersumber dari satu penutupan besar.`,
        act: `Telusuri perubahan pola kerja cabang ini pada tiga minggu terakhir sebagai bahan pembelajaran.`,
      })
    }

    /* 10. Proyeksi pencapaian bulan berjalan. */
    const selisih = r.proyeksi - r.targetBulan
    const sisaHari = DATA.hariIni.dim - DATA.hariIni.dom
    if (r.targetBulan > 0 && sisaHari > 0) {
      const kurang = selisih < 0
      out.push({
        tone: kurang ? (selisih / r.targetBulan < -0.12 ? 'risk' : 'warn') : 'good',
        head: kurang
          ? `Proyeksi bulan berjalan kurang ${DATA.FMT.rp(Math.abs(selisih))} dari target`
          : `Proyeksi bulan berjalan melampaui target sebesar ${DATA.FMT.rp(selisih)}`,
        text: `Berdasarkan realisasi sampai tanggal ${DATA.hariIni.dom} dan pola penyerapan bulanan,
          proyeksi akhir ${DATA.FMT.bulan(DATA.hariIni.month)} berada pada
          <b>${DATA.FMT.rp(r.proyeksi)}</b> terhadap target <b>${DATA.FMT.rp(r.targetBulan)}</b>.
          Tersisa ${sisaHari} hari kalender.`,
        act: kurang
          ? `Tetapkan langkah penutupan selisih pada minggu ini agar tidak bergantung pada dorongan akhir bulan.`
          : `Pertahankan rata-rata bulanan dengan tetap menjaga mutu akseptasi pada periode penutupan bulan.`,
      })
    }

    return ringkasTemuan(out)
  },

  /* ══ Temuan tingkat cabang untuk Pimpinan Cabang ══ */
  untukCabang(branchId, filter: DataFilter = {}) {
    const out = []
    const scope = { branch: branchId }
    const b = ORG.branchById(branchId)
    const r = DATA.ringkas(scope)
    const dk = DATA.daftarKerja(scope, filter)

    const mos = (DATA.MO_BY_BRANCH.get(branchId) || []).map((mi) => {
      const mo = DATA.MOS[mi]
      const rr = DATA.ringkas({ mo: mo.id })
      const d = DATA.daftarKerja({ mo: mo.id }, filter)
      return {
        mo, r: rr, lewat: d.bucket.lewat.length, aktif: d.aktif.length,
        konversi: rr.mtd.prospek_baru > 0 ? rr.mtd.terbit / rr.mtd.prospek_baru : 0,
      }
    })
    const rataEffort = mos.reduce((s, m) => s + m.r.mtd.effort, 0) / (mos.length || 1) || 1

    /* 1. Penumpukan pada satu Marketing Officer. */
    const menumpuk = [...mos].sort((a, b2) => b2.lewat - a.lewat)[0]
    if (menumpuk && menumpuk.lewat > 0) {
      const porsi = dk.bucket.lewat.length ? menumpuk.lewat / dk.bucket.lewat.length : 0
      out.push({
        tone: porsi > 0.4 ? 'risk' : 'warn',
        head: `${menumpuk.mo.nama} menahan ${DATA.FMT.n(menumpuk.lewat)} prospek yang lewat batas waktu`,
        text: `Setara <b>${DATA.FMT.pct(porsi)}</b> dari semua tunggakan cabang, dari
          ${DATA.FMT.n(menumpuk.aktif)} prospek aktif yang dipegangnya. Effort bulan berjalan
          ${DATA.FMT.pct(menumpuk.r.mtd.effort / rataEffort)} dari rata-rata rekan se-cabang.`,
        act: menumpuk.r.mtd.effort < rataEffort
          ? `Aktivitasnya juga di bawah rata-rata, sehingga kemungkinan bukan soal beban kerja. Perlu pendampingan langsung.`
          : `Aktivitasnya sudah di atas rata-rata, sehingga kemungkinan portofolionya memang terlalu banyak. Pertimbangkan pembagian ulang.`,
      })
    }

    /* 2. Kanal yang paling banyak tertahan di cabang ini. */
    const pipe = DATA.kanalPipeline(scope, filter)
      .map((x) => {
        const aktif = DATA.prospek(scope, { subKanal: x.sub }).filter((p) => !p.selesai)
        const lewat = aktif.filter((p) => p.telat > 0)
        return { ...x, lewatN: lewat.length, nilai: lewat.reduce((s, p) => s + p.premi, 0) }
      })
      .filter((x) => x.lewatN > 0)
      .sort((a, b2) => b2.nilai - a.nilai)
    if (pipe.length) {
      out.push({
        tone: 'info',
        grup: 'kanal',
        head: `Tunggakan terbesar cabang berasal dari sub-channel ${pipe[0].sub}`,
        text: `${DATA.FMT.n(pipe[0].lewatN)} prospek dengan potensi premi
          <b>${DATA.FMT.rp(pipe[0].nilai)}</b> melewati batas waktu.` +
          (pipe.length > 1
            ? ` Disusul ${pipe.slice(1, 3).map((x) => `${esc(x.sub)} (${x.lewatN})`).join(' dan ')}.`
            : ''),
        act: `Bahas bersama mitra pada sub-channel itu bila hambatannya ada di sisi mereka.`,
      })
    }

    /* 3. Konversi terbaik sebagai bahan pembelajaran internal. */
    const jago = [...mos].filter((m) => m.r.mtd.prospek_baru >= 3).sort((a, b2) => b2.konversi - a.konversi)[0]
    if (jago && jago.konversi > 0) {
      out.push({
        tone: 'good',
        head: `Konversi tertinggi di cabang tercatat pada ${jago.mo.nama}`,
        text: `<b>${DATA.FMT.pct(jago.konversi, 1)}</b> prospek baru berujung terbit polis bulan ini,
          dari ${DATA.FMT.n(jago.r.mtd.prospek_baru)} prospek, dengan premi terbit
          ${DATA.FMT.rp(jago.r.mtd.npw)}.`,
        act: `Agendakan pemaparan cara penyaringan prospek yang dimaksud pada rapat cabang berikutnya.`,
      })
    }

    /* 4. Peluang cross selling. */
    const cross = DATA.prospek(scope, filter).filter((p) => p.crossSell.length > 0)
    if (cross.length >= 3) {
      const hitung: Record<string, number> = {}
      cross.forEach((p) => p.crossSell.forEach((c) => { hitung[c] = (hitung[c] || 0) + 1 }))
      const teratas = Object.entries(hitung).sort((a, b2) => b2[1] - a[1]).slice(0, 3)
      out.push({
        tone: 'info',
        head: `Terdapat peluang cross selling yang belum digarap`,
        text: `Sebanyak ${DATA.FMT.n(cross.length)} nasabah dan prospek pada cabang ini baru memegang
          satu lini usaha. Yang paling banyak berpotensi ditawarkan yaitu
          ${teratas.map(([l, n]) => `<b>${esc(l)}</b> pada ${n} nasabah`).join(', ')}.`,
        act: `Susun daftar penawaran lanjutan berdasarkan lini yang belum dimiliki setiap nasabah.`,
      })
    }

    /* 5. Posisi capaian dan rasio beban, bersumber dari file produksi. */
    if (r.capaian < 0.8) {
      out.push({
        tone: 'warn',
        head: `Capaian cabang berada pada ${DATA.FMT.pct(r.capaian)} dari target bulan berjalan`,
        text: `Produksi bulan berjalan ${DATA.FMT.rp(r.mtd.npw)} terhadap target
          ${DATA.FMT.rp(r.targetMtd)}, dengan rasio beban tahun berjalan
          ${DATA.FMT.pct(r.ytd.rasio_beban)}.`,
        act: `Bandingkan terhadap cabang berskala setara di ${ORG.unitById(b.unit).short} sebelum menetapkan langkah perbaikan.`,
      })
    }
    if (b.rasioBeban > 1) {
      out.push({
        tone: 'risk',
        head: `Beban cabang melampaui premi, rasio ${DATA.FMT.pct(b.rasioBeban)}`,
        text: `Premi ${DATA.FMT.rp(b.nwp26)} berhadapan dengan beban ${DATA.FMT.rp(b.beban26)}
          sepanjang tahun berjalan, sedangkan tahun sebelumnya cabang ini membukukan profit
          ${DATA.FMT.rp(b.profit25)}. Angka ini bersumber langsung dari file produksi.`,
        act: `Tinjau komposisi klaim bersama tim Underwriting sebelum menambah volume pada lini yang sama.`,
      })
    }

    return ringkasTemuan(out)
  },

  /* ══ Rekomendasi tindakan per prospek ══
     Konsep mengacu pada Pilar D Blueprint Prospek Intelligence v3.0. */
  nba(p) {
    if (p.status === 'Terbit Polis') return { t: 'Pastikan polis diterima nasabah dan jadwalkan pengingat perpanjangan', u: 'rendah' }
    if (p.status === 'Batal') return { t: 'Catat alasan kehilangan prospek sebagai bahan perbaikan penawaran', u: 'rendah' }
    if (p.status === 'Pending') return { t: 'Kejar pihak yang menahan, tetapkan tenggat jawaban', u: 'sedang' }
    if (p.telat > 14) return { t: 'Hubungi pada hari ini atau tetapkan status batal', u: 'tinggi' }
    if (p.status === 'Hot' && p.telat > 0) return { t: 'Prospek Hot sudah lewat batas waktu, lakukan kontak hari ini', u: 'tinggi' }
    if (p.tahap === 'Proposal' && p.telat >= 0) return { t: 'Konfirmasi keputusan atas proposal yang telah disampaikan', u: 'tinggi' }
    if (p.telat > 0) return { t: 'Jadwalkan ulang tindak lanjut pada hari ini', u: 'tinggi' }
    if (p.tahap === 'Negosiasi') return { t: 'Siapkan opsi harga alternatif sebelum pertemuan berikutnya', u: 'sedang' }
    if (p.tahap === 'Prospek Baru') return { t: 'Jadwalkan kunjungan perkenalan', u: 'sedang' }
    if (p.crossSell.length) return { t: `Tawarkan ${p.crossSell[0]} sebagai pelengkap ${p.lini}`, u: 'sedang' }
    return { t: 'Lanjutkan follow up sesuai jadwal', u: 'rendah' }
  },
}
