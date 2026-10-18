# Langkah aktivasi Owner

1. Tempel seluruh [Code.gs](../backend/Code.gs) pada project Apps Script yang menghasilkan URL Web App Anda. Gunakan spreadsheet Birdkas yang sama dan jalankan `setupBirdKas()` sekali. Jangan gunakan project `.clasp.json` lokal yang belum cocok.
2. Edit **deployment yang sama**: New version → Execute as Me → akses Anyone → Deploy. Simpan URL lama.
3. Berikan akses tulis repository `nextgenplatform-del/birdkas` ke akun GitHub yang sedang terhubung (`hadigustianhg-blip`), atau push sendiri file yang sudah disiapkan. Atur Pages ke Deploy from a branch, branch main, folder / (root).
4. Buka URL Pages dari Settings → Pages, login Owner, lalu Add to Home Screen di Safari.

**Belum dilakukan:** push GitHub, penerbitan Pages, edit/deploy backend, pemeriksaan header Sheets live, uji transaksi produksi dan Safari lintas origin. Tidak perlu membuat spreadsheet, tab, project, atau deployment baru.
