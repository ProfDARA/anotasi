# UNTIDAR RRE100 · Web App Anotasi Manual

Aplikasi untuk anotasi buta 100 kalimat akademik UNTIDAR. Setiap rater memiliki ruang anotasi terpisah. Saat rater masuk, perubahan disimpan di browser dan disinkronkan ke Postgres melalui Vercel Function.

## Deploy ke Vercel dengan database

1. Impor folder repo ini sebagai project di Vercel.
2. Di Vercel Marketplace, tambahkan integrasi Postgres seperti Neon ke project. Hubungkan connection string ke salah satu nama environment variable yang didukung API: `POSTGRES_URL` atau `DATABASE_URL`.
3. Tambahkan environment variable `RATER_TOKENS` sebagai JSON object berisi ID rater dan token rahasia masing-masing. Urutkan sesuai giliran anotasi (R01 dahulu, lalu R02). API menahan rater berikutnya sampai rater sebelumnya menuntaskan 100 skor Pass 1 dan menguncinya. Contoh format (ganti nilai placeholder, jangan gunakan contoh sebagai token):

   ```json
   {"R01":"GANTI_DENGAN_TOKEN_ACAK_PANJANG","R02":"TOKEN_ACAK_BERBEDA"}
   ```

4. Deploy ulang project. Tabel `rre100_annotations` dibuat otomatis saat API pertama kali dipanggil.
5. Berikan ID dan token secara terpisah kepada setiap rater. Token tidak disimpan di repo; browser mengirimnya hanya ke endpoint project yang sama.

Vercel Function berada di `api/annotations.js`. Gunakan URL deployment HTTPS. Jika database atau token belum disiapkan, mode sinkronisasi belum dapat digunakan.

## Cara menggunakan

- Masuk memakai ID dan token rater untuk sinkronisasi cloud. Data dimuat dari database dan disimpan otomatis setelah perubahan.
- Rater yang sama dapat melanjutkan dari browser/perangkat lain dengan kredensial yang sama. Tiap ID rater menyimpan anotasi terpisah.
- Pilih **Lanjut lokal saja** untuk uji coba tanpa database. Data mode lokal hanya ada di browser/perangkat itu.
- Ekspor backup JSON berkala. CSV Pass 1, Pass 2, serta backup JSON tetap tersedia untuk analisis dan arsip.
- Untuk memindahkan anotasi lama yang masih ada di localStorage versi sebelumnya, ekspor backup dari versi lama, masuk sebagai rater yang tepat, lalu impor backup JSON.

## Protokol anotasi

1. Pass 1: beri skor 1-5 (`1 = sangat sulit`, `5 = sangat mudah`), lalu isi alasan spontan, keyakinan, dan kebutuhan konteks.
2. Setelah semua 100 skor terisi, ekspor backup JSON lalu tekan **Kunci Pass 1**. Skor dibekukan dan CSV Pass 1 diunduh.
3. Pass 2: nilai lima faktor 0-3, faktor dominan, bukti tekstual, dan perubahan minimal.
4. Ekspor Pass 1 CSV, Pass 2 CSV, dan backup JSON untuk analisis.

## Privasi dan batasan

- Kalimat yang disertakan hanya teks, `sample_id`, `sentence_id`, dan `urutan_acak`. Kunci desain sampel, jenis pasangan, fase discovery/holdout, dan fitur proksi tidak tertanam di aplikasi.
- API hanya mengizinkan ID yang terdaftar di `RATER_TOKENS`, dan setiap rater hanya dapat membaca atau menulis baris datanya sendiri.
- Token adalah kredensial akses. Bagikan hanya kepada rater yang dituju dan rotasi token dengan memperbarui environment variable bila bocor.
- Autosave lokal berlangsung segera; sinkronisasi cloud memakai jeda singkat agar input teks tidak mengirim permintaan untuk setiap karakter. Indikator status menunjukkan hasil sinkronisasi. Jika sinkronisasi gagal, salinan lokal tetap ada dan perlu dicadangkan.
- Jangan menaruh CSV kunci eksperimen di folder deploy sebelum Pass 1 final.

## Berkas

- `index.html`: aplikasi anotasi dan antarmuka rater.
- `api/annotations.js`: endpoint Vercel untuk autentikasi rater dan persistensi database.
- `package.json`: dependency driver Postgres serverless.
- `UNTIDAR_100_Pass1_Anotasi_Blind.csv`: template CSV awal.
- `UNTIDAR_100_Pass2_Audit_Faktor.csv`: template audit faktor.

## Analisis berikutnya

Gabungkan Pass 1/Pass 2 berdasar `sample_id` dan `sentence_id` dengan CSV kunci eksperimen yang disimpan terpisah. Gunakan 80 discovery untuk induksi rubrik dan 20 holdout yang belum dilihat sebagai evaluasi, tanpa menggunakan holdout untuk pengembangan rubrik.
