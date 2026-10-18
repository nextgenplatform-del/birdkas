# BirdKas V1.0

Aplikasi statis mobile-first: tepat empat menu **Dashboard, Stok Burung, Alur Kas, Pengaturan**. Tanpa framework, tanpa data demo, tanpa database selain Sheets. Semua angka berasal dari respons backend; belum masuk / gagal koneksi tidak pernah ditampilkan sebagai saldo nol.

## Status penyerahan

Frontend dan backend lengkap tersedia lokal. `npm run check` dan `npm test` lulus. Login telah diperiksa di browser lokal. Transaksi produksi, transport lintas origin Safari iPhone, kecocokan header database lama, dan deployment belum terverifikasi. Tidak ada klaim sinkronisasi produksi.

Saat pekerjaan ini dilakukan, akun GitHub terhubung `hadigustianhg-blip` memiliki `push: false` dan `admin: false` pada `nextgenplatform-del/birdkas`. Konektor Drive tidak menemukan file Birdkas. Konfigurasi `.clasp.json` lokal menunjuk script dengan deployment berbeda dari endpoint yang diminta. Tidak ada push, perubahan Sheets/Drive, atau deployment Apps Script dilakukan.

## Mengaktifkan aplikasi pada layanan yang SUDAH ADA

1. Buka Apps Script dari spreadsheet **Birdkas yang sudah ada**. Ganti kode backend lama dengan **satu file lengkap `backend/Code.gs`**; jangan menyisakan definisi lama dengan nama fungsi sama. Jangan pakai `.clasp.json` lokal sebelum memverifikasi script ID yang benar.
2. Jika script terikat pada Birdkas, tidak perlu ID tambahan. Jika standalone, isi Script Property `BIRDKAS_SPREADSHEET_ID` dengan ID spreadsheet Birdkas yang sama. Opsional: `BIRDKAS_DRIVE_FOLDER_ID` untuk folder foto yang sudah ada; jika kosong, backend membuat satu folder foto saat unggahan pertama.
3. Jalankan `setupBirdKas()` satu kali dari editor. Fungsi hanya menambah kolom yang belum ada pada delapan tab yang sama, tidak membuat spreadsheet/tab atau akun Owner, serta tidak mengganti password. Header yang ambigu menghasilkan error untuk diperiksa, bukan menimpa data. Pastikan tab USERS memakai header username/password/status (alias didukung) dan status Owner `Aktif`.
4. Di **Deploy → Manage deployments**, edit deployment yang URL-nya sama dengan endpoint di bawah, pilih **New version**, jalankan sebagai pemilik, akses **Anyone** agar form iframe GitHub Pages dapat mengakses endpoint tanpa login Google di Safari. Login Owner tetap divalidasi di backend. Perbarui deployment yang sama, jangan buat Web App baru. Tinjau izin Google untuk akses Sheets dan Drive bila diminta.
5. Dengan akun yang berhak menulis repository, unggah/push file proyek ini ke `main` pada repository yang sama. Di Settings → Pages pilih Source **Deploy from a branch**, branch **main**, folder **/ (root)**. URL yang diharapkan setelah deployment berhasil: `https://nextgenplatform-del.github.io/birdkas/` — belum diverifikasi aktif.
6. Masuk dari Safari iPhone menggunakan akun Owner yang sudah ada di USERS. Setelah berhasil, gunakan Share → Add to Home Screen. Uji transaksi nyata hanya dengan data usaha yang memang ingin dicatat; jangan menambahkan transaksi fiktif ke database produksi.

Endpoint frontend:
`https://script.google.com/macros/s/AKfycbyhQSZ85Q36OkoPtIZL_W541pv0PAP8McbPYWKFJsrqMU-twI-qisGKmvP22kdTqy-C/exec`

## Pencatatan dan koreksi

