# Setup DEBOX PLEBURAN — Supabase + Vercel (bisa dari HP)

## A. Buat database Supabase
1. Buka https://supabase.com/dashboard melalui Chrome Android, login, lalu tekan **New project**.
2. Isi nama proyek, password database (simpan sendiri), dan pilih region terdekat yang tersedia.
3. Tunggu proyek selesai dibuat.
4. Buka **SQL Editor → New query**.
5. Di GitHub buka file `supabase/schema.sql` pada repository ini. Salin seluruh isinya.
6. Kembali ke SQL Editor, tempel SQL tersebut, lalu tekan **Run**. Ini membuat tabel inventaris dan mengaktifkan RLS.

## B. Buat akun administrator
1. Di Supabase buka **Authentication → Users → Add user → Create new user**.
2. Masukkan email dan password login aplikasi. Simpan password dengan aman.
3. Pastikan pendaftaran publik (Allow new users to sign up) dinonaktifkan pada Authentication Settings.
4. Akun tambahan hanya dibuat administrator dari halaman Users.

## C. Ambil URL dan publishable key
1. Buka **Project Settings → API Keys** atau tombol **Connect**.
2. Salin **Project URL**.
3. Salin **Publishable key** (pada proyek lama mungkin bernama anon key).
4. Jangan gunakan **service_role** atau **secret key** di frontend.

## D. Hubungkan ke Vercel
1. Buka https://vercel.com/dashboard dan import repository `teneobot-lab/debox-pleburan-inventory`.
2. Framework: **Vite**; Build command: `npm run build`; Output directory: `dist`.
3. Pada **Settings → Environment Variables**, tambahkan:
   - `VITE_SUPABASE_URL` = Project URL.
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = Publishable key.
4. Simpan, lalu lakukan **Redeploy**.
5. Buka domain Vercel dan login dengan akun administrator dari langkah B.

## E. Cara kerja stok
- Stok Sistem = Stok Awal + Barang Masuk − Penjualan − Barang Reject.
- Selisih = Stok Fisik − Stok Sistem.
- Opname disimpan per tanggal; catatan lama tidak ditimpa.
- Selisih tidak mengubah stok sistem otomatis.

## Catatan
- Semua setup bisa dilakukan lewat browser HP; Google Apps Script tidak diperlukan.
- Publishable key boleh digunakan di frontend karena akses data dibatasi oleh RLS dan sesi login.
- Jangan pernah membagikan password database, password akun, atau service role/secret key.
- Versi awal ini belum memiliki fitur edit/hapus, ekspor laporan, dan transaksi atomik. Uji data terlebih dahulu sebelum operasional utama.
