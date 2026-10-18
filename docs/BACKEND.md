# BirdKas V0.2 — backend internal

Status: implementasi lokal, diuji dengan test doubles. **Belum disalin ke Apps Script, belum menjalankan setup pada Sheets asli, belum dideploy, belum terhubung ke frontend publik.** Frontend V0.1 tidak diubah. Backend tidak mengimpor `js/data.js` atau data DEMO.

## File dan fungsi

- `backend/Schema.gs`: header 16 tabel.
- `backend/Core.gs`: validasi, perencanaan transaksi, jurnal/pemulihan, ledger dan laporan.
- `backend/SheetsRepository.gs`: adapter Spreadsheet/Lock/Drive read-only.
- `backend/Code.gs`: fungsi layanan, pemeriksaan Owner dan respons terstruktur.
- `backend/appsscript.json`: V8, Asia/Jakarta, scope internal; tanpa webapp/executionApi.
- `docs/API.md`: kontrak dan contoh input/output.
- `docs/CLASP.md`: sinkronisasi dengan project existing, tanpa push otomatis.
- `docs/SECURITY.md`: otorisasi internal dan pilihan akses frontend nanti.

Fungsi tersedia: `setupDatabase`, `getDashboard`, `getBirds`, `getBirdDetail`, `createPurchase`, `createSale`, `createExpense`, `createCapitalTransaction`, `transferCash`, `adjustBirdStock`, `getCashBalances`, `getCashTransactions`, `getProfitLoss`, `getInventoryReport`, `getTransactionStatus`, `recoverTransaction`.

## Skema dan relasi

Sumber header yang otoritatif adalah `backend/Schema.gs`; urutan kolom harus sama persis. `id` adalah primary key string pada setiap tabel. `operationId` merujuk `TRANSACTION_LOG.operationId`. Nominal adalah number integer Rupiah (bukan teks berformat); tanggal bisnis adalah **string** YYYY-MM-DD, timestamp UTC ISO, pelaporan menggunakan Asia/Jakarta. Penamaan camelCase disengaja agar dekat dengan model frontend.

| Sheet | Kolom selain primary ID | Relasi / peran |
|---|---|---|
| BURUNG | operationId, typeId, type, ring, sex, age, supplierId, purchaseId, date, cost, status, notes, photosJson, updatedOperationId | Satu individu; typeId → JENIS_BURUNG.id, supplierId → SUPPLIER.id, purchaseId → PEMBELIAN.id |
| PEMBELIAN | operationId, date, supplierId, amount, method, accountId, count | Header pembelian lunas; supplierId → SUPPLIER.id |
| DETAIL_PEMBELIAN | operationId, purchaseId, birdId, allocatedCost | purchaseId → PEMBELIAN.id; birdId → BURUNG.id, satu detail per burung |
| PENJUALAN | operationId, date, customerId, amount, method, accountId, proofJson, verificationStatus | customerId → PELANGGAN.id, transfer wajib file Drive |
| DETAIL_PENJUALAN | operationId, saleId, birdId, price, costSnapshot | saleId → PENJUALAN.id; birdId → BURUNG.id, maksimal satu penjualan per burung |
| BIAYA_OPERASIONAL | operationId, date, category, amount, accountId, notes | Beban operasi dan kas keluar |
| MUTASI_KAS | operationId, date, accountId, signedAmount, sourceType, sourceId | accountId → AKUN_KAS.id, sourceId → transaksi sumber; transfer memiliki dua baris |
| MUTASI_MODAL | operationId, date, kind, amount, accountId, notes | kind in/out, perubahan modal di luar omzet/beban |
| PENYESUAIAN_STOK | operationId, date, birdId, reason, costSnapshot | birdId → BURUNG.id, maksimal sekali; tidak membuat mutasi kas |
| SUPPLIER | name, createdAt | Dibuat dari nama supplier saat pembelian; tidak diisi dummy saat setup |
| PELANGGAN | name, createdAt | Dibuat dari nama pelanggan saat penjualan |
| JENIS_BURUNG | name, createdAt | Dibuat dari jenis pada pembelian; nama disnapshot di BURUNG |
| AKUN_KAS | name, openingBalance | Hanya cash/Kas Tunai dan bank/Rekening Bank; openingBalance selalu 0 |
| AUDIT_LOG | operationId, requestId, actor, action, timestamp, beforeJson, afterJson | Snapshot perubahan stok dan hasil transaksi; tidak dihapus saat recovery |
| TRANSACTION_LOG | operationId, action, payloadHash, status, planJson, resultJson, createdAt, updatedAt, errorCode | id = requestId, primary idempotency key; rencana lengkap dengan ID stabil |
| SETTINGS | value | schemaVersion = 0.2, timeZone = Asia/Jakarta; bukan tempat credential |

Primary/foreign key tidak ditegakkan Sheets: core memeriksanya. Foto/referensi bukti berupa JSON metadata file Drive, **tanpa Base64 atau binary**. `verificationStatus` tetap `UNVERIFIED`.

## Setup yang aman