- Pembelian menambah BURUNG dan PEMBELIAN, mengurangi akun KAS sesuai metode. Supplier dicatat di SUPPLIER bila belum ada.
- Penjualan menambah PENJUALAN dan KAS; status terminal tidak bisa dijual kembali. Bukti wajib untuk transfer. HPP berasal dari harga beli.
- Operasional menambah BIAYA dan mengurangi KAS. Pembelian bukan operasional.
- Mati/Hilang mengurangi persediaan dan menjadi kerugian HPP, tanpa penjualan atau pengeluaran kas kedua. Laba bersih = laba penjualan − operasional − kerugian HPP.
- KAS menggunakan nominal bertanda: masuk positif, keluar negatif. Akun Tunai/Bank; Transfer dipetakan ke Bank. Transfer antar akun yang sudah dicatat sebagai dua baris berlawanan tidak menambah laba. Tidak ada menu tambahan untuk fitur di luar brief.
- Koreksi harga/tanggal memperbarui pembelian, kas terkait, dan HPP penjualan secara konsisten, dengan jejak nilai sebelumnya dalam jurnal. Jika catatan lama tidak punya tautan pembelian-kas yang dapat dipastikan, koreksi finansial ditolak dengan pesan jelas. Tidak ada fitur penghapusan transaksi. Koreksi metode pembayaran tidak disediakan.
- Saldo awal dan seluruh riwayat KAS yang sudah ada dibaca, tidak direset. Jika data lama menggunakan format debit/kredit, bukan nominal bertanda, periksa pemetaan sebelum memakai aplikasi. Jangan mengonversi sembarang nilai tanpa memahami riwayatnya.
- Tanggal disimpan ISO, pelaporan backend memakai Asia/Jakarta. Usia dihitung saat render: minggu 7 hari, bulan rata-rata 30,4375 hari, tahun 365,25 hari.

## Integritas dan akses

`LockService` menserialisasi permintaan. ID unik dan hash payload mencegah retry membuat transaksi kedua. Jurnal `BK_TX_*` dalam PENGATURAN menyimpan rencana operasi dan nilai sebelumnya; tidak ada tab jurnal baru. Penulisan per baris idempoten. Jurnal pending dipulihkan pada akses Owner berikutnya sebelum data ditampilkan. Ini pemulihan penulisan bertahap, bukan transaksi ACID Sheets.

Password tetap plaintext di USERS sesuai permintaan. Tidak dikirim ke URL atau source publik. Hash hanya dipakai untuk fingerprint sesi dan digest transaksi; tidak mengganti password di Sheets. Token ada di sessionStorage tab browser (12 jam), server menyimpan hash token di Script Properties. Status aktif dan fingerprint password diperiksa setiap akses. Perubahan password, termasuk langsung di Sheets, membatalkan sesi lama. Login gagal dibatasi per username (10 percobaan / 15 menit). Tidak mengirim USERS ke frontend.

Foto disimpan di Drive dan dibagikan via link agar tampil di frontend. Bukti transfer tetap privat di Drive pemilik. Base64 hanya digunakan saat upload; Sheets menyimpan file ID/URL, bukan gambar base64. Foto diperkecil ke maksimum 1600px. Format JPG/PNG/WebP; HEIC perlu format kompatibel dari iPhone.

Transport memakai POST form + iframe + HTML postMessage. Frontend memvalidasi origin Google, channel, origin aplikasi, dan UUID permintaan; backend hanya mengizinkan `https://nextgenplatform-del.github.io`. Tidak ada fetch no-cors atau token URL. Timeout mempertahankan ID dan payload untuk retry lewat tombol form yang sama. Belum ada pengujian round-trip pada deployment produksi yang diberikan.

PWA menyimpan hanya aset statis. Data bisnis/foto tidak dicache oleh service worker; transaksi butuh koneksi. Tidak tersedia mode demo atau transaksi offline.

## Verifikasi lokal

```sh
npm run check
npm test
python3 -m http.server 4173 --bind 127.0.0.1
```

Preview localhost menampilkan login. Backend hanya menerima origin GitHub Pages yang ditentukan; preview lokal tidak mengirim kredensial Owner ke backend. Tes menggunakan mock Sheets/Drive di memori, tidak membuat environment UJI atau menyentuh database produksi.
