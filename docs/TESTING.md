# Hasil pengujian build awal

18 Oktober 2026. Tidak ada deployment atau akses data produksi.

## Otomatis
- `npm test`: 3/3 lulus. Rekonsiliasi seed, pembelian HPP tidak seimbang ditolak tanpa perubahan state, ID individu unik, penjualan mengakui HPP, cegah penjualan/penyesuaian berulang, kegagalan localStorage tidak mengubah state aktif.
- `npm run check`: sintaks app, store dan service worker lulus.
- Manifest: JSON valid, ikon PNG 192/512 valid, aset lokal ada, path relatif dapat diresolusikan pada `/birdkas/`.
- Service worker memakai allowlist exact URL aset statis; non-GET, query URL dan API tidak ditangani. Tidak ada financial payload dalam cache.

## Browser preview lokal
- Home, Stok, Transaksi, Keuangan dan Lainnya dapat dibuka melalui bottom navigation.
- Pencarian ring KN 012 menghasilkan tepat satu Kenari; filter Terjual menghasilkan Kacer BRD-004.
- Laba rugi awal: omzet 1.250.000, HPP 800.000, operasional 200.000, kerugian 300.000, laba bersih -50.000. Kas 6.650.000, persediaan 3.300.000, modal 10.000.000.
- Pembelian 2 individu seharga 101.001: default HPP 50.501 + 50.500. Terapkan data ke semua, review dan konfirmasi berjalan; stok 6, kas 6.548.999, laba tetap -50.000.
- Penjualan Kenari HPP 450.000 seharga 650.000: review laba kotor 200.000, konfirmasi memperbarui stok 5, kas 7.198.999, laba bersih 150.000.
- Tidak ada error/warning console pada rangkaian navigasi dan transaksi yang diuji.
- Pemeriksaan visual lebar 390 dan 320 px; pada 320 px scrollWidth = innerWidth = 320, tidak ada horizontal overflow di Home.
- Setelah pengujian, data browser direset ke seed untuk review pengguna.

## Batas pemeriksaan
Belum diuji pada perangkat iPhone fisik, keyboard iOS nyata, instalasi Add to Home Screen, offline setelah instalasi, atau hosting HTTPS `/birdkas/` yang sebenarnya. Foto upload, ekspor CSV, dan semua kombinasi form belum diuji end-to-end. Validasi backend, autentikasi, concurrency live, dan recovery hanya rancangan; stub sengaja menolak operasi.

## Revisi pembayaran dan bukti transfer (18 Oktober 2026)
- 7/7 tes otomatis lulus (`npm test`), termasuk akun dari metode, transfer tanpa bukti, kegagalan penyimpanan, metadata tanpa Base64, kas/HPP/status, serta validasi signature JPG/PNG/HEIC, file kosong dan batas ukuran. Pemeriksaan sintaks kelima modul/script lulus.
- Browser menggunakan origin pengujian localhost:8002, terpisah dari preview utama localhost:8000. Data utama tidak diubah.
- Detail BRD-001: Tunai menampilkan Kas Tunai tanpa pemilih akun; Transfer menampilkan Rekening Bank dan field Bukti Transfer. Transfer tanpa bukti ditolak pada review.
- Upload PNG asli melalui file chooser: preview muncul. Transfer → Tunai menyembunyikan field dan membersihkan lampiran; kembali Transfer kembali ditolak sampai upload baru.
- Transfer 2.300.000 berhasil disimpan: bank naik 5.450.000 → 7.750.000, tunai tetap 1.200.000. Reload lalu Lihat Transaksi Penjualan menampilkan kembali gambar IndexedDB (naturalWidth 512), rekening dan tautan unduh.
- Dari Transaksi, memilih dua burung, metode Transfer dan preview bekerja dengan modul yang sama. Ganti foto mengubah preview/nama, Hapus foto mengembalikan tombol upload.
- Penjualan dua burung Tunai tanpa bukti sebesar 1.150.000 berhasil disimpan: tunai naik 1.200.000 → 2.350.000; bank tetap 7.750.000. Review mempertahankan HPP 800.000 dan laba kotor 350.000.
- Tidak ada error/warning console pada rangkaian pengujian. Visual detail bukti diperiksa pada lebar 390px.
- Kamera/galeri iPhone fisik dan decoding HEIC asli belum diuji; browser menentukan dukungan preview. Validasi format HEIC diuji melalui header file; penyimpanan/preview/reload end-to-end memakai PNG.

## Backend V0.2 internal (18 Oktober 2026)

`npm test`: **28/28 lulus** (21 pengujian backend + 7 regresi frontend). `npm run check`: seluruh JS frontend dan empat file Apps Script lolos sintaks; manifest Asia/Jakarta valid dan tidak memiliki web/API executable. Google Services diuji melalui VM/test doubles lokal, tanpa akses spreadsheet/Drive/project Apps Script asli.

Pemetaan kriteria wajib:

| Kriteria | Pengujian |
|---|---|
| Setup tanpa duplikasi | 16 tabel, dua akun nol, stok kosong, rerun tidak menulis ulang, konflik header/master/timezone berhenti sebelum mutasi |
| Pembelian satuan | Satu individu, HPP dan kas/persediaan, tanpa beban laba |
| Pembelian borongan | Beberapa UUID unik, sisa pembagian Rupiah, manual allocation |
| Alokasi HPP | Jumlah wajib tepat; selisih ditolak tanpa transaksi |
| Penjualan tersedia | Satuan dan multi individu, snapshot HPP, cash sesuai metode |
| Penjualan ganda | Terjual, mati/hilang, ID hilang dan pilihan duplikat ditolak |
| Saldo tidak cukup | Pembelian, biaya, penarikan modal dan transfer ditolak |
| Biaya operasi | Alias kategori frontend dinormalisasi; kas dan laba berkurang |
| Modal | Setoran dan penarikan tidak masuk omzet/beban |
| Transfer kas | Dua ledger seimbang, saldo per akun, tanpa laba |
| Mati/hilang | Stok/persediaan turun, kerugian HPP sekali, tanpa kas keluar baru |
| Konsistensi laporan | Kas + persediaan = modal neto + laba, P&L per bulan, search/status |
| Request duplikat | Replay hasil asli tanpa mutasi, payload/action berbeda ditolak |
| Parsial/recovery | PREPARED/APPLYING/RECOVERY_REQUIRED, blok query/command, replay langkah idempoten, konflik edit luar ditolak |

Tambahan: setiap batas write sebelum/sesudah diuji pada enam jenis command (pembelian, penjualan, biaya, modal, transfer dan penyesuaian); master/setup juga diuji terhenti parsial. Validasi proof menolak IndexedDB, file publik/link sharing dan file luar folder; Drive restricted proof diterima tanpa menganggap dana terverifikasi. Owner kosong/salah, effective user salah, konfigurasi target spreadsheet salah, formula injection, ledger corruption, input tanggal/nominal tidak valid dan lock sibuk ditolak. Tidak ada dependency pengujian eksternal.

Batas: belum diuji pada runtime Google Apps Script nyata, OAuth consent, kuota/timeout Google nyata, Drive permissions nyata, atau spreadsheet salinan. Test doubles menyuntikkan failure sebelum/sesudah setValues; ini bukan bukti atomisitas Google. Kerusakan journal karena edit manual di luar kode tetap memerlukan review administrasi. Pemanggilan public Execution API dan transport frontend sengaja belum dibuat.
