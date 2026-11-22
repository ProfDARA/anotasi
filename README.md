# UNTIDAR RRE100 · Web App Anotasi Manual

Aplikasi untuk anotasi buta 100 kalimat akademik UNTIDAR. Pilih R01 atau R02; anotasi kedua rater disimpan terpisah dan disinkronkan ke Postgres melalui Vercel Function.

## Deploy ke Vercel dengan database

1. Impor folder repo ini sebagai project di Vercel.
2. Di Vercel Marketplace, tambahkan integrasi Postgres seperti Neon ke project. Pastikan connection string tersedia sebagai `POSTGRES_URL` atau `DATABASE_URL`.
3. Deploy project. Tabel `rre100_annotations` dibuat otomatis ketika API pertama kali dipanggil.

Tidak ada token atau kata sandi rater. ID dibatasi ke R01 dan R02. R02 baru dapat masuk setelah R01 menyelesaikan 100 skor Pass 1 dan menguncinya. Gunakan URL deployment HTTPS. Jika database belum terhubung, pilih mode lokal sementara.

## Cara menggunakan

- Pilih **Rater 1 (R01)** atau **Rater 2 (R02)** untuk mulai/sambung anotasi.
- Perubahan disimpan di browser dan disinkronkan otomatis ke database. Rater yang sama dapat melanjutkan dari perangkat lain dengan memilih ID yang sama.
- Pilih **Lanjut lokal saja** untuk uji coba tanpa database; data mode ini hanya ada di browser/perangkat tersebut.
- Ekspor backup JSON berkala. CSV Pass 1, Pass 2, dan backup JSON tetap tersedia untuk analisis dan arsip.
- Untuk memindahkan anotasi lama dari localStorage versi sebelumnya, ekspor backup dari versi lama, pilih ID rater yang sesuai, lalu impor backup JSON.

## Protokol anotasi

1. Pass 1: beri skor 1-5 (`1 = sangat sulit`, `5 = sangat mudah`), lalu isi alasan spontan, keyakinan, dan kebutuhan konteks.
2. Setelah semua 100 skor terisi, ekspor backup JSON lalu tekan **Kunci Pass 1**. Skor dibekukan dan CSV Pass 1 diunduh.
3. Pass 2: nilai lima faktor 0-3, faktor dominan, bukti tekstual, dan perubahan minimal.
4. Ekspor Pass 1 CSV, Pass 2 CSV, dan backup JSON untuk analisis.

## Privasi dan batasan

- Kalimat yang disertakan hanya teks, `sample_id`, `sentence_id`, dan `urutan_acak`. Kunci desain sampel, jenis pasangan, fase discovery/holdout, dan fitur proksi tidak tertanam di aplikasi.
- ID rater hanya memisahkan anotasi; tidak ada autentikasi.
- Autosave lokal berlangsung segera; sinkronisasi cloud memakai jeda singkat agar input teks tidak mengirim permintaan untuk setiap karakter. Indikator status menunjukkan hasil sinkronisasi. Jika sinkronisasi gagal, salinan lokal tetap ada dan perlu dicadangkan.
- Jangan menaruh CSV kunci eksperimen di folder deploy sebelum Pass 1 final.

## Berkas

- `index.html`: aplikasi anotasi dan pemilihan rater.
- `api/annotations.js`: endpoint Vercel untuk persistensi database.
- `package.json`: dependency driver Postgres serverless.
- `UNTIDAR_100_Pass1_Anotasi_Blind.csv`: template CSV awal.
- `UNTIDAR_100_Pass2_Audit_Faktor.csv`: template audit faktor.

## Analisis berikutnya

Gabungkan Pass 1/Pass 2 berdasar `sample_id` dan `sentence_id` dengan CSV kunci eksperimen yang disimpan terpisah. Gunakan 80 discovery untuk induksi rubrik dan 20 holdout yang belum dilihat sebagai evaluasi, tanpa menggunakan holdout untuk pengembangan rubrik.
