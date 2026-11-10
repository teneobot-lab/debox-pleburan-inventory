-- DEBOX PLEBURAN Inventory schema
create extension if not exists pgcrypto;

create table if not exists public.master_barang (
 kode text primary key, nama text not null, kategori text default '', satuan text default 'PCS',
 stok_minimum numeric(14,3) not null default 0, created_at timestamptz not null default now()
);

create table if not exists public.stok_awal (
 id uuid primary key default gen_random_uuid(), tanggal date not null,
 kode text not null references public.master_barang(kode), nama text not null,
 jumlah numeric(14,3) not null check (jumlah >= 0), kategori text default '',
 catatan text default '', waktu timestamptz not null default now()
);\n
create table if not exists public.barang_masuk (
 id uuid primary key default gen_random_uuid(), tanggal date not null,
 kode text not null references public.master_barang(kode), nama text not null,
 jumlah numeric(14,3) not null check (jumlah >= 0), kategori text default '',
 catatan text default '', waktu timestamptz not null default now()
);\n
create table if not exists public.penjualan (
 id uuid primary key default gen_random_uuid(), tanggal date not null,
 kode text not null references public.master_barang(kode), nama text not null,
 jumlah numeric(14,3) not null check (jumlah >= 0), kategori text default '',
 catatan text default '', waktu timestamptz not null default now()
);\n
create table if not exists public.barang_reject (
 id uuid primary key default gen_random_uuid(), tanggal date not null,
 kode text not null references public.master_barang(kode), nama text not null,
 jumlah numeric(14,3) not null check (jumlah >= 0), kategori text default '',
 catatan text default '', waktu timestamptz not null default now()
);\n
create table if not exists public.stok_opname (
 id uuid primary key default gen_random_uuid(), tanggal date not null,
 kode text not null references public.master_barang(kode), nama text not null,
 jumlah numeric(14,3) not null check (jumlah >= 0), kategori text default '',
 catatan text default '', waktu timestamptz not null default now()
);
create table if not exists public.riwayat_aktivitas (
 id uuid primary key default gen_random_uuid(), tanggal date not null, kode text not null, nama text not null,
 jumlah numeric(14,3) not null default 0, kategori text default '', catatan text default '',
 waktu timestamptz not null default now(), jenis text not null
);
alter table public.master_barang enable row level security;
revoke all on table public.master_barang from anon;
grant select, insert, update, delete on table public.master_barang to authenticated;
drop policy if exists "master_barang_authenticated_access" on public.master_barang;
create policy "master_barang_authenticated_access" on public.master_barang for all to authenticated using (true) with check (true);\nalter table public.stok_awal enable row level security;
revoke all on table public.stok_awal from anon;
grant select, insert, update, delete on table public.stok_awal to authenticated;
drop policy if exists "stok_awal_authenticated_access" on public.stok_awal;
create policy "stok_awal_authenticated_access" on public.stok_awal for all to authenticated using (true) with check (true);\nalter table public.barang_masuk enable row level security;
revoke all on table public.barang_masuk from anon;
grant select, insert, update, delete on table public.barang_masuk to authenticated;
drop policy if exists "barang_masuk_authenticated_access" on public.barang_masuk;
create policy "barang_masuk_authenticated_access" on public.barang_masuk for all to authenticated using (true) with check (true);\nalter table public.penjualan enable row level security;
revoke all on table public.penjualan from anon;
grant select, insert, update, delete on table public.penjualan to authenticated;
drop policy if exists "penjualan_authenticated_access" on public.penjualan;
create policy "penjualan_authenticated_access" on public.penjualan for all to authenticated using (true) with check (true);\nalter table public.barang_reject enable row level security;
revoke all on table public.barang_reject from anon;
grant select, insert, update, delete on table public.barang_reject to authenticated;
drop policy if exists "barang_reject_authenticated_access" on public.barang_reject;
create policy "barang_reject_authenticated_access" on public.barang_reject for all to authenticated using (true) with check (true);\nalter table public.stok_opname enable row level security;
revoke all on table public.stok_opname from anon;
grant select, insert, update, delete on table public.stok_opname to authenticated;
drop policy if exists "stok_opname_authenticated_access" on public.stok_opname;
create policy "stok_opname_authenticated_access" on public.stok_opname for all to authenticated using (true) with check (true);\nalter table public.riwayat_aktivitas enable row level security;
revoke all on table public.riwayat_aktivitas from anon;
grant select, insert, update, delete on table public.riwayat_aktivitas to authenticated;
drop policy if exists "riwayat_aktivitas_authenticated_access" on public.riwayat_aktivitas;
create policy "riwayat_aktivitas_authenticated_access" on public.riwayat_aktivitas for all to authenticated using (true) with check (true);
