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
