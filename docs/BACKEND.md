# Rancangan backend BirdKas

Status: desain, belum dapat dipakai untuk transaksi live. `backend/Code.gs` sengaja menolak semua operasi. Tidak ada endpoint publik atau deployment.

## Skema Google Sheets
Semua tabel memiliki owner_id, created_at, updated_at. ID berupa UUID string, nominal Rupiah integer, tanggal bisnis Asia/Jakarta YYYY-MM-DD. Primary ID tidak memakai nomor baris. Status stok hanya TERSEDIA, TERJUAL, MATI_HILANG.

| Sheet | Primary key | Kolom penting / relasi |
|---|---|---|
| Owners | owner_id | identity_subject, name, enabled |
| BirdTypes | type_id | name, active |
| Suppliers | supplier_id | name, contact |
| Customers | customer_id | name, contact |
| CashAccounts | account_id | name, kind: cash/bank |
| Birds | bird_id | type_id → BirdTypes, purchase_id, supplier_id, ring, sex, age_at_purchase, cost, status, physical_notes |
| BirdPhotos | photo_id | bird_id → Birds, drive_file_id, is_primary |
| Purchases | purchase_id | supplier_id, date, amount, account_id, method, status |
| PurchaseItems | item_id | purchase_id → Purchases, bird_id → Birds (unique), allocated_cost |
| Sales | sale_id | customer_id, date, amount, account_id, method, status |
| SaleItems | item_id | sale_id → Sales, bird_id → Birds (unique posted sale), sale_price, cost_snapshot |
| Expenses | expense_id | date, category, amount, account_id, notes |
| Capital | capital_id | date, kind in/out, amount, account_id |
| Transfers | transfer_id | date, from_account_id, to_account_id, amount |
| Adjustments | adjustment_id | bird_id → Birds, date, reason, cost_snapshot |
| CashLedger | entry_id | operation_id, source_type, source_id, account_id, signed_amount |
| Requests | request_id | owner_id, idempotency_key, payload_hash, operation_id, state, result_json |
| Operations | operation_id | type, state PREPARED/APPLYING/POSTED/RECOVERY_REQUIRED, planned_writes_json, applied_steps_json |
| Audit | audit_id | operation_id, actor_id, action, before_json, after_json, timestamp |

Keunikan dan foreign key wajib diperiksa dalam kode; Sheets tidak menegakkannya. Tidak ada DP, piutang atau cicilan. Semua transaksi dibayar penuh.

## Kontrak API rencana
Request: `{version:1, action, requestId, idempotencyKey, identityAssertion, payload}`. Identity assertion diverifikasi server (issuer, audience, signature, expiry), dipetakan ke owner allowlist; owner_id dari payload tidak dipercaya. Jangan menaruh secret server dalam frontend. Pilihan gateway autentikasi dan CORS harus dibuktikan sebelum integrasi GitHub Pages; Apps Script tidak otomatis menyediakan autentikasi API yang cocok untuk frontend lintas origin.

Response sukses: `{ok:true,requestId,operationId,data}`. Error: `{ok:false,requestId,error:{code,message,retryable}}`. Query: getStock (search/status/cursor), getDashboard (period). Command: purchase (individuals, total, account), sale (birdIds, per-item price), expense, capital, cashTransfer, stockAdjustment. initializeDatabase hanya setup owner terotorisasi, bukan endpoint publik umum.

## Konsistensi dan pemulihan
Google Sheets **tidak mempunyai transaksi atomik lintas sheet**. Gunakan LockService untuk serialisasi command, bukan sebagai rollback. Validasi owner sebelum membaca data. Di dalam lock: periksa idempotency (owner + key); key sama dengan payload berbeda ditolak; cek stok dan saldo terbaru; validasi HPP dan total; tulis journal PREPARED dengan seluruh langkah dan ID deterministik; flush; tandai APPLYING; terapkan langkah yang belum ada dengan pemeriksaan operation_id; audit; verifikasi invariant; baru POSTED dan simpan result request.

Jika terjadi kegagalan parsial, jangan mengembalikan sukses. Tandai RECOVERY_REQUIRED dan blok command terkait stok/akun tersebut. Recovery di bawah lock melanjutkan langkah idempoten dari journal atau membuat kompensasi teraudit; jangan menghapus riwayat. Read keuangan hanya memasukkan operation POSTED, dan memberi status unavailable bila ada pending operation yang memengaruhi hasil. Retry key yang sama mengembalikan hasil tersimpan, atau status pending yang sama. Rekonsiliasi berkala membandingkan ledger, total transaksi, individual HPP dan status burung; audit bersifat append-only.

Penjualan mengakui cost_snapshot sebagai HPP; pembelian menambah aset persediaan; mati/hilang mengakui kerugian sekali; modal dan transfer bukan pendapatan/biaya. Ledger transfer memiliki dua baris yang jumlahnya nol. Foto Drive harus dibatasi owner, validasi MIME/ukuran dan jangan membuat file publik otomatis.