`setupDatabase()` mengunci script dan memeriksa **seluruh** header, formula, primary ID, master akun/settings existing, serta zona waktu sebelum membuat sheet apa pun. Sheet existing yang kosong boleh diberi header. Konflik header/kolom/master atau data tanggal berupa Date Sheets menghentikan proses dengan `SCHEMA_CONFLICT`/`TIMEZONE_CONFLICT`; kode tidak memperbaiki, mengganti, menghapus, atau memigrasikannya otomatis. Sheet lain tidak disentuh. Master yang hilang ditambahkan, saldo dan stok awal nol. Rerun dengan request bawaan `setup-database-v02` tidak membuat baris ganda.

Pembuatan sheet/header adalah DDL idempoten: jika terhenti, rerun melengkapi sheet kosong yang masih hilang. Master/settings/audit menggunakan journal transaksi yang sama dengan operasi bisnis. Jika setup sudah mencapai PREPARED lalu gagal, jalankan recovery request setup, bukan menghapus log. Spreadsheet harus sudah berzona waktu Asia/Jakarta; kode tidak mengubah pengaturan tersebut otomatis.

## Aturan akuntansi

- Kas = jumlah `MUTASI_KAS.signedAmount` per akun; openingBalance nol, bukan saldo tersimpan yang dapat drift.
- Persediaan = total HPP BURUNG berstatus TERSEDIA.
- Pembelian = kas keluar + aset persediaan, tidak langsung menjadi beban.
- Penjualan = kas masuk, pengurangan stok, HPP memakai `costSnapshot` individu saat dijual.
- Omzet − HPP − biaya operasi − kerugian mati/hilang = laba bersih periode.
- Modal in/out tidak menjadi pendapatan/beban. Transfer dua baris saling meniadakan, tidak mengubah laba.
- Invariant global: kas + persediaan = modal neto + laba kumulatif. Detail sumber harus cocok persis dengan ledger; saldo negatif, stok ganda atau snapshot HPP tidak cocok memblokir operasi.
- Semua transaksi lunas. Tidak ada DP, utang/piutang atau cicilan. Tidak ada migrasi data DEMO ke live.

## Jurnal, idempotency dan pemulihan

Google Sheets **bukan database transaksi atomik lintas-sheet**. `LockService.getScriptLock` mengunci semua baca/tulis layanan; `flush()` dilakukan sebelum melepas lock. Lock tidak menghalangi edit manual pada spreadsheet dan bukan rollback.

1. Periksa Owner server, target spreadsheet, schema, payload/requestId dan saldo/stok terbaru di dalam lock.
2. Request ID yang pernah POSTED dengan action/hash sama mengembalikan hasil tersimpan tanpa menulis ulang. ID sama dengan payload/action berbeda ditolak `IDEMPOTENCY_CONFLICT`.
3. Buat rencana lengkap di memori: ID, baris sebelum/sesudah, mutasi, master baru, audit dan hasil. Validasi nominal/HPP, ukuran request/rencana maksimal 40.000 karakter, lalu simpan `PREPARED` dan flush/read-back.
4. Ubah menjadi `APPLYING`, terapkan setiap langkah. Baris yang sudah sama persis dengan `after` dilewati. Jika baris tidak sama dengan `before` maupun `after`, hentikan sebagai `RECOVERY_CONFLICT`, tanpa menimpanya.
5. Verifikasi seluruh efek bisnis dan invariant. Hanya setelah semua cocok simpan `POSTED` beserta resultJson, flush/read-back, lalu kembalikan sukses.
6. Error/timeout dapat meninggalkan PREPARED/APPLYING/RECOVERY_REQUIRED. Semua baca bisnis dan command baru **diblokir secara global** agar tidak menampilkan snapshot parsial. `getTransactionStatus` tetap tersedia bagi Owner.
7. Owner memeriksa journal, lalu `recoverTransaction({requestId: 'ID_ASLI'})`. Recovery melanjutkan rencana asli dan ID asli, tidak menghitung ulang HPP atau membuat transaksi baru. Efek yang sudah lengkap dilewati. Recovery dapat diulang, tetap idempoten. Jurnal menyimpan waktu/status kegagalan dan audit transaksi asli.

Tidak ada penghapusan baris atau rollback otomatis. Jika ada edit manual/korupsi, recovery menolak perubahan otomatis; Owner perlu memeriksa snapshot sebelum/sesudah dan sumber konflik melalui proses administrasi terpisah. Jangan menandai POSTED atau menghapus log secara manual. Bila pembacaan/penulisan jurnal gagal sebelum durabilitas dapat dikonfirmasi, respons tetap gagal; periksa status dan retry ID yang sama. Jangan membuat ID baru untuk retry transaksi yang sama.

## Batas tahap pertama

Semua tabel dibaca penuh dan invariant lintas tabel diperiksa per operasi. Ini mengutamakan kebenaran untuk satu Owner/skala kecil, bukan optimasi volume besar. Request 1–50 individu masih dibatasi ukuran journal 40.000 karakter; borongan besar dapat diminta dipecah. Tidak ada pagination, upload Drive, public router, background trigger, auto-deploy atau kompensasi manual otomatis. Pengujian mock tidak menggantikan uji OAuth, scope currentonly, Apps Script runtime, Drive permissions dan kuota pada salinan spreadsheet terpisah setelah izin Owner.
