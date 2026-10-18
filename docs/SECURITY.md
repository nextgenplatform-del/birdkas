# Keamanan dan autentikasi

## Yang diimplementasikan sekarang

Tidak ada `doGet`, `doPost`, web app manifest, API-executable manifest, trigger ataupun frontend transport. Setiap fungsi layanan terlebih dahulu mencocokkan **active user dan effective user** dengan Script Property `BIRDKAS_OWNER_EMAIL` (case-insensitive). Identitas kosong, akun berbeda atau konfigurasi hilang ditolak sebelum akses Sheets/Drive. Tidak ada fallback menjadi Owner berdasarkan effective user saja. Spreadsheet terikat wajib cocok dengan `BIRDKAS_SPREADSHEET_ID`. Konfigurasi sensitif dan email Owner hanya di Script Properties, tidak di source/GitHub/SETTINGS.

Gate ini cocok untuk **pemanggilan Owner dari Apps Script editor yang telah memberi consent**. Ini bukan middleware autentikasi siap pakai untuk anonymous web apps. Google menjelaskan bahwa email active user dapat kosong pada konteks tertentu, terutama web app execute-as-me; kode menolaknya. [Dokumentasi Session](https://developers.google.com/apps-script/reference/base/session).

Scope lokal: spreadsheets.currentonly, userinfo.email, drive.readonly. Drive hanya memeriksa file existing dan Restricted; tidak membuat file atau mengubah sharing. Script/editor/spreadsheet harus hanya dapat diedit pihak tepercaya: editor script dapat mengubah kode/properties sehingga gate tidak melindungi dari editor jahat. Jurnal mendeteksi operasi parsial/edit konflik, bukan tanda tangan kriptografis atas spreadsheet. Jangan membagikan Apps Script atau spreadsheet ke publik.

## Pilihan yang benar-benar dapat dipakai nanti

### A. Tetap GitHub Pages + Apps Script: OAuth dan Apps Script Execution API

Pilihan tanpa server proxy tambahan: browser statis memakai Google Identity Services OAuth token flow dengan **public OAuth client ID**, origin Pages yang didaftarkan, token akses pengguna sementara di memori, lalu memanggil `scripts.run` pada `script.googleapis.com`. Tidak ada client secret yang ditempel ke JavaScript. Google Apps Script dan OAuth client harus menggunakan **standard Google Cloud project yang sama**, Apps Script API diaktifkan, OAuth consent/scopes disiapkan, lalu API executable dibatasi untuk Owner. Ini perubahan konfigurasi/deployment yang harus disetujui dan diuji terpisah, belum dilakukan.

Adapter saat ini menggunakan spreadsheet terikat/currentonly untuk editor. Untuk Execution API, ubah secara terkontrol ke `openById` atas ID server yang dipin dan scope spreadsheets yang sesuai, sebab active spreadsheet tidak dapat diasumsikan tersedia dalam konteks API. Uji ketersediaan active/effective identity, otorisasi Owner, origin/CORS, token expiry, refresh interaktif, hak file dan penolakan akun lain. Jangan mengganti gate dengan menerima email dari payload. Identity availability harus dibuktikan pada deployment tersebut sebelum mengaktifkan akses tulis.

[Apps Script Execution API — project bersama, deployment dan OAuth](https://developers.google.com/apps-script/api/how-tos/execute), [GIS token model untuk aplikasi browser](https://developers.google.com/identity/oauth2/web/guides/use-token-model), [batas konteks bound script](https://developers.google.com/apps-script/guides/bound).

### B. Alternatif paling sedikit perubahan runtime: UI internal Apps Script

Halaman HTML Service dengan `google.script.run`, akses terbatas dan eksekusi sebagai user, tetap Owner gate. Ini dapat menghindari public cross-origin write API, tetapi alur sensitif dipindahkan dari GitHub Pages ke halaman internal Apps Script. Tidak sesuai untuk mempertahankan semua alur di Pages tanpa penyesuaian UX. Belum dibuat atau dideploy. [Web apps dan identitas eksekusi](https://developers.google.com/apps-script/guides/web).

Jika flow OAuth Execution API tidak memenuhi batasan akun/akses, komponen tambahan minimal adalah gateway HTTPS terautentikasi yang memverifikasi token Google (issuer/audience/signature/expiry dan subject Owner), menerapkan CORS exact origin, lalu memanggil layanan terbatas. Gateway memerlukan identitas server yang disimpan server-side; ini memerlukan persetujuan teknologi/operasional baru. Tidak ada gateway atau secret yang ditambahkan di tahap ini.

**Tidak boleh** membuka endpoint Execute as me / Anyone dengan shared password di frontend, menyimpan access token di localStorage, mengandalkan URL yang sulit ditebak, atau menganggap CORS sebagai autentikasi. Keputusan akses publik belum diminta/disetujui. File transfer berstatus UNVERIFIED: bukti foto bukan verifikasi otomatis saldo bank.

## Jurnal dan penguncian

Script lock dipakai juga untuk query agar query tidak berpapasan dengan apply. Flush sebelum release mengikuti [referensi LockService](https://developers.google.com/apps-script/reference/lock/lock). Lock tidak mengunci spreadsheet dari edit manual, dan tidak memberi transaksi atomik lintas-sheet. Seluruh command berhenti saat ada journal belum POSTED. Pemulihan hanya melanjutkan before/after plan yang tersimpan, tidak menimpa edit di luar plan.
