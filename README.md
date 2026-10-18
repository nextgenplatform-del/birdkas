# BirdKas — frontend V0.1, backend internal V0.2
Stok Tercatat, Untung Terlihat. Frontend HTML/CSS/ES modules native, tanpa dependency runtime. Demo lokal untuk ditinjau sebelum integrasi database.

## Jalankan
Dari folder proyek jalankan `python3 -m http.server 8000`, lalu buka http://localhost:8000. Jangan membuka melalui file:// karena ES modules dan service worker membutuhkan HTTP/HTTPS.

Catatan transaksi tersimpan dalam localStorage `birdkas-demo-v1`, hanya di browser ini. Tidak ada backend live, autentikasi, sinkronisasi, atau pengiriman Google Sheets. Foto demo adalah ilustrasi SVG lokal; upload foto maksimal 1 MB per individu. Keterbatasan kuota localStorage akan menolak penyimpanan, bukan menampilkan sukses. Tanggal bisnis simulasi tetap 18 Oktober 2026 agar perhitungan konsisten. Mode ini bukan untuk data produksi.

## Struktur
- `index.html`, `styles.css`: shell mobile maksimal 430px, safe area dan navigasi bawah.
- `js/data.js`: satu seed data simulasi.
- `js/store.js`: state, ledger, kalkulasi dan operasi transaksi.
- `js/app.js`: hash routing, halaman, form bertahap dan interaksi.
- `assets/`: ikon PNG/SVG serta ilustrasi burung sementara.
- `manifest.json`, `service-worker.js`: PWA, cache allowlist aset statis.
- `backend/`: implementasi Apps Script V0.2 internal (Schema/Core/SheetsRepository/Code + manifest), belum dipasang live.
- `docs/BACKEND.md`, `API.md`, `SECURITY.md`, `CLASP.md`: skema, kontrak, otorisasi dan prosedur pemasangan.
- `tests/store.test.mjs`: tes aturan akuntansi dan perubahan stok.

## GitHub Pages nanti
Remote tujuan: nextgenplatform-del/birdkas. Semua URL relatif dan hash routing kompatibel dengan subpath `/birdkas/`. Tidak ada deployment yang dibuat. Setelah akses repository tersedia, review dan commit/push source; konfigurasi Pages hanya setelah instruksi deployment. Saat memperbarui aset, naikkan versi cache service worker. Uji Add to Home Screen lewat Safari iPhone pada HTTPS; splash mengikuti kemampuan iOS.

## Validasi
Jalankan `npm test`. Untuk pemeriksaan sintaks: `npm run check`. Rincian pengujian build dicatat di `docs/TESTING.md`.

## Bukti transfer penjualan
Metode Tunai otomatis masuk Kas Tunai; Transfer otomatis masuk Rekening Bank dan wajib memiliki bukti. File JPG/PNG/HEIC maksimal 10 MB disimpan sebagai Blob di IndexedDB `birdkas-demo-attachments`, store `files`. localStorage hanya menyimpan metadata `transferProof`: id, storage, name, mimeType, size, driveFileId (null), verificationStatus (UNVERIFIED). Tidak ada upload Google Drive. File hanya tersedia di browser/origin yang sama; penghapusan data browser dapat menghilangkannya.

Modul `js/sale-payment.js` menangani UI pembayaran bersama dan penyimpanan sebelum penjualan; `js/attachments.js` menangani file. Jika penyimpanan file gagal, transaksi tidak dicatat; jika penjualan ditolak, file yang baru ditulis dibersihkan. IndexedDB dan localStorage bukan transaksi atomik bersama; penutupan browser mendadak di antara kedua tahap dapat meninggalkan file tanpa referensi. Reset data demo juga membersihkan lampiran. HEIC dapat dilampirkan; preview mengikuti codec browser, dengan tautan unduh bila tidak dapat ditampilkan. Input file native tanpa forced capture menyediakan pilihan kamera/galeri sesuai iOS. Bukti bukan verifikasi otomatis penerimaan uang.

## Backend V0.2 — tahap pertama
Frontend tetap mode DEMO lokal dan tidak diubah. Backend native Apps Script disiapkan untuk 16 tabel, pembelian, penjualan, kas/modal/biaya, penyesuaian dan laporan, dengan Owner gate, request idempotency, audit dan recovery journal. Tidak ada endpoint publik atau koneksi frontend, data DEMO di Sheets, push clasp maupun deployment. Jalankan `npm run test:backend` untuk pengujian dengan test doubles Google Services; `npm test` mencakup regresi frontend juga. Lihat `docs/BACKEND.md` dan `docs/CLASP.md` sebelum memasang.
