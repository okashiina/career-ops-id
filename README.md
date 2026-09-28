# KarierOps Indonesia

**Asisten pencarian kerja AI yang berangkat dari kebutuhan kandidat Indonesia.** KarierOps Indonesia membantu menyaring lowongan di Indonesia, Asia-Pasifik, dan remote global berdasarkan CV, target peran, serta preferensi kerja kamu.

> Ini fork komunitas dari [career-ops](https://github.com/santifer/career-ops) karya Santiago Fernández de Valderrama. Proyek ini bukan produk resmi upstream. Lihat [kredit dan atribusi](ATTRIBUTION.md).

## Kenapa fork ini?

Pencarian kerja sering dimulai dari lowongan, padahal agen perlu memahami kandidat lebih dulu. Fork ini mewajibkan onboarding lokal: target pekerjaan, CV terbaru, profil kandidat, dan preferensi WFO, hybrid, atau remote. Setelah itu, sistem menyimpan sumber profil di user layer lokal agar pencarian dan evaluasi berikutnya konsisten.

## Kemampuan

- Cari dan evaluasi lowongan Indonesia, Asia-Pasifik, dan remote global.
- Saring berdasarkan level, lokasi, model kerja, kompensasi, serta batasan kandidat.
- Tailor CV dan siapkan materi lamaran berbasis fakta dari CV dan profil.
- Catat pipeline lamaran, follow-up, dan hasil.
- Teliti peluang cold outreach saat diminta atau relevan.
- Bekerja dengan AI coding CLI yang didukung upstream career-ops.

## Privasi dan onboarding

Pada penggunaan pertama, agen akan meminta informasi yang belum ada: target role dan level, lokasi/track, model kerja WFO/hybrid/remote, serta CV terbaru (unggah, tempel, atau berikan path lokal). Gaji, jenis kerja, bahasa, deal-breaker, dan izin kerja bersifat opsional.

Setelah kamu memberi informasinya, agen menyimpannya di `cv.md`, `config/profile.yml`, dan `modes/_profile.md` dalam user layer lokal. File kandidat diabaikan oleh Git, jadi tidak masuk ke commit atau GitHub Pages secara default. AI provider yang kamu pilih tetap dapat memproses konten saat kamu menjalankan workflow AI. Jangan commit data kandidat atau rahasia.

## Mulai

1. Clone repo ini dan ikuti [panduan setup upstream](https://github.com/santifer/career-ops/blob/main/docs/SETUP.md) untuk dependensi dan AI CLI.
2. Buka CLI pilihanmu dari folder repo, lalu panggil skill `career-ops-id` atau minta onboarding KarierOps Indonesia.
3. Jawab pertanyaan onboarding dan berikan CV terbaru. Agen akan menyimpan profil di user layer lokal.
4. Setelah onboarding, minta pencarian kerja, evaluasi URL lowongan, tailoring CV, atau pembaruan tracker.

Untuk aturan wilayah dan sumber pencarian, lihat `.agents/skills/career-ops-id/references/indonesia-market.md` dan `remote-boards.md`. Untuk rute mode dan batasan kerja, lihat skill `career-ops-id` serta `AGENTS.md`.

## Cakupan geografis

Prioritas pencarian: Indonesia terlebih dahulu; lalu Singapura, Malaysia, Thailand, Vietnam, Filipina, dan Asia-Pasifik lain jika lowongan terbuka bagi kandidat atau menawarkan sponsorship. Remote bukan bukti otomatis bahwa pelamar Indonesia memenuhi syarat; agen harus memeriksa negara, zona waktu, status kontrak, dan aturan izin kerja pada sumber lowongan.

## Kredit dan lisensi

Kode dan alur career-ops upstream digunakan sesuai lisensi MIT. Kredit penulis asli dan ringkasan perubahan fork tersedia di [ATTRIBUTION.md](ATTRIBUTION.md). Perubahan Indonesia pada fork ini berfokus pada onboarding wajib, personalisasi lokal, dan panduan kandidat Indonesia. Lisensi dan kebijakan merek upstream tetap berlaku untuk materi upstream.

## GitHub Pages

Situs pengenalan statis ada di [`site/`](site/). Workflow GitHub Actions menerbitkan situs dari folder itu saat perubahan didorong ke branch `main`. Aktifkan **Settings → Pages → Build and deployment → Source: GitHub Actions** sekali di repository settings. URL Pages akan tampil di halaman Settings → Pages setelah deployment pertama berhasil.

## Kontribusi

Saran sumber lowongan, terjemahan, perbaikan onboarding, dan dokumentasi dipersilakan. Jangan sertakan CV, email, nomor telepon, cookie, token, atau data pribadi kandidat di issue maupun pull request.
