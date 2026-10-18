# Sinkronisasi Apps Script yang aman

Target existing: **BirdKas V1**, Script ID `1c1gYgZvbqTwQA2bmu1LTAhrXKDoaOrJs0q7XYuHUtW6_gc2nUzELnu4c`, terikat ke **BirdKas V1.0**. Tidak membuat project baru. Tidak ada perintah push/deploy yang dijalankan dalam pekerjaan V0.2 ini.

## Konfigurasi lokal

`.clasp.json` lokal sudah disiapkan dengan scriptId target dan rootDir `backend`; diabaikan Git. `.clasp.example.json` adalah template yang boleh masuk Git (Script ID adalah identifier, bukan credential). Jika clone source dari GitHub nanti, salin template menjadi `.clasp.json`. `.claspignore` mengizinkan hanya file `.gs` dan `appsscript.json` di rootDir backend. Tidak ada frontend, test, atau data mock yang ikut sinkronisasi. `.clasprc*.json`, token, `.env`, key dan folder backup diabaikan Git.

`clasp` belum terpasang dalam environment pekerjaan ini. Tidak ada instalasi, login OAuth, pembacaan token, pull live atau push live yang dilakukan. Bila dipasang nanti, gunakan paket resmi `@google/clasp`, cek versi dan panduan CLI versinya. [Dokumentasi resmi clasp](https://github.com/google/clasp), [panduan Google](https://developers.google.com/apps-script/guides/clasp).

## Sebelum pemasangan (manual, setelah persetujuan)

1. Pastikan Owner memberikan izin eksplisit untuk menyinkronkan source ke project live. Membuat source lokal ini **bukan** izin push Apps Script.
2. Jalankan `npm test` dan `npm run check`, serta buat backup source lokal/commit. Login clasp secara interaktif ke akun yang berhak; jangan mengirim token ke chat atau Git.
3. Ambil snapshot **kode Apps Script yang saat ini live** di direktori terpisah yang diabaikan Git, misalnya `clasp-backups/2026-10-18/`. Gunakan `clasp clone-script SCRIPT_ID` (CLI baru) atau `clasp clone SCRIPT_ID` (CLI lama) dari folder backup tersebut, bukan dari root project. Jangan menjalankan `clasp pull` langsung ke `backend/`: pull dapat menimpa source lokal. Clone hanya membaca project, tetapi tetap lakukan manual setelah izin akses.
4. Bandingkan snapshot dengan source V0.2. Jika project existing memiliki fungsi/trigger/library lain, review dan rekonsiliasi dulu. Push clasp mengganti set file project remote; jangan push sebelum konflik source/manifes diselesaikan dan backup diverifikasi. Jangan menyalin credential dari snapshot ke GitHub.
5. Dari root lokal, verifikasi `.clasp.json` menunjuk Script ID yang tepat dan rootDir backend, lalu gunakan `clasp show-file-status` atau `clasp status` sesuai versi. Pastikan daftar hanya `Code.gs`, `Core.gs`, `Schema.gs`, `SheetsRepository.gs`, `appsscript.json`.
6. **Hanya setelah persetujuan final atas diff tersebut**, Owner boleh menjalankan `clasp push` secara manual. Tidak ada auto-push, hook, GitHub Actions atau deployment script dalam repository. Jangan menjalankan `clasp deploy`.
7. Di editor existing, tetapkan Script Properties secara manual: BIRDKAS_OWNER_EMAIL, BIRDKAS_SPREADSHEET_ID (ID spreadsheet terikat, bukan Script ID), BIRDKAS_DRIVE_FOLDER_ID (ID folder Restricted birdkas). Jangan commit nilai-nilai ini. Verifikasi timezone script dan spreadsheet Asia/Jakarta. Grant scope melalui consent Owner, bukan mengubah sharing.
8. Uji lebih dahulu pada **salinan spreadsheet dan project salinan terikat** setelah izin membuat salinan/data uji. Salinan memerlukan config lokal terpisah dan property ID salinan; jangan mengganti target live tanpa memeriksa dua kali. Semua contoh transaksi hanya untuk salinan itu.
9. Pada spreadsheet asli, `setupDatabase()` boleh dijalankan hanya setelah persetujuan Owner untuk menambah sheet/master. Setup tidak memasukkan dummy/demo. Periksa `{ok:true}` dan 16 header, cash/bank saldo 0, stok kosong. Konflik harus dilaporkan, bukan diperbaiki otomatis.

Tidak ada aktivasi frontend Pages atau endpoint publik dalam prosedur tahap pertama. Desain OAuth/deployment tetap perlu persetujuan terpisah; baca SECURITY.md.
