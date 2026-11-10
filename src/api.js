import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const supabase = url && key ? createClient(url, key) : null;
const TABLES = { Master_Barang:"master_barang", Stok_Awal:"stok_awal", Barang_Masuk:"barang_masuk", Penjualan:"penjualan", Barang_Reject:"barang_reject", Stok_Opname:"stok_opname", Riwayat_Aktivitas:"riwayat_aktivitas" };
function client(){ if(!supabase) throw new Error("Konfigurasi Supabase belum lengkap. Isi VITE_SUPABASE_URL dan VITE_SUPABASE_PUBLISHABLE_KEY di Vercel."); return supabase; }
export async function getSession(){ const {data,error}=await client().auth.getSession(); if(error) throw error; return data.session; }
export function watchAuth(callback){ const {data}=client().auth.onAuthStateChange((_event,session)=>callback(session)); return ()=>data.subscription.unsubscribe(); }
export async function signIn(email,password){ const {data,error}=await client().auth.signInWithPassword({email,password}); if(error) throw error; return data; }
export async function signOut(){ const {error}=await client().auth.signOut(); if(error) throw error; }
export async function api(action,payload={}){
 const db=client();
 if(action==="init"){
  if(!(await getSession())) throw new Error("Silakan login terlebih dahulu.");
  const entries=await Promise.all(Object.entries(TABLES).map(async([key,table])=>{const {data,error}=await db.from(table).select("*").order(key==="Master_Barang"?"created_at":"waktu",{ascending:false});if(error)throw error;return[key,data||[]];}));
  return {ok:true,data:Object.fromEntries(entries)};
 }
 if(action==="create"){
  const table=TABLES[payload.sheet]; if(!table||payload.sheet==="Riwayat_Aktivitas")throw new Error("Jenis data tidak diizinkan.");
  const row={...(payload.row||{})}; delete row.sheet;
  if(payload.sheet==="Master_Barang"){
   if(!String(row.kode||"").trim())throw new Error("Kode barang wajib diisi."); row.kode=String(row.kode).trim();row.stok_minimum=Number(row.stok_minimum||0);
   const {error}=await db.from(table).insert(row);if(error?.code==="23505")throw new Error("Kode barang sudah digunakan.");if(error)throw error;
  }else{
   row.jumlah=Number(row.jumlah);if(!row.kode||!Number.isFinite(row.jumlah)||row.jumlah<0)throw new Error("Pilih barang dan isi jumlah yang valid.");
   const {error}=await db.from(table).insert(row);if(error)throw error;
   const {error:logError}=await db.from("riwayat_aktivitas").insert({tanggal:row.tanggal,kode:row.kode,nama:row.nama,jumlah:row.jumlah,kategori:row.kategori||"",catatan:row.catatan||"",waktu:row.waktu||new Date().toISOString(),jenis:payload.sheet});
   if(logError)throw new Error("Transaksi tersimpan, tetapi pencatatan riwayat gagal: "+logError.message);
  }
  return {ok:true,message:"Data tersimpan."};
 }
 throw new Error("Aksi tidak dikenal.");
}
