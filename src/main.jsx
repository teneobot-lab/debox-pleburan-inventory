import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { LayoutDashboard, Package, ArrowDownToLine, ShoppingCart, Trash2, ClipboardList, ChartNoAxesCombined, History, FileBarChart, RefreshCw, Plus, Search, Menu, X, AlertTriangle, Boxes, TrendingUp, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { api } from "./api";
import "./style.css";

const menus = [
  ["Dashboard", LayoutDashboard], ["Data Barang", Package], ["Stok Awal", Boxes],
  ["Barang Masuk", ArrowDownToLine], ["Penjualan", ShoppingCart], ["Barang Reject", Trash2],
  ["Stok Fisik / Opname", ClipboardList], ["Rekap Selisih", ChartNoAxesCombined],
  ["Riwayat Transaksi", History], ["Laporan", FileBarChart]
];
const fmt = n => new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(Number(n || 0));
const today = () => new Date().toLocaleDateString("en-CA");
const emptyForm = { tanggal: today(), kode: "", nama: "", jumlah: "", kategori: "", catatan: "" };

function App() {
  const [page, setPage] = useState("Dashboard"), [data, setData] = useState({}), [loading, setLoading] = useState(true);
  const [error, setError] = useState(""), [query, setQuery] = useState(""), [modal, setModal] = useState(false);
  const [form, setForm] = useState(emptyForm), [mobile, setMobile] = useState(false), [saving, setSaving] = useState(false);
  const load = async () => {
    setLoading(true); setError("");
    try { const r = await api("init"); setData(r.data || {}); }
    catch (e) { setError(e.message); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  const items = data.Master_Barang || [];
  const rows = useMemo(() => {
    const key = ({ "Data Barang":"Master_Barang", "Stok Awal":"Stok_Awal", "Barang Masuk":"Barang_Masuk", "Penjualan":"Penjualan", "Barang Reject":"Barang_Reject", "Stok Fisik / Opname":"Stok_Opname", "Riwayat Transaksi":"Riwayat_Aktivitas" })[page];
    const source = key ? (data[key] || []) : [];
    return source.filter(x => JSON.stringify(x).toLowerCase().includes(query.toLowerCase()));
  }, [data, page, query]);
  const calc = items.map(i => {
    const sum = key => (data[key] || []).filter(x => x.kode === i.kode).reduce((a,x) => a + Number(x.jumlah || 0), 0);
    const awal = sum("Stok_Awal"), masuk = sum("Barang_Masuk"), jual = sum("Penjualan"), reject = sum("Barang_Reject");
    const fisik = (data.Stok_Opname || []).filter(x => x.kode === i.kode).sort((a,b) => String(b.tanggal).localeCompare(String(a.tanggal)))[0];
    const sistem = awal + masuk - jual - reject;
    return { ...i, awal, masuk, jual, reject, sistem, fisik: fisik ? Number(fisik.jumlah) : null, selisih: fisik ? Number(fisik.jumlah) - sistem : null };
  });
  const total = key => (data[key] || []).reduce((a,x) => a + Number(x.jumlah || 0), 0);
  const save = async e => {
    e.preventDefault(); setSaving(true); setError("");
    try {
      const result = await api("create", { sheet: form.sheet, row: { ...form, jumlah: Number(form.jumlah), waktu: new Date().toISOString() } });
      setModal(false); setForm(emptyForm); await load();
    } catch (e) { setError(e.message); } finally { setSaving(false); }
  };
  const openForm = sheet => { setForm({ ...emptyForm, sheet }); setModal(true); };
  const title = page;
  const isTxn = ["Stok Awal","Barang Masuk","Penjualan","Barang Reject","Stok Fisik / Opname"].includes(page);
  const sheetMap = { "Stok Awal":"Stok_Awal", "Barang Masuk":"Barang_Masuk", "Penjualan":"Penjualan", "Barang Reject":"Barang_Reject", "Stok Fisik / Opname":"Stok_Opname" };
  const activeKey = ({ "Data Barang":"Master_Barang", "Stok Awal":"Stok_Awal", "Barang Masuk":"Barang_Masuk", "Penjualan":"Penjualan", "Barang Reject":"Barang_Reject", "Stok Fisik / Opname":"Stok_Opname", "Riwayat Transaksi":"Riwayat_Aktivitas" })[page];
  const shown = page === "Rekap Selisih" ? calc : rows;
  return <div className="app">
    <aside className={mobile ? "sidebar show" : "sidebar"}>
      <div className="brand"><div className="brandmark">D</div><div><b>DEBOX PLEBURAN</b><small>INVENTORY SYSTEM</small></div><button className="mobile-close" onClick={()=>setMobile(false)}><X size={18}/></button></div>
      <div className="nav-caption">WORKSPACE</div>
      <nav>{menus.map(([label,Icon]) => <button key={label} className={page===label?"nav active":"nav"} onClick={()=>{setPage(label);setQuery("");setMobile(false)}}><Icon size={18}/><span>{label}</span>{label==="Barang Reject" && <i className="dot"/>}</button>)}</nav>
      <div className="sidebar-foot"><span className="live-dot"/> Google Sheets Database <small>DEBOX · PLEBURAN</small></div>
    </aside>
    {mobile && <div className="scrim" onClick={()=>setMobile(false)}/>}
    <main className="main">
      <header className="topbar"><button className="menu-btn" onClick={()=>setMobile(true)}><Menu/></button><div className="crumb">Workspace <span>/</span> <b>{title}</b></div><div className="top-actions"><span className="today">{new Date().toLocaleDateString("id-ID",{weekday:"short",day:"2-digit",month:"short",year:"numeric"})}</span><button className="icon-btn" onClick={load} title="Refresh"><RefreshCw size={17}/></button><div className="avatar">DP</div></div></header>
      <section className="content">
        <div className="page-head"><div><div className="eyebrow">PT DEBOX PLEBURAN</div><h1>{title}</h1><p>{page==="Dashboard"?"Pantau pergerakan dan kondisi stok barang secara terpusat.": "Kelola dan pantau data "+title.toLowerCase()+"."}</p></div>
          <div className="head-actions">{isTxn && <button className="primary" onClick={()=>openForm(sheetMap[page])}><Plus size={17}/> Tambah Data</button>}<button className="secondary" onClick={load}><RefreshCw size={16}/> Refresh</button></div>
        </div>
        {error && <div className="alert"><AlertTriangle size={17}/><span>{error}</span></div>}
        {loading ? <div className="loading"><span className="spinner"/> Mengambil data dari Google Sheets...</div> :
        page==="Dashboard" ? <Dashboard calc={calc} data={data} total={total} setPage={setPage}/> :
        page==="Rekap Selisih" ? <div className="panel"><div className="panel-top"><div><h3>Rekap stok & selisih</h3><p>Selisih dihitung dari stok fisik opname terakhir.</p></div><input className="search" placeholder="Cari barang..." value={query} onChange={e=>setQuery(e.target.value)}/></div><Table rows={shown} columns={["kode","nama","sistem","fisik","selisih"]} labels={{kode:"Kode",nama:"Nama Barang",sistem:"Stok Sistem",fisik:"Stok Fisik",selisih:"Selisih"}}/></div> :
        page==="Laporan" ? <div className="grid-two"><div className="panel"><h3>Ringkasan transaksi</h3>{[["Barang Masuk",total("Barang_Masuk")],["Penjualan",total("Penjualan")],["Barang Reject",total("Barang_Reject")],["Stok Opname", (data.Stok_Opname||[]).length]].map(([k,v])=><div className="report-row"><span>{k}</span><b>{fmt(v)}</b></div>)}</div><div className="panel"><h3>Catatan perhitungan</h3><p className="muted">Stok Sistem = Stok Awal + Barang Masuk − Penjualan − Barang Reject.</p><p className="muted">Selisih = Stok Fisik − Stok Sistem. Selisih tidak mengubah stok sistem secara otomatis.</p></div></div> :
        <div className="panel"><div className="panel-top"><div><h3>{page}</h3><p>{shown.length} catatan tersimpan</p></div><div className="table-tools"><label className="searchbox"><Search size={16}/><input placeholder="Cari data..." value={query} onChange={e=>setQuery(e.target.value)}/></label>{page==="Data Barang" && <button className="primary" onClick={()=>openForm("Master_Barang")}><Plus size={16}/> Barang</button>}</div></div>
          <Table rows={shown} columns={page==="Data Barang"?["kode","nama","kategori","satuan","stok_minimum"]:["tanggal","kode","nama","jumlah","kategori","catatan"]} labels={{kode:"Kode",nama:"Nama Barang",tanggal:"Tanggal",jumlah:"Jumlah",kategori:"Kategori / Alasan",satuan:"Satuan",stok_minimum:"Min. Stok",catatan:"Catatan"}} empty="Belum ada data. Tambahkan catatan pertama."/>
        </div>}
        <footer>DEBOX PLEBURAN <span>•</span> Inventory Management <span className="foot-right">Data tersinkron melalui Google Sheets</span></footer>
      </section>
    </main>
    {modal && <div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&setModal(false)}><form className="modal" onSubmit={save}><div className="modal-head"><div><small>INPUT DATA</small><h2>{form.sheet==="Master_Barang"?"Tambah Barang": "Tambah "+page}</h2></div><button type="button" className="icon-btn" onClick={()=>setModal(false)}><X/></button></div>
      {form.sheet==="Master_Barang" ? <><Field label="Kode Barang" value={form.kode} onChange={v=>setForm({...form,kode:v})} required/><Field label="Nama Barang" value={form.nama} onChange={v=>setForm({...form,nama:v})} required/><Field label="Kategori" value={form.kategori} onChange={v=>setForm({...form,kategori:v})}/><Field label="Satuan" value={form.satuan||"PCS"} onChange={v=>setForm({...form,satuan:v})}/><Field label="Stok Minimum" type="number" value={form.stok_minimum||0} onChange={v=>setForm({...form,stok_minimum:v})}/></> :
      <><Field label="Tanggal" type="date" value={form.tanggal} onChange={v=>setForm({...form,tanggal:v})} required/><label className="field"><span>Barang</span><select required value={form.kode} onChange={e=>{const i=items.find(x=>x.kode===e.target.value);setForm({...form,kode:e.target.value,nama:i?.nama||""})}}><option value="">Pilih barang...</option>{items.map(i=><option value={i.kode}>{i.kode} — {i.nama}</option>)}</select></label><Field label="Jumlah" type="number" value={form.jumlah} onChange={v=>setForm({...form,jumlah:v})} required/><Field label={form.sheet==="Barang_Reject"?"Kategori / Alasan Reject":"Kategori (opsional)"} value={form.kategori} onChange={v=>setForm({...form,kategori:v})}/><Field label="Catatan" value={form.catatan} onChange={v=>setForm({...form,catatan:v})}/></>}
      <div className="modal-actions"><button type="button" className="secondary" onClick={()=>setModal(false)}>Batal</button><button className="primary" disabled={saving}>{saving?"Menyimpan...":"Simpan Data"}</button></div></form></div>}
  </div>;
}
function Field({label,value,onChange,type="text",required=false}){return <label className="field"><span>{label}</span><input type={type} value={value??""} onChange={e=>onChange(e.target.value)} required={required} min={type==="number"?"0":undefined} step={type==="number"?"any":undefined}/></label>}
function Table({rows,columns,labels={},empty="Tidak ada data."}){return <div className="table-wrap"><table><thead><tr>{columns.map(c=><th>{labels[c]||c}</th>)}</tr></thead><tbody>{rows.length?rows.map((r,i)=><tr key={i}>{columns.map(c=><td>{c==="selisih"&&r[c]!=null?<span className={Number(r[c])<0?"negative":Number(r[c])>0?"positive":"neutral"}>{Number(r[c])>0?"+":""}{fmt(r[c])}</span>:r[c]??"—"}</td>)}</tr>):<tr><td className="empty" colSpan={columns.length}>{empty}</td></tr>}</tbody></table></div>}
function Dashboard({calc,data,total,setPage}){const low=calc.filter(x=>x.sistem<=Number(x.stok_minimum||0));return <><div className="stats"><Stat label="Total Jenis Barang" value={calc.length} icon={Package} hint="SKU terdaftar"/><Stat label="Total Barang Masuk" value={fmt(total("Barang_Masuk"))} icon={ArrowDownToLine} hint="Akumulasi jumlah"/><Stat label="Total Penjualan" value={fmt(total("Penjualan"))} icon={ShoppingCart} hint="Akumulasi jumlah"/><Stat label="Barang Reject" value={fmt(total("Barang_Reject"))} icon={Trash2} hint="Akumulasi jumlah"/></div><div className="dashboard-grid"><div className="panel"><div className="panel-top"><div><h3>Ringkasan stok</h3><p>Perhitungan stok sistem saat ini</p></div><button className="text-btn" onClick={()=>setPage("Rekap Selisih")}>Lihat rekap <ArrowUpRight size={15}/></button></div><Table rows={calc.slice(0,7)} columns={["kode","nama","sistem","stok_minimum"]} labels={{kode:"Kode",nama:"Nama Barang",sistem:"Stok Sistem",stok_minimum:"Min. Stok"}} empty="Belum ada master barang."/></div><div className="panel side-panel"><div className="panel-top"><div><h3>Perlu perhatian</h3><p>Stok menyentuh batas minimum</p></div><span className="count">{low.length}</span></div>{low.length?low.slice(0,6).map(i=><div className="low-item"><div className="low-icon"><AlertTriangle size={16}/></div><div><b>{i.nama}</b><small>{i.kode}</small></div><strong>{fmt(i.sistem)}</strong></div>):<div className="all-good">Semua stok di atas batas minimum.</div>}<button className="wide-btn" onClick={()=>setPage("Data Barang")}>Kelola data barang</button></div></div></>}
function Stat({label,value,icon:Icon,hint}){return <div className="stat"><div className="stat-top"><span>{label}</span><div className="stat-icon"><Icon size={18}/></div></div><strong>{value}</strong><small>{hint}</small></div>}
createRoot(document.getElementById("root")).render(<App/>);