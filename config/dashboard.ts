// Konfigurasi PUBLIK: masuk HTML. Jangan isi password, token, atau secret.

const SEED = 20260731

const HARI_MULAI = '2026-01-01'

const HARI_AKHIR = '2026-07-31'

const BULAN_TERSEDIA = 7

const BULAN_SETAHUN = 12

const RASIO_BIAYA = 0.32

const BULAN_P25 = 12

const BULAN_P26 = 7

const AMBANG_UNIT = 2e9

const AMBANG_RISIKO = { tinggi: 0.6, sedang: 0.4 }

const AMBANG_TURUN = 100e6

const BOBOT_STATUS = {
  Cold: 0.10,
  Warm: 0.25,
  Hot: 0.50,
  'Terbit Polis': 0,
  Pending: 0.05,
  Batal: 0,
}

const SLA_STATUS = { Hot: 3, Warm: 7, Cold: 14 }

const BOBOT_PRIORITAS = { Hot: 3, Warm: 2, Cold: 1 }

const FAKTOR_TENGGAT = { lewat: 3, hariIni: 2, segera: 1.2, minggu: 1, nanti: 0.6 }
