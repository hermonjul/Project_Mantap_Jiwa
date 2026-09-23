/* ══════════════════════════════════════════════════════════════════
   charts.js, primitif chart, SVG buatan tangan tanpa library.

   Alasan tanpa library: file harus standalone & offline, dan pola
   hand-rolled sudah terbukti di portal LSP AKASI (DualBarChart) serta
   Cendekia (MiniLineChart). Semua fungsi mengembalikan string HTML.

   Aturan warna: seri memakai skala turunan navy (--s1..--s6).
   Merah merek dan emas TIDAK dipakai sebagai warna seri, keduanya
   dikunci kontrak sebagai aksen langka. Emas hanya untuk garis target.
   ══════════════════════════════════════════════════════════════════ */

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
))

const kosong = (pesan = 'Data belum cukup untuk ditampilkan') =>
  `<div class="chart-empty">${esc(pesan)}</div>`

const CH = {
  /* ── Sparkline ── deret tipis di balik angka KPI. */
  spark(vals, { w = 150, h = 34, stroke = 'var(--s3)', fill = true } = {}) {
    const clean = (vals || []).filter((v) => Number.isFinite(v))
    if (clean.length < 2) return kosong('belum cukup data')
    const max = Math.max(...clean), min = Math.min(...clean)
    const rng = max - min || 1
    const step = w / (clean.length - 1)
    const y = (v) => h - 3 - ((v - min) / rng) * (h - 6)
    const pts = clean.map((v, i) => `${(i * step).toFixed(1)},${y(v).toFixed(1)}`)
    const area = fill
      ? `<path d="M0,${h} L${pts.join(' L')} L${w},${h} Z" fill="${stroke}" opacity=".1"/>`
      : ''
    return `<svg class="chart" viewBox="0 0 ${w} ${h}" height="${h}" preserveAspectRatio="none" aria-hidden="true">
      ${area}<polyline points="${pts.join(' ')}" fill="none" stroke="${stroke}" stroke-width="1.8"
      stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>`
  },

  /* ── Bar mingguan + garis target ── inti cadence mingguan. */
  barTarget(vals, labels, target, { h = 190, fmt = (v) => v, label = 'Nilai' } = {}) {
    const clean = (vals || []).filter((v) => Number.isFinite(v))
    if (!clean.length) return kosong()
    const w = 660, padL = 8, padB = 26, padT = 14
    const max = Math.max(...clean, target || 0) * 1.12 || 1
    const n = clean.length
    const gap = 5
    const bw = (w - padL * 2 - gap * (n - 1)) / n
    const y = (v) => padT + (1 - v / max) * (h - padT - padB)

    const bars = clean.map((v, i) => {
      const x = padL + i * (bw + gap)
      const bh = Math.max(1.5, h - padB - y(v))
      const kurang = target && v < target
      const warna = i === n - 1 ? 'var(--s1)' : kurang ? 'var(--s5)' : 'var(--s3)'
      return `<rect x="${x.toFixed(1)}" y="${y(v).toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}"
        rx="3" fill="${warna}"><title>${esc(labels[i])}: ${esc(fmt(v))}</title></rect>`
    }).join('')

    const tick = labels.map((l, i) => {
      if (n > 14 && i % 2 !== 0 && i !== n - 1) return ''
      const x = padL + i * (bw + gap) + bw / 2
      return `<text class="lbl" x="${x.toFixed(1)}" y="${h - 8}" text-anchor="middle">${esc(l)}</text>`
    }).join('')

    const tl = target
      ? `<line class="target-l" x1="${padL}" y1="${y(target).toFixed(1)}" x2="${w - padL}" y2="${y(target).toFixed(1)}"/>
         <text class="lbl-strong" x="${w - padL}" y="${(y(target) - 5).toFixed(1)}" text-anchor="end"
           fill="var(--tertiary)">target ${esc(fmt(target))}</text>`
      : ''

    return `<svg class="chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(label)}">
      <line class="grid-l" x1="${padL}" y1="${h - padB}" x2="${w - padL}" y2="${h - padB}"/>
      ${bars}${tl}${tick}</svg>`
  },

  /* ── Bar harian ── 30 hari; akhir pekan dibedakan agar lembahnya
     terbaca sebagai kalender, bukan kegagalan. */
  barHarian(vals, days, { h = 118, fmt = (v) => v } = {}) {
    if (!vals || !vals.length) return kosong()
    const w = 660, padB = 20, padT = 8, padL = 6
    const max = Math.max(...vals) * 1.1 || 1
    const n = vals.length
    const gap = 2.5
    const bw = (w - padL * 2 - gap * (n - 1)) / n
    const y = (v) => padT + (1 - v / max) * (h - padT - padB)
    const bars = vals.map((v, i) => {
      const d = days[i]
      const x = padL + i * (bw + gap)
      const bh = Math.max(1, h - padB - y(v))
      const warna = d.libur ? 'var(--s6)' : d.weekend ? 'var(--s5)' : 'var(--s3)'
      return `<rect x="${x.toFixed(1)}" y="${y(v).toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}"
        rx="1.5" fill="${warna}"><title>${esc(DATA.FMT.tgl(d.iso))} (${esc(DATA.FMT.hari(d.iso))}): ${esc(fmt(v))}</title></rect>`
    }).join('')
    const tick = days.map((d, i) => {
      if (i % 7 !== 0 && i !== n - 1) return ''
      const x = padL + i * (bw + gap) + bw / 2
      return `<text class="lbl" x="${x.toFixed(1)}" y="${h - 6}" text-anchor="middle">${esc(DATA.FMT.tglPendek(d.iso))}</text>`
    }).join('')
    return `<svg class="chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="Produksi harian">
      <line class="grid-l" x1="${padL}" y1="${h - padB}" x2="${w - padL}" y2="${h - padB}"/>${bars}${tick}</svg>`
  },

  /* ── Kuadran Produksi × Effort ──
     Chart paling penting di prototype ini: memisahkan "hasil rendah karena
     tidak berusaha" dari "hasil rendah walau sudah berusaha". Dua masalah
     itu butuh tindakan yang berbeda, dan selama ini tidak terlihat karena
     produksi dan effort hidup di aplikasi yang berbeda. */
  kuadran(points, { h = 400, onClickAttr = '' } = {}) {
    if (!points || points.length < 2) return kosong()
    const w = 660, padL = 46, padR = 16, padT = 16, padB = 40
    const xs = points.map((p) => p.x), ys = points.map((p) => p.y)
    const xMax = Math.max(...xs, 1.35) * 1.06
    const yMax = Math.max(...ys, 1.35) * 1.06
    const rMax = Math.max(...points.map((p) => p.r), 1)
    const px = (v) => padL + (v / xMax) * (w - padL - padR)
    const py = (v) => padT + (1 - v / yMax) * (h - padT - padB)
    const cx = px(1), cy = py(1)

    const zona = `
      <rect x="${cx}" y="${padT}" width="${w - padR - cx}" height="${cy - padT}" fill="var(--pos)" opacity=".05"/>
      <rect x="${padL}" y="${padT}" width="${cx - padL}" height="${cy - padT}" fill="var(--tertiary)" opacity=".07"/>
      <rect x="${cx}" y="${cy}" width="${w - padR - cx}" height="${h - padB - cy}" fill="var(--s3)" opacity=".05"/>
      <rect x="${padL}" y="${cy}" width="${cx - padL}" height="${h - padB - cy}" fill="var(--neg)" opacity=".06"/>`

    const labelZona = `
      <text class="lbl-strong" x="${w - padR - 8}" y="${padT + 15}" text-anchor="end" fill="var(--pos)">SEHAT: effort dan hasil sejalan</text>
      <text class="lbl-strong" x="${padL + 8}" y="${padT + 15}" fill="var(--on-tertiary-container)">RAWAN: hasil tinggi, effort rendah</text>
      <text class="lbl-strong" x="${w - padR - 8}" y="${h - padB - 8}" text-anchor="end" fill="var(--s2)">PERLU PENDAMPINGAN: effort tinggi, hasil rendah</text>
      <text class="lbl-strong" x="${padL + 8}" y="${h - padB - 8}" fill="var(--neg)">STAGNAN: keduanya rendah</text>`

    const dots = points.map((p) => {
      const r = 4 + Math.sqrt(p.r / rMax) * 13
      const warna = p.x >= 1 && p.y >= 1 ? 'var(--pos)'
        : p.x < 1 && p.y >= 1 ? 'var(--tertiary)'
          : p.x >= 1 && p.y < 1 ? 'var(--s3)' : 'var(--neg)'
      return `<circle cx="${px(p.x).toFixed(1)}" cy="${py(p.y).toFixed(1)}" r="${r.toFixed(1)}"
        fill="${warna}" opacity=".62" stroke="${warna}" stroke-width="1.4"
        ${onClickAttr ? `${onClickAttr}="${esc(p.id)}" style="cursor:pointer"` : ''}>
        <title>${esc(p.label)}
Effort: ${(p.x * 100).toFixed(0)}% dari rata-rata
Capaian target: ${(p.y * 100).toFixed(0)}%
Produksi MTD: ${esc(DATA.FMT.rp(p.r))}</title></circle>`
    }).join('')

    /* Label hanya untuk titik ekstrem, mencegah layar penuh teks. */
    const menonjol = [...points]
      .sort((a, b) => Math.abs(b.x - 1) + Math.abs(b.y - 1) - (Math.abs(a.x - 1) + Math.abs(a.y - 1)))
      .slice(0, 6)
    const teks = menonjol.map((p) => {
      const x = px(p.x), yy = py(p.y)
      const kiri = x > w * 0.66
      return `<text class="lbl" x="${(kiri ? x - 12 : x + 12).toFixed(1)}" y="${(yy + 3.5).toFixed(1)}"
        text-anchor="${kiri ? 'end' : 'start'}" fill="var(--on-surface)">${esc(p.short)}</text>`
    }).join('')

    const gridX = [0.5, 1, 1.5].filter((v) => v < xMax).map((v) =>
      `<text class="lbl" x="${px(v).toFixed(1)}" y="${h - padB + 15}" text-anchor="middle">${(v * 100).toFixed(0)}%</text>`).join('')
    const gridY = [0.5, 1, 1.5].filter((v) => v < yMax).map((v) =>
      `<text class="lbl" x="${padL - 7}" y="${(py(v) + 3.5).toFixed(1)}" text-anchor="end">${(v * 100).toFixed(0)}%</text>`).join('')

    return `<svg class="chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="Kuadran produksi terhadap effort">
      ${zona}
      <line class="grid-l" x1="${cx}" y1="${padT}" x2="${cx}" y2="${h - padB}" stroke-dasharray="3 3"/>
      <line class="grid-l" x1="${padL}" y1="${cy}" x2="${w - padR}" y2="${cy}" stroke-dasharray="3 3"/>
      <line class="grid-l" x1="${padL}" y1="${h - padB}" x2="${w - padR}" y2="${h - padB}"/>
      <line class="grid-l" x1="${padL}" y1="${padT}" x2="${padL}" y2="${h - padB}"/>
      ${labelZona}${dots}${teks}${gridX}${gridY}
      <text class="lbl" x="${(w / 2).toFixed(0)}" y="${h - 6}" text-anchor="middle">Indeks effort (100% = rata-rata nasional)</text>
      <text class="lbl" x="12" y="${(h / 2).toFixed(0)}" text-anchor="middle"
        transform="rotate(-90 12 ${(h / 2).toFixed(0)})">Capaian target produksi</text></svg>`
  },

  /* ── Donut ── */
  donut(items, { size = 168, tebal = 26, total = null } = {}) {
    const data = (items || []).filter((d) => d.v > 0)
    if (!data.length) return kosong('Belum ada data')
    const jml = data.reduce((s, d) => s + d.v, 0)
    const r = size / 2 - tebal / 2 - 2
    const c = size / 2
    const keliling = 2 * Math.PI * r
    let acc = 0
    const seg = data.map((d) => {
      const frac = d.v / jml
      const dash = `${(frac * keliling).toFixed(2)} ${(keliling - frac * keliling).toFixed(2)}`
      const off = (-acc * keliling).toFixed(2)
      acc += frac
      return `<circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${d.c}" stroke-width="${tebal}"
        stroke-dasharray="${dash}" stroke-dashoffset="${off}" transform="rotate(-90 ${c} ${c})">
        <title>${esc(d.l)}: ${DATA.FMT.n(d.v)} (${DATA.FMT.pct(frac)})</title></circle>`
    }).join('')
    const tengah = total !== null
      ? `<text x="${c}" y="${c - 2}" text-anchor="middle" class="lbl-strong" style="font-size:21px;font-weight:800"
           fill="var(--on-surface)">${esc(total)}</text>
         <text x="${c}" y="${c + 14}" text-anchor="middle" class="lbl">total</text>`
      : ''
    return `<svg class="chart" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"
      role="img" aria-label="Komposisi">${seg}${tengah}</svg>`
  },

  legend(items) {
    return `<div class="legend">${items.map((d) =>
      `<span><i style="background:${d.c}"></i>${esc(d.l)}${d.n !== undefined ? ` <b class="num">${esc(d.n)}</b>` : ''}</span>`,
    ).join('')}</div>`
  },

  /* ── Funnel ── dengan angka drop-off antar tahap, karena yang penting
     bukan tingginya batang tapi di mana pipeline bocor. */
  funnel(rows) {
    const data = rows || []
    if (!data.length) return kosong()
    const max = Math.max(...data.map((d) => d.v), 1)
    const warna = ['var(--s1)', 'var(--s2)', 'var(--s3)', 'var(--s4)', 'var(--s5)', 'var(--pos)', 'var(--s6)', 'var(--s6)']
    return `<div class="funnel">${data.map((d, i) => {
      const prev = i > 0 ? data[i - 1].v : null
      const drop = prev && prev > 0 ? d.v / prev - 1 : null
      const tampilDrop = drop !== null && i < 6
      return `<div class="funnel__row">
        <span class="funnel__lbl" title="${esc(d.l)}">${esc(d.l)}</span>
        <span class="funnel__bar"><i style="width:${((d.v / max) * 100).toFixed(1)}%;background:${warna[i % warna.length]}"></i></span>
        <span class="funnel__n">${DATA.FMT.n(d.v)}</span>
        <span class="funnel__drop">${tampilDrop ? DATA.FMT.pctSigned(drop) : ''}</span>
      </div>`
    }).join('')}</div>`
  },

  /* ── Grafik batang aktivitas harian ──
     Menggantikan kalender kotak berwarna. Warna sebagai penanda jumlah sulit
     dibaca, apalagi bila beda warnanya tipis dan kotaknya kecil. Tinggi batang
     langsung terbaca sebagai jumlah, tanpa perlu menerjemahkan warna dulu.

     Hari kerja tanpa aktivitas ditandai garis merah di dasar grafik, supaya
     tetap kelihatan meski tinggi batangnya nol. */
  barAktivitas(vals, days, { h = 138 } = {}) {
    if (!vals || !vals.length) return kosong()
    const w = 660, padB = 28, padT = 20, padL = 8
    const max = Math.max(...vals, 1)
    const n = vals.length
    const gap = 2.5
    const bw = (w - padL * 2 - gap * (n - 1)) / n
    const dasar = h - padB
    const y = (v) => padT + (1 - v / max) * (dasar - padT)

    const batang = vals.map((v, i) => {
      const d = days[i]
      const x = padL + i * (bw + gap)
      const bukanKerja = d.libur || d.weekend
      const kosongKerja = v === 0 && !bukanKerja
      const judul = DATA.FMT.tgl(d.iso) + ', ' + DATA.FMT.hari(d.iso)
        + '\n' + DATA.FMT.n(v) + ' aktivitas'
        + (kosongKerja ? '\nHari kerja tanpa aktivitas'
          : bukanKerja ? '\nBukan hari kerja' : '')
      if (v === 0) {
        return `<rect x="${x.toFixed(1)}" y="${(dasar - 4).toFixed(1)}" width="${bw.toFixed(1)}" height="4"
          rx="1" fill="${kosongKerja ? 'var(--neg)' : 'var(--sc-highest)'}"><title>${esc(judul)}</title></rect>`
      }
      const bh = Math.max(3, dasar - y(v))
      return `<rect x="${x.toFixed(1)}" y="${y(v).toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}"
        rx="1.5" fill="${bukanKerja ? 'var(--s5)' : 'var(--s2)'}"><title>${esc(judul)}</title></rect>`
    }).join('')

    const kerja = vals.filter((_, i) => !days[i].weekend && !days[i].libur)
    const rata = kerja.length ? kerja.reduce((s, v) => s + v, 0) / kerja.length : 0
    const garisRata = rata > 0
      ? `<line class="target-l" x1="${padL}" y1="${y(rata).toFixed(1)}" x2="${w - padL}" y2="${y(rata).toFixed(1)}"/>
         <text class="lbl-strong" x="${w - padL}" y="${(y(rata) - 7).toFixed(1)}" text-anchor="end"
           fill="var(--on-surface)">rata-rata ${rata.toFixed(1)} per hari kerja</text>`
      : ''

    const tanggal = days.map((d, i) => {
      if (i % 7 !== 0 && i !== n - 1) return ''
      // Label mingguan yang terlalu dekat dengan label hari terakhir dilewati
      // supaya kedua tanggal tidak saling menimpa.
      if (i !== n - 1 && n - 1 - i < 4) return ''
      const x = padL + i * (bw + gap) + bw / 2
      return `<text class="lbl" x="${x.toFixed(1)}" y="${h - 8}" text-anchor="middle">${esc(DATA.FMT.tglPendek(d.iso))}</text>`
    }).join('')

    return `<svg class="chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="Jumlah aktivitas per hari">
      <line class="grid-l" x1="${padL}" y1="${dasar}" x2="${w - padL}" y2="${dasar}"/>
      ${batang}${garisRata}${tanggal}</svg>`
  },

  /* Ringkasan angka di bawah grafik aktivitas, supaya tidak perlu menghitung
     batang satu per satu. */
  ringkasAktivitas(vals, days) {
    const idxKerja = days.map((d, i) => (!d.weekend && !d.libur ? i : -1)).filter((i) => i >= 0)
    const hariKerja = idxKerja.length
    const adaIsi = idxKerja.filter((i) => vals[i] > 0).length
    const tanpaIsi = hariKerja - adaIsi
    let jeda = 0, maksJeda = 0
    idxKerja.forEach((i) => {
      if (vals[i] === 0) { jeda++; maksJeda = Math.max(maksJeda, jeda) } else jeda = 0
    })
    const total = idxKerja.reduce((s, i) => s + vals[i], 0)
    const isi = [
      { l: 'Hari kerja', v: DATA.FMT.n(hariKerja) },
      { l: 'Ada aktivitas', v: DATA.FMT.n(adaIsi), tone: adaIsi / Math.max(1, hariKerja) >= 0.8 ? 'pos' : '' },
      { l: 'Hari kosong', v: DATA.FMT.n(tanpaIsi), tone: tanpaIsi > 0 ? 'neg' : '' },
      { l: 'Kosong beruntun', v: maksJeda ? DATA.FMT.n(maksJeda) + ' hari' : 'tidak ada', tone: maksJeda >= 3 ? 'neg' : '' },
      { l: 'Total aktivitas', v: DATA.FMT.n(total) },
    ]
    return `<div class="ringkas-angka">${isi.map((x) => `
      <div class="ringkas-angka__sel">
        <span class="ringkas-angka__lbl">${esc(x.l)}</span>
        <span class="ringkas-angka__val${x.tone ? ' is-' + x.tone : ''}">${esc(x.v)}</span>
      </div>`).join('')}</div>`
  },

  /* ── Heatmap cabang × minggu ──
     Sel = produksi. Bingkai putus-putus merah = minggu tanpa satu pun
     input effort. Kolom kosong langsung terbaca sebagai cabang yang diam. */
  heatmap(rows, labels) {
    if (!rows || !rows.length) return kosong()
    const semua = rows.flatMap((r) => r.vals)
    const max = Math.max(...semua, 1)
    const skala = (v) => {
      if (v <= 0) return 'var(--sc-high)'
      const t = Math.pow(v / max, 0.55)
      if (t > 0.8) return 'var(--s1)'
      if (t > 0.6) return 'var(--s2)'
      if (t > 0.4) return 'var(--s3)'
      if (t > 0.22) return 'var(--s4)'
      if (t > 0.08) return 'var(--s5)'
      return 'var(--s6)'
    }
    const head = labels.map((l, i) =>
      `<th>${i % 4 === 0 || i === labels.length - 1 ? esc(l) : ''}</th>`).join('')
    const body = rows.map((r) => `<tr><th class="row-h" title="${esc(r.label)}">${esc(r.label)}</th>${
      r.vals.map((v, i) => `<td><i class="${r.noEffort[i] ? 'no-eff' : ''}" style="background:${skala(v)}"
        title="${esc(r.label)}, ${esc(labels[i])}
Produksi: ${DATA.FMT.rp(v)}${r.noEffort[i] ? '\nTidak ada input effort sama sekali' : ''}"></i></td>`).join('')
    }</tr>`).join('')
    return `<div class="tbl-wrap"><table class="heat"><thead><tr><th></th>${head}</tr></thead><tbody>${body}</tbody></table></div>`
  },

  /* ── Mini bar deret pendek ── effort 7 hari terakhir per MO. */
  miniSeries(vals, { w = 62, h = 20, warna = 'var(--s3)' } = {}) {
    if (!vals || !vals.length) return ''
    const max = Math.max(...vals, 1)
    const gap = 1.6
    const bw = (w - gap * (vals.length - 1)) / vals.length
    return `<svg class="chart" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true">${
      vals.map((v, i) => {
        const bh = Math.max(1, (v / max) * (h - 2))
        return `<rect x="${(i * (bw + gap)).toFixed(1)}" y="${(h - bh).toFixed(1)}" width="${bw.toFixed(1)}"
          height="${bh.toFixed(1)}" rx="1" fill="${v === 0 ? 'var(--sc-highest)' : warna}"/>`
      }).join('')
    }</svg>`
  },

  /* ── Bar bertumpuk horizontal ── perbandingan premi per status. */
  stack(items, { h = 30 } = {}) {
    const data = (items || []).filter((d) => d.v > 0)
    if (!data.length) return kosong()
    const jml = data.reduce((s, d) => s + d.v, 0)
    let acc = 0
    const seg = data.map((d) => {
      const wpct = (d.v / jml) * 100
      const x = acc
      acc += wpct
      return `<rect x="${x.toFixed(2)}%" y="0" width="${wpct.toFixed(2)}%" height="${h}" fill="${d.c}">
        <title>${esc(d.l)}: ${esc(DATA.FMT.rp(d.v))} (${DATA.FMT.pct(d.v / jml)})</title></rect>`
    }).join('')
    return `<svg class="chart" height="${h}" style="border-radius:var(--r-xs);overflow:hidden"
      role="img" aria-label="Komposisi premi">${seg}</svg>`
  },


  /* ── Delta ── */
  delta(v, { fmt = (x) => DATA.FMT.pctSigned(x), balik = false } = {}) {
    const baik = balik ? v < 0 : v > 0
    const kelas = Math.abs(v) < 0.005 ? 'flat' : baik ? 'up' : 'down'
    const panah = Math.abs(v) < 0.005 ? '→' : v > 0 ? '↑' : '↓'
    return `<span class="delta delta--${kelas}">${panah} ${esc(fmt(v))}</span>`
  },

  bar(pct, kelas = '') {
    return `<span class="mini-bar ${kelas}"><i style="width:${Math.min(100, Math.max(0, pct * 100)).toFixed(1)}%"></i></span>`
  },

  /* ── Batang menuju target ──
     Menumpuk beberapa bagian pada satu batang, dengan garis target dan sisa
     kekurangan yang terlihat. Dipakai untuk menjawab apakah target tercapai
     tanpa perlu membaca tabel angka lebih dulu. */
  targetBar(bagian, target, { h = 44, label = 'Proyeksi terhadap target' } = {}) {
    const isi = (bagian || []).filter((d) => d.v > 0)
    if (!isi.length || !target) return kosong()
    const jumlah = isi.reduce((s, d) => s + d.v, 0)
    const maks = Math.max(jumlah, target) * 1.06
    const pos = (v) => (v / maks) * 100

    let acc = 0
    const seg = isi.map((d) => {
      const x = pos(acc)
      const w = pos(d.v)
      acc += d.v
      return `<div class="tbar__seg" style="left:${x.toFixed(2)}%;width:${w.toFixed(2)}%;background:${d.c}"
        title="${esc(d.l)}: ${esc(DATA.FMT.rp(d.v))}"></div>`
    }).join('')

    const kurang = target - jumlah
    const blokKurang = kurang > 0
      ? `<div class="tbar__seg tbar__seg--kurang" style="left:${pos(jumlah).toFixed(2)}%;width:${pos(kurang).toFixed(2)}%"
          title="Kekurangan terhadap target: ${esc(DATA.FMT.rp(kurang))}"></div>`
      : ''

    return `<div class="tbar" role="img" aria-label="${esc(label)}" style="height:${h}px">
      ${seg}${blokKurang}
      <div class="tbar__target" style="left:${pos(target).toFixed(2)}%"></div>
      <span class="tbar__targetlbl" style="left:${pos(target).toFixed(2)}%">Target ${esc(DATA.FMT.rp(target))}</span>
    </div>
    <div class="legend">${isi.map((d) =>
      `<span><i style="background:${d.c}"></i>${esc(d.l)} <b class="num">${esc(DATA.FMT.rp(d.v))}</b></span>`).join('')}
      ${kurang > 0 ? `<span><i class="legend__kurang"></i>Kekurangan <b class="num">${esc(DATA.FMT.rp(kurang))}</b></span>` : ''}
    </div>`
  },

  /* ── Batang perbandingan dua periode ──
     Dua batang berdampingan dengan selisihnya. Dipakai pada tabel
     perbandingan tahun agar arah perubahan terbaca tanpa membandingkan
     dua angka secara manual. */
  duaTahun(v25, v26, maks) {
    const p = (v) => Math.max(0, Math.min(100, (v / maks) * 100))
    return `<span class="dua">
      <span class="dua__baris"><i style="width:${p(v25).toFixed(1)}%;background:var(--s5)"></i></span>
      <span class="dua__baris"><i style="width:${p(v26).toFixed(1)}%;background:var(--s2)"></i></span>
    </span>`
  },

  /* ── Peta alur integrasi ──
     Menjelaskan posisi dashboard ini di dalam Uniport: dari aplikasi mana
     datanya berasal, siapa penggunanya, dan aplikasi mana yang direncanakan
     menyusul pada tahap berikutnya. */
  petaIntegrasi() {
    const W = 940, H = 392
    const kotak = (x, y, w, h, judul, sub, gaya) => {
      const aktif = gaya === 'aktif', pusat = gaya === 'pusat'
      const isi = pusat ? 'var(--secondary)' : 'var(--sc-lowest)'
      const garis = pusat ? 'var(--secondary)' : aktif ? 'var(--s3)' : 'var(--outline)'
      const warnaJudul = pusat ? '#fff' : 'var(--on-surface)'
      const warnaSub = pusat ? 'rgba(255,255,255,.72)' : 'var(--on-surface-var)'
      const dash = aktif || pusat ? '' : 'stroke-dasharray="5 4"'
      const opac = aktif || pusat ? '1' : '.72'
      const barisSub = String(sub).split('\n')
      return `<g opacity="${opac}">
        <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="${isi}"
          stroke="${garis}" stroke-width="${pusat ? 0 : 1.4}" ${dash}/>
        <text x="${x + 14}" y="${y + 23}" style="font-size:13px;font-weight:600" fill="${warnaJudul}">${esc(judul)}</text>
        ${barisSub.map((s, i) => `<text x="${x + 14}" y="${y + 41 + i * 15}" style="font-size:11px"
          fill="${warnaSub}">${esc(s)}</text>`).join('')}
      </g>`
    }

    const kolom = (x, teks) => `<text x="${x}" y="20" style="font-size:10.5px;font-weight:600;letter-spacing:.09em"
      fill="var(--on-surface-var)">${esc(teks)}</text>`

    /* Kolom kiri: sumber data */
    const kiri = [
      kotak(16, 34, 234, 62, 'eReport', 'Produksi, klaim, surplus\nper Kanwil, Divisi, dan Cabang', 'aktif'),
      kotak(16, 106, 234, 62, 'Pega ASMPro', 'Matrix Distribution Channel\nprospek dan effort marketing', 'aktif'),
      kotak(16, 208, 234, 46, 'HCC dan HCQ', 'Target, budget, produktivitas', 'nanti'),
      kotak(16, 264, 234, 46, 'Optimalisasi Treaty', 'Kapasitas dan akseptasi risiko', 'nanti'),
      kotak(16, 320, 234, 46, 'Cashbank dan eCashier', 'Penerimaan dan penagihan premi', 'nanti'),
    ].join('')

    /* Kolom tengah: Uniport */
    const tengah = [
      kotak(330, 34, 280, 62, 'UNIPORT', 'Universal Portal, autentikasi tunggal\nsatu kali verifikasi untuk semua aplikasi', 'aktif'),
      kotak(330, 126, 280, 92, 'Executive Dashboard', 'Menggabungkan data produksi dan effort\ndalam satu penyajian\nHak akses mengikuti level jabatan', 'pusat'),
    ].join('')

    /* Kolom kanan: pengguna */
    const kanan = [
      kotak(706, 34, 218, 44, 'Direksi', 'Cakupan nasional', 'aktif'),
      kotak(706, 90, 218, 44, 'Pinwil dan Kadiv', 'Cakupan wilayah atau divisi', 'aktif'),
      kotak(706, 146, 218, 44, 'Pimpinan Cabang', 'Cakupan satu cabang', 'aktif'),
      kotak(706, 202, 218, 44, 'Marketing Officer', 'Matrix milik sendiri', 'aktif'),
    ].join('')

    /* Penghubung: rel vertikal agar garis tidak saling menyilang */
    const relKiri = 290, relKanan = 660, pusatY = 172
    const cabangKiri = [65, 137, 231, 287, 343]
    const cabangKanan = [56, 112, 168, 224]

    const garisKiri = cabangKiri.map((y, i) => {
      const nanti = i >= 2
      return `<path d="M250 ${y} H${relKiri} V${pusatY}" fill="none" stroke="var(--${nanti ? 'outline' : 's3'})"
        stroke-width="1.4" ${nanti ? 'stroke-dasharray="5 4"' : ''} opacity="${nanti ? '.6' : '1'}"/>`
    }).join('')

    const garisKanan = cabangKanan.map((y) =>
      `<path d="M${relKanan} ${pusatY} V${y} H706" fill="none" stroke="var(--s3)" stroke-width="1.4"/>`).join('')

    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img"
      aria-label="Peta alur penggabungan data eReport dan ASMPro ke dalam Uniport">
      <defs><marker id="pnh" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7"
        orient="auto"><path d="M0 1 L9 5 L0 9 z" fill="var(--s3)"/></marker></defs>
      ${kolom(16, 'SUMBER DATA')}${kolom(330, 'PORTAL')}${kolom(706, 'PENGGUNA')}
      ${garisKiri}${garisKanan}
      <path d="M${relKiri} ${pusatY} H330" fill="none" stroke="var(--s3)" stroke-width="1.8" marker-end="url(#pnh)"/>
      <path d="M610 ${pusatY} H${relKanan}" fill="none" stroke="var(--s3)" stroke-width="1.8"/>
      <text x="16" y="196" style="font-size:10px;font-weight:600;letter-spacing:.08em"
        fill="var(--on-surface-var)">MENYUSUL PADA TAHAP BERIKUTNYA</text>
      ${kiri}${tengah}${kanan}
      <text x="330" y="240" style="font-size:11px" fill="var(--on-surface-var)">Tahap 1 mencakup eReport dan ASMPro.</text>
      <text x="330" y="256" style="font-size:11px" fill="var(--on-surface-var)">Aplikasi lain menyusul tanpa mengubah</text>
      <text x="330" y="272" style="font-size:11px" fill="var(--on-surface-var)">cara pengguna mengaksesnya.</text>
    </svg>`
  },
}
