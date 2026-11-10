# Setup Google Sheets + Vercel

## 1. Siapkan database
1. Buat Google Spreadsheet baru di Google Drive.
2. Buka **Extensions → Apps Script**.
3. Ganti isi `Code.gs` dengan file `apps-script/Code.gs` dari repository ini.
4. Pilih fungsi `setup`, lalu klik **Run** dan berikan izin yang diminta. Fungsi ini membuat tab: Master_Barang, Stok_Awal, Barang_Masuk, Penjualan, Barang_Reject, Stok_Opname, dan Riwayat_Aktivitas.
5. Di Apps Script pilih **Deploy → New deployment → Web app**.
6. Execute as: **Me**. Who has access: **Anyone**. Deploy, lalu salin URL berakhiran `/exec`.

> Catatan keamanan: endpoint web app publik ini tidak memiliki autentikasi. Siapa pun yang memperoleh URL dapat membaca/menambahkan data. Gunakan hanya untuk data operasional non-rahasia; jangan masukkan data pribadi atau sensitif. Untuk produksi multi-user, tambahkan autentikasi dan validasi akses sebelum digunakan.

## 2. Deploy frontend ke Vercel
1. Import repository `teneobot-lab/debox-pleburan-inventory` ke Vercel.
2. Framework preset: **Vite**. Build command: `npm run build`. Output directory: `dist`.
3. Tambahkan Environment Variable:
   - Name: `VITE_APPS_SCRIPT_URL`
   - Value: URL Web App Apps Script yang berakhiran `/exec`
4. Deploy. Jika URL Apps Script berubah, perbarui environment variable dan lakukan redeploy.

## 3. Alur stok
- Stok Sistem = Stok Awal + Barang Masuk − Penjualan − Barang Reject.
- Selisih = Stok Fisik − Stok Sistem.
- Opname disimpan sebagai catatan per tanggal; data tanggal sebelumnya tidak ditimpa.
- Selisih tidak mengubah stok sistem otomatis.

## 4. Verifikasi
- Buka aplikasi dan tekan Refresh.
- Tambahkan master barang terlebih dahulu.
- Input Stok Awal, Barang Masuk, Penjualan, Reject, dan Stok Fisik sesuai kebutuhan.
- Rekap Selisih mengambil opname terakhir per barang.
