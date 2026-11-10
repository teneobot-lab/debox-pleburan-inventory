# DEBOX PLEBURAN Inventory

Aplikasi inventaris PT DEBOX PLEBURAN menggunakan React + Vite, Supabase PostgreSQL sebagai database dan Supabase Auth untuk login. Frontend dapat di-host di Vercel.

Ikuti panduan HP di [docs/SETUP.md](docs/SETUP.md). Jalankan SQL dari `supabase/schema.sql`, buat akun administrator di Supabase Authentication, lalu isi dua environment variable di Vercel.

**Keamanan:** aplikasi memakai Supabase publishable key dengan Row Level Security (RLS). Jangan pernah memasukkan service role/secret key ke frontend atau variabel `VITE_*`. Nonaktifkan pendaftaran publik; akun hanya dibuat administrator.
