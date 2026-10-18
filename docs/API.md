# Kontrak layanan BirdKas V0.2

Kontrak ini untuk pemanggilan internal dari editor; **bukan URL endpoint aktif**.

## Envelope

Write: `{version:1, requestId:"UUID-UNIK", payload:{...}}`. Request ID 8–100 karakter alfanumerik/underscore/hyphen, dibuat sekali per tindakan, dipakai kembali saat retry. Tidak ada ownerId, password atau token yang diterima sebagai otorisasi payload. Owner berasal dari identitas Google server.

Sukses write: `{ok:true, requestId, operationId, data, replayed?:true}`. Sukses read: `{ok:true,data}`. Error: `{ok:false,requestId,error:{code,message,retryable}}`.

`BUSY` boleh diulang dengan ID sama. `RECOVERY_REQUIRED` memerlukan pemeriksaan status/recovery; `RECOVERY_CONFLICT` memerlukan pemeriksaan manual. `INSUFFICIENT_FUNDS`, `STOCK_UNAVAILABLE`, `HPP_MISMATCH`, `INVALID_*`, `SCHEMA_CONFLICT`, `CONFIG_REQUIRED`, `FORBIDDEN` tidak diklaim sukses. Error validasi sebelum PREPARED tidak membuat baris bisnis/audit; transaksi yang diterima memiliki audit dalam rencananya.

## Payload command

| Fungsi | Payload |
|---|---|
| setupDatabase | Tidak wajib argumen; default request `setup-database-v02`. Boleh envelope standar dengan payload kosong |
| createPurchase | date, party (nama supplier), amount, method, account, individuals: [{type, cost?, ring?, sex?, age?, notes?, photos?: [DriveReference]}], count? |
| createSale | date, party (nama pelanggan), method, items: [{id:birdId, price}], transferProof? |
| createExpense | date, category, amount, account, notes? |
| createCapitalTransaction | date, kind: in/out, amount, account, notes? |
| transferCash | date, from: cash/bank, to: cash/bank, amount |
| adjustBirdStock | date, birdId, reason: Mati/Hilang |
| recoverTransaction | `{requestId: ID_OPERASI_ASLI}` langsung, bukan transaksi baru. Hanya Owner dari jurnal asli |

Nominal integer positif; date string tanggal valid YYYY-MM-DD. Akun hanya cash/bank. Purchase method Tunai/Transfer dan account dipilih eksplisit sebagaimana form pembelian V0.1. Jika semua cost dihilangkan, HPP dibagi merata, sisa Rupiah ditambahkan ke individu pertama. Jika satu cost diberikan, seluruh individu wajib memiliki cost dan jumlahnya harus tepat sama dengan amount. Setiap individu mendapat UUID string baru.

Penjualan menurunkan account dari method: Tunai → cash; Transfer → bank. Field account dari klien diabaikan. Transfer wajib bukti Drive valid; Tunai tidak menyimpan bukti yang dikirim. Biaya memakai Pakan, Vitamin/Obat, Kandang/Perawatan, Transport, Lainnya. Alias frontend Obat/Vitamin diterima dan disimpan sebagai Vitamin/Obat. Usia dan ring boleh kosong; sex Jantan/Betina/Belum diketahui. Teks yang diawali karakter formula `= + @ -` ditolak untuk mencegah formula injection.

DriveReference: `{storage:"drive",driveFileId:"ID_FILE_ASLI"}`. Adapter mengambil nama/MIME/ukuran dari Drive, tidak mempercayai metadata klien. File dan folder harus Restricted, file berada langsung dalam folder konfigurasi, bukan trashed, MIME JPG/PNG/HEIC/HEIF/WebP, ukuran >0 dan ≤10 MB. Output metadata `{id,storage:"drive",driveFileId,name,mimeType,size,verificationStatus:"UNVERIFIED"}`. Tidak ada upload/ubah sharing. Referensi `indexeddb` dan Base64 demo ditolak.

## Query

| Fungsi | Argumen / data |
|---|---|
| getDashboard | `{month?:"YYYY-MM"}` → revenue, cogs, grossProfit, expenses, loss, profit, cash:{cash,bank}, totalCash, activeCount, inventory, today, salesToday, expensesToday |
| getBirds | `{status?:TERSEDIA/TERJUAL/MATI_HILANG,search?:string}` → array individu; search ID/jenis/ring |
| getBirdDetail | `{birdId}` → individu + activities pembelian/penjualan/penyesuaian |
| getCashBalances | Tanpa argumen → cash, bank, totalCash |
| getCashTransactions | `{account?:"cash"/"bank"}` → ledger dengan signedAmount, alias signed/account dan amount absolut |
| getProfitLoss | `{month?:"YYYY-MM"}` → revenue, cogs, grossProfit, expenses, loss, profit |
| getInventoryReport | Tanpa argumen → count, inventory, birds tersedia |
| getTransactionStatus | `{requestId}` → requestId, operationId, status, errorCode; tetap boleh saat ada operasi parsial |

Default periode adalah bulan saat ini di Asia/Jakarta. Persediaan/kas adalah saldo saat ini, bukan snapshot historis akhir bulan. P&L menghitung sumber sesuai date periode, bukan waktu request. DTO burung mempertahankan id/type/ring/sex/age/date/cost/status/notes/supplier, menambah typeId/supplierId/photos; `photo` berupa metadata Drive pertama atau null. Nanti adapter frontend perlu menampilkan foto secara terotorisasi; tidak boleh menyisipkan URL file publik.

## Contoh untuk salinan spreadsheet pengujian setelah izin

Jangan menjalankan contoh ini pada spreadsheet asli untuk membuat data uji. Buat fungsi pembungkus sementara di **project salinan terpisah**, tidak masuk upload source produksi. Periksa `ok` setiap langkah; hentikan jika error.

```javascript
// Nilai requestId di bawah hanya contoh; tindakan baru wajib memakai UUID baru.
const modal = createCapitalTransaction({version:1,requestId:'test-modal-0001',payload:{
  date:'2026-10-18',kind:'in',amount:2000000,account:'cash'
}});
const beli = createPurchase({version:1,requestId:'test-beli-0001',payload:{
  date:'2026-10-18',party:'Supplier pengujian',amount:1000001,method:'Tunai',account:'cash',
  individuals:[{type:'Kenari'},{type:'Kenari'}]
}});
// Setelah memastikan beli.ok, HPP menjadi 500001 dan 500000.
const jual = createSale({version:1,requestId:'test-jual-0001',payload:{
  date:'2026-10-18',party:'Pelanggan pengujian',method:'Tunai',
  items:[{id:beli.data.ids[0],price:650000}]
}});
// Transfer memerlukan file Drive yang SUDAH ada dalam folder Restricted salinan.
// Tidak ada migrasi/file upload otomatis dari IndexedDB.
getDashboard({month:'2026-10'});
getTransactionStatus({requestId:'test-jual-0001'});
// Hanya jika status belum POSTED, review journal terlebih dahulu:
// recoverTransaction({requestId:'test-jual-0001'});
```
