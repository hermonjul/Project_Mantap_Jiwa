/* ══════════════════════════════════════════════════════════════════
   anotasi.js, mode peta sumber data.

   Hanya ikut dibangun ke dist/peta-sumber.html, tidak ke dashboard utama.
   Membaca parameter URL ?peta=<id> dari PETA_SUMBER, membuka dashboard pada
   peran yang diminta, menyisakan seksi yang dipetakan, lalu menggambar kotak
   bernomor di atas elemen yang ditunjuk, lengkap dengan legenda di bawahnya.

   Kotak diletakkan dari getBoundingClientRect(), jadi tetap menempel walau
   tata letak dashboard berubah. Tangkap ulang cukup dengan menjalankan
   tools/tangkap-peta.mjs.

   Tanpa parameter ?peta, berkas ini menampilkan daftar tautan ke semua peta
   supaya mudah diperiksa manual.
   ══════════════════════════════════════════════════════════════════ */

;(function () {
  const param = new URLSearchParams(location.search)
  const idPeta = param.get('peta')

  const JARAK = 5 // jarak kotak dari tepi elemen, dalam piksel

  function gaya() {
    const el = document.createElement('style')
    el.textContent = `
      *, *::before, *::after { transition: none !important; animation: none !important; }
      body.peta { position: relative; }
      body.peta-satu-kolom .grid--2 { grid-template-columns: 1fr !important; }
      body.peta .badge--sim, body.peta .up-topbar--dash .badge--navy,
      body.peta .dash-foot, body.peta details.rincian, body.peta .peta-sembunyi { display: none !important; }
      .peta-kotak {
        position: absolute; z-index: 9000; pointer-events: none;
        border: 3px solid var(--w); border-radius: 10px;
        box-shadow: 0 0 0 2px rgba(255,255,255,0.85);
      }
      .peta-label {
        position: absolute; left: -3px; top: -15px; z-index: 9001;
        display: inline-flex; align-items: center; gap: 6px;
        padding: 3px 10px 3px 3px; border-radius: 999px;
        background: var(--w); color: #fff; white-space: nowrap;
        font: 700 13px/1.2 system-ui, -apple-system, "Segoe UI", Arial, sans-serif;
        box-shadow: 0 1px 3px rgba(0,0,0,0.25);
      }
      .peta-label--kanan { left: auto; right: -3px; top: 50%; transform: translate(100%, -50%); margin-right: -8px; }
      .peta-label--dalam-kanan { left: auto; right: 10px; top: 50%; transform: translateY(-50%); }
      .peta-label--tengah { left: 50%; top: 50%; transform: translate(-50%, -50%); }
      .peta-label--bawah { top: auto; bottom: -15px; transform: translateY(50%); }
      .peta-label__no {
        display: inline-grid; place-items: center; width: 22px; height: 22px;
        border-radius: 50%; background: #fff; color: var(--w); font-size: 12px;
      }
      .peta-legenda {
        margin: 8px 32px 28px; padding: 16px 20px;
        border: 1px solid #d5dbe3; border-radius: 12px; background: #fff; color: #1c2430;
        font: 14px/1.5 system-ui, -apple-system, "Segoe UI", Arial, sans-serif;
      }
      .peta-legenda h3 { margin: 0 0 10px; font-size: 15px; color: #0a2342; }
      .peta-legenda ol { margin: 0; padding: 0; list-style: none;
        display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px 28px; }
      .peta-legenda li { display: flex; gap: 10px; align-items: baseline; }
      .peta-legenda__no { flex: none; display: inline-grid; place-items: center;
        width: 22px; height: 22px; border-radius: 50%; color: #fff; font-weight: 700; font-size: 12px; }
      .peta-legenda__sistem { font-weight: 700; }
      .peta-indeks { max-width: 720px; margin: 40px auto; font: 15px/1.6 system-ui, Arial, sans-serif; }
    `
    document.head.appendChild(el)
  }

  /* ── Penunjuk elemen, lihat keterangan di src/peta-sumber.js ── */
  function awalan(teks, cari) {
    return (teks || '').trim().toLowerCase().startsWith(cari.toLowerCase())
  }

  function cariBand(i) {
    const el = document.getElementById('dash-root').children[i]
    if (!el) throw new Error('seksi ke-' + i + ' tidak ada')
    return el
  }

  function cariKartu(band, judul) {
    const k = [...band.querySelectorAll('section.card')].find((c) => {
      const t = c.querySelector(':scope > .card__head .card__title')
      return t && (awalan(t.textContent, judul) || t.textContent.toLowerCase().includes(judul.toLowerCase()))
    })
    if (!k) throw new Error('kartu "' + judul + '" tidak ada')
    return k
  }

  function cariStat(band, label) {
    const s = [...band.querySelectorAll('.stat')].find((x) =>
      awalan((x.querySelector('.stat__label') || {}).textContent, label))
    if (!s) throw new Error('kartu angka "' + label + '" tidak ada')
    return s
  }

  /* Separuh padding kiri sel pada kolom ke-i, dibaca dari baris data pertama.
     Garis kotak diletakkan di tengah ruang kosong itu. */
  function geser(kartu, i) {
    const baris = kartu.querySelector('tbody tr')
    const sel = baris && baris.children[i]
    const pad = sel ? parseFloat(getComputedStyle(sel).paddingLeft) || 0 : 0
    return Math.max(1, Math.min(10, pad / 2))
  }

  /* Kotak untuk sekumpulan kolom berdampingan. Tingginya dibatasi wadah
     tabel, karena sebagian tabel punya gulir sendiri. */
  function kotakKolom(kartu, judulKolom) {
    const th = [...kartu.querySelectorAll('thead th')]
    const idx = judulKolom.map((j) => {
      const i = th.findIndex((x) => x.textContent.trim().toLowerCase() === j.toLowerCase())
      if (i < 0) throw new Error('kolom "' + j + '" tidak ada')
      return i
    })
    const a = th[Math.min(...idx)].getBoundingClientRect()
    const b = th[Math.max(...idx)].getBoundingClientRect()
    const wadah = kartu.querySelector('.tbl-wrap').getBoundingClientRect()
    const tabel = kartu.querySelector('table').getBoundingClientRect()
    // Kotak kolom dibuat pas di batas sel, tidak dilebarkan, supaya garis
    // kotak yang bersebelahan tidak memotong angka rata kanan.
    return {
      // Kolom paling kiri dan paling kanan tidak punya tetangga, jadi boleh
      // dilebarkan keluar seperti kotak biasa. Kolom di tengah digeser ke
      // dalam ruang padding sel, tidak lebih, supaya garisnya tidak menyentuh
      // teks rata kiri di kolom ini maupun teks rata kanan di kolom sebelumnya.
      left: Math.min(...idx) === 0 ? a.left - JARAK : a.left + geser(kartu, Math.min(...idx)),
      right: Math.max(...idx) === th.length - 1 ? b.right + JARAK : b.right + geser(kartu, Math.max(...idx) + 1),
      top: a.top,
      bottom: Math.min(wadah.bottom, tabel.bottom), rapat: true,
    }
  }

  function rectDari(di) {
    if (di.css) {
      let el = document.querySelector(di.css)
      if (!el) throw new Error('selector ' + di.css + ' tidak ada')
      if (di.induk) el = el.parentElement
      return el.getBoundingClientRect()
    }
    const band = cariBand(di.band)
    if (di.kepala) return band.querySelector(':scope > .band__head').getBoundingClientRect()
    if (di.grid !== undefined) return band.querySelectorAll(':scope > .grid')[di.grid].getBoundingClientRect()
    if (di.kanal !== undefined) return band.querySelectorAll('.kanal-baris')[di.kanal].getBoundingClientRect()
    if (di.stat) {
      const s = cariStat(band, di.stat)
      if (!di.bagian) return s.closest('section.card').getBoundingClientRect()
      const bagian = s.querySelector('.stat__' + di.bagian)
      if (!bagian) throw new Error('bagian ' + di.bagian + ' pada "' + di.stat + '" tidak ada')
      return bagian.getBoundingClientRect()
    }
    if (di.kartu) {
      const k = cariKartu(band, di.kartu)
      if (di.kolom) return kotakKolom(k, di.kolom)
      if (di.bagian === 'tabel') return k.querySelector('.tbl-wrap').getBoundingClientRect()
      if (di.bagian === 'ket') return k.querySelector('.ket-status').getBoundingClientRect()
      return k.getBoundingClientRect()
    }
    throw new Error('penunjuk tidak dikenal: ' + JSON.stringify(di))
  }

  /* ── Menyiapkan layar ── */
  function siapkanLayar(peta) {
    document.body.classList.add('peta')
    if (peta.satuKolom) document.body.classList.add('peta-satu-kolom')
    const sel = document.getElementById('role-select') as HTMLSelectElement
    sel.value = peta.peran
    sel.dispatchEvent(new Event('change'))

    // Sisakan hanya seksi yang dipetakan.
    Array.from(document.getElementById('dash-root').children).forEach((el, i) => {
      if (!peta.band.includes(i)) el.classList.add('peta-sembunyi')
    })
    if (!peta.topbar) {
      document.querySelector('.up-topbar--dash').classList.add('peta-sembunyi')
      document.getElementById('dash-scope').classList.add('peta-sembunyi')
    }

    // Tabel yang punya gulir sendiri dibiarkan pada posisi teratas.
    document.querySelectorAll('.tbl-wrap').forEach((w) => { w.scrollTop = 0 })

    // Catatan kecil yang tidak relevan untuk tim IT disembunyikan, termasuk
    // yang menyebut status prototipe, supaya gambar hanya bicara sistem asal.
    document.querySelectorAll('#screen-dash .hint, #screen-dash .disclaim, #screen-dash .band__note').forEach((el) => {
      if (/simulasi|prototipe/i.test(el.textContent)) el.classList.add('peta-sembunyi')
    })
  }

  function gambarKotak(peta) {
    document.querySelectorAll('.peta-kotak').forEach((el) => el.remove())
    const sx = window.scrollX
    const sy = window.scrollY
    peta.kotak.forEach((k, i) => {
      const s = SISTEM_SUMBER[k.sistem]
      const r = rectDari(k.di)
      const el = document.createElement('div')
      el.className = 'peta-kotak'
      el.style.setProperty('--w', s.warna)
      const j = r.rapat ? 0 : JARAK
      el.style.left = (r.left + sx - j) + 'px'
      el.style.top = (r.top + sy - JARAK) + 'px'
      el.style.width = (r.right - r.left + j * 2) + 'px'
      el.style.height = (r.bottom - r.top + JARAK * 2) + 'px'
      const posisi = k.label ? ' peta-label--' + k.label : ''
      el.innerHTML = `<span class="peta-label${posisi}"><span class="peta-label__no">${i + 1}</span>${s.label}</span>`
      document.body.appendChild(el)
    })
  }

  function tulisLegenda(peta) {
    const sec = document.createElement('section')
    sec.className = 'peta-legenda'
    sec.innerHTML = `<h3>${peta.judul}</h3><ol>${peta.kotak.map((k, i) => {
      const s = SISTEM_SUMBER[k.sistem]
      return `<li><span class="peta-legenda__no" style="background:${s.warna}">${i + 1}</span>
        <span><span class="peta-legenda__sistem" style="color:${s.warna}">${s.label}${s.sub ? ` (${s.sub})` : ''}</span>
        · ${k.bagian}</span></li>`
    }).join('')}</ol>`
    document.getElementById('screen-dash').appendChild(sec)
  }

  function indeks() {
    document.body.innerHTML = `<div class="peta-indeks"><h1>Peta sumber data</h1><ol>${
      PETA_SUMBER.map((p) => `<li><a href="?peta=${p.id}">${p.id}</a> · ${p.judul}</li>`).join('')
    }</ol></div>`
  }

  function mulai() {
    gaya()
    if (!idPeta) { indeks(); return }
    const peta = PETA_SUMBER.find((p) => p.id === idPeta)
    if (!peta) { document.title = 'GALAT: peta ' + idPeta + ' tidak ada'; return }
    const gambar = () => {
      try {
        gambarKotak(peta)
        // Tinggi halaman ditulis ke judul supaya penangkap layar tahu ukurannya.
        document.title = 'TINGGI:' + Math.ceil(document.documentElement.scrollHeight)
      } catch (e) {
        document.title = 'GALAT: ' + e.message
        throw e
      }
    }
    try {
      siapkanLayar(peta)
      tulisLegenda(peta)
    } catch (e) {
      document.title = 'GALAT: ' + e.message
      throw e
    }
    gambar()
    // Tata letak masih bisa bergeser sesudah gambar pertama, misalnya karena
    // font selesai dimuat atau batang gulir menghilang setelah seksi lain
    // disembunyikan. Kotak digambar ulang setelah semuanya tenang.
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(gambar)
    setTimeout(gambar, 400)
    setTimeout(gambar, 1500)
    window.addEventListener('resize', gambar)
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(mulai, 0))
  else setTimeout(mulai, 0)
})()
