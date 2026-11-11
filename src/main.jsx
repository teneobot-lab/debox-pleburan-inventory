import React, { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { createRoot } from "react-dom/client";
import {
  LayoutDashboard, Package, ArrowDownToLine, ShoppingCart, Trash2,
  ClipboardList, ChartNoAxesCombined, History, FileBarChart, RefreshCw, FileSpreadsheet,
  Plus, Search, Menu, X, AlertTriangle, Boxes, MoreHorizontal, ChevronDown,
  ChevronUp, Check, ArrowUpRight, LogOut, CalendarDays
} from "lucide-react";
import { api, getSession, watchAuth, signIn, signOut } from "./api";
import "./style.css";

const menus = [
  ["Dashboard", LayoutDashboard], ["Data Barang", Package], ["Stok Awal", Boxes],
  ["Barang Masuk", ArrowDownToLine], ["Penjualan", ShoppingCart],
  ["Barang Reject", Trash2], ["Stok Fisik / Opname", ClipboardList],
  ["Rekap Selisih", ChartNoAxesCombined], ["Riwayat Transaksi", History],
  ["Laporan", FileBarChart]
];
const primaryMenus = ["Dashboard", "Data Barang", "Barang Masuk", "Penjualan", "Stok Fisik / Opname"];
const moreMenus = ["Stok Awal", "Barang Reject", "Riwayat Transaksi", "Rekap Selisih", "Laporan"];
const fmt = n => new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(Number(n || 0));
const today = () => new Date().toLocaleDateString("en-CA");
const emptyForm = { tanggal: today(), kode: "", nama: "", jumlah: "", kategori: "", catatan: "" };
const keyByPage = {
  "Data Barang":"Master_Barang", "Stok Awal":"Stok_Awal", "Barang Masuk":"Barang_Masuk",
  "Penjualan":"Penjualan", "Barang Reject":"Barang_Reject",
  "Stok Fisik / Opname":"Stok_Opname", "Riwayat Transaksi":"Riwayat_Aktivitas"
};
const sheetMap = {
  "Stok Awal":"Stok_Awal", "Barang Masuk":"Barang_Masuk", "Penjualan":"Penjualan",
  "Barang Reject":"Barang_Reject", "Stok Fisik / Opname":"Stok_Opname"
};
const statusOf = item => item.sistem < 0 ? ["Minus","minus"] :
  item.sistem === 0 ? ["Habis","empty"] :
  item.sistem <= Number(item.stok_minimum || 0) ? ["Menipis","low"] : ["Aman","safe"];
const dateLabel = value => {
  const d = new Date(value + "T00:00:00");
  const now = new Date(); now.setHours(0,0,0,0);
  const yesterday = new Date(now); yesterday.setDate(now.getDate()-1);
  if (d.getTime() === now.getTime()) return "Hari ini";
  if (d.getTime() === yesterday.getTime()) return "Kemarin";
  return d.toLocaleDateString("id-ID",{day:"2-digit",month:"long",year:"numeric"});
};

function App() {
  const [page, setPage] = useState("Dashboard"), [data, setData] = useState({}), [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null), [authReady, setAuthReady] = useState(false);
  const [error, setError] = useState(""), [query, setQuery] = useState(""), [modal, setModal] = useState(false);
  const [form, setForm] = useState(emptyForm), [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(""), [moreOpen, setMoreOpen] = useState(false);
  const [filter, setFilter] = useState("Semua"), [toast, setToast] = useState("");
  const [quickAddQuery, setQuickAddQuery] = useState(""), [quickAddOpen, setQuickAddOpen] = useState(false);
  const [cartDate, setCartDate] = useState(today()), [cartItem, setCartItem] = useState(null);
  const [cartQty, setCartQty] = useState(""), [cart, setCart] = useState([]);
  const [expandedTransactionDate, setExpandedTransactionDate] = useState("");
  const [historyType, setHistoryType] = useState("Semua");
  const [reportFrom, setReportFrom] = useState("");
  const [reportTo, setReportTo] = useState("");
  const [reportType, setReportType] = useState("Semua");
  const [reportQuery, setReportQuery] = useState("");
  const [reconcileDate, setReconcileDate] = useState(today()), [reconcileFilter, setReconcileFilter] = useState("Semua");

  const load = async () => {
    setLoading(true); setError("");
    try { const r = await api("init"); setData(r.data || {}); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => {
    getSession().then(setSession).catch(e => setError(e.message)).finally(() => setAuthReady(true));
    return watchAuth(setSession);
  }, []);
  useEffect(() => { if (session) load(); }, [session]);

  const items = data.Master_Barang || [];
  const quickAddResults = items.filter(item => (String(item.nama || "") + " " + String(item.kode || "")).toLowerCase().includes(quickAddQuery.trim().toLowerCase())).slice(0,8);
  const calc = items.map(i => {
    const sum = key => (data[key] || []).filter(x => x.kode === i.kode).reduce((a,x) => a + Number(x.jumlah || 0), 0);
    const awal = sum("Stok_Awal"), masuk = sum("Barang_Masuk"), jual = sum("Penjualan"), reject = sum("Barang_Reject");
    const fisik = (data.Stok_Opname || []).filter(x => x.kode === i.kode).sort((a,b) => String(b.tanggal).localeCompare(String(a.tanggal)))[0];
    const sistem = awal + masuk - jual - reject;
    return { ...i, awal, masuk, jual, reject, sistem, fisik: fisik ? Number(fisik.jumlah) : null, selisih: fisik ? Number(fisik.jumlah) - sistem : null };
  });
  const reconcileRows = useMemo(() => items.map(item => {
    const sumUntil = key => (data[key] || []).filter(x => x.kode === item.kode && String(x.tanggal || "").slice(0,10) <= reconcileDate).reduce((n,x) => n + Number(x.jumlah || 0), 0);
    const sistem = sumUntil("Stok_Awal") + sumUntil("Barang_Masuk") - sumUntil("Penjualan") - sumUntil("Barang_Reject");
    const opname = (data.Stok_Opname || []).filter(x => x.kode === item.kode && String(x.tanggal || "").slice(0,10) === reconcileDate).sort((a,b) => String(b.waktu || "").localeCompare(String(a.waktu || "")))[0];
    const fisik = opname ? Number(opname.jumlah) : null;
    return { ...item, sistem, fisik, selisih: fisik === null ? null : fisik - sistem };
  }), [items, data, reconcileDate]);
  const filteredReconcileRows = useMemo(() => reconcileRows.filter(item => {
    const q = query.trim().toLowerCase();
    const matches = (String(item.nama || "") + " " + String(item.kode || "") + " " + String(item.kategori || "")).toLowerCase().includes(q);
    const status = item.selisih === null ? "Belum Opname" : item.selisih < 0 ? "Minus" : item.selisih > 0 ? "Surplus" : "Sesuai";
    return matches && (reconcileFilter === "Semua" || status === reconcileFilter);
  }), [reconcileRows, query, reconcileFilter]);
  const total = key => (data[key] || []).reduce((a,x) => a + Number(x.jumlah || 0), 0);
  const rows = useMemo(() => {
    const source = keyByPage[page] ? (data[keyByPage[page]] || []) : [];
    return source.filter(x => JSON.stringify(x).toLowerCase().includes(query.toLowerCase()));
  }, [data, page, query]);
  const shownStock = useMemo(() => {
    const q = query.toLowerCase();
    return calc.filter(x => {
      const matches = (x.nama + " " + x.kode + " " + (x.kategori || "")).toLowerCase().includes(q);
      const [label] = statusOf(x);
      return matches && (filter === "Semua" || label === filter);
    });
  }, [calc, query, filter]);

  const openForm = sheet => {
    setForm({ ...emptyForm, sheet, satuan:"PCS", mode:"create" });
    setModal(true); setExpanded("");
  };
  const openEditBarang = item => {
    setForm({ kode:item.kode, nama:item.nama||"", kategori:item.kategori||"", satuan:item.satuan||"PCS", stok_minimum:String(item.stok_minimum??0), sheet:"Master_Barang", mode:"edit" });
    setModal(true); setExpanded("");
  };
  const deleteBarang = async item => {
    const approved=window.confirm("Hapus barang "+item.nama+" ("+item.kode+")? Tindakan ini tidak dapat dibatalkan.");
    if(!approved) return;
    setSaving(true); setError("");
    try {
      await api("delete",{sheet:"Master_Barang",kode:item.kode});
      setToast("Barang "+item.nama+" berhasil dihapus.");
      await load();
    } catch(e) { setError(e.message); setToast(e.message); }
    finally { setSaving(false); }
  };
  const startTransactionForItem = item => {
    const sheet = sheetMap[page];
    if (!sheet || !item) return;
    setForm({
      ...emptyForm,
      sheet,
      satuan: item.satuan || "PCS",
      kode: item.kode,
      nama: item.nama
    });
    setQuickAddQuery("");
    setQuickAddOpen(false);
    setModal(true);
    setExpanded("");
  };
  const addCartItem = () => {
    if (!cartItem || cartQty === "" || !Number.isFinite(Number(cartQty)) || Number(cartQty) <= 0) {
      setToast("Pilih barang dan isi jumlah lebih dari 0."); return;
    }
    setCart(prev => {
      const next = [...prev];
      const index = next.findIndex(x=>x.kode===cartItem.kode);
      const entry = { kode:cartItem.kode, nama:cartItem.nama, satuan:cartItem.satuan||"PCS", jumlah:Number(cartQty) };
      if (index >= 0) next[index] = { ...entry, jumlah:page==="Stok Fisik / Opname" ? entry.jumlah : next[index].jumlah + entry.jumlah };
      else next.push(entry);
      return next;
    });
    setCartItem(null); setCartQty(""); setQuickAddQuery(""); setQuickAddOpen(false);
  };
  const removeCartItem = index => setCart(prev => prev.filter((_,i)=>i!==index));
  const saveCart = async () => {
    if (saving || !cart.length) return;
    const sheet = sheetMap[page];
    if (!sheet) return;
    setSaving(true); setError("");
    try {
      for (const item of cart) {
        await api("create", { sheet, row: {
          tanggal:cartDate, kode:item.kode, nama:item.nama, jumlah:item.jumlah,
          satuan:item.satuan, kategori:"", catatan:"", waktu:new Date().toISOString()
        }});
      }
      const count=cart.length;
      setCart([]); setToast(count+" item berhasil disimpan untuk "+dateLabel(cartDate)+".");
      await load();
    } catch (e) { setError(e.message); setToast("Penyimpanan terhenti: "+e.message); }
    finally { setSaving(false); }
  };
  const save = async e => {
    e.preventDefault();
    if (saving) return;
    setSaving(true); setError("");
    try {
      if(form.sheet==="Master_Barang" && form.mode==="edit") {
        await api("update",{sheet:"Master_Barang",kode:form.kode,row:{nama:form.nama,kategori:form.kategori,satuan:form.satuan,stok_minimum:form.stok_minimum}});
        setToast("Data barang berhasil diperbarui.");
      } else {
        await api("create", { sheet: form.sheet, row: { ...form, jumlah: Number(form.jumlah), waktu: new Date().toISOString() } });
        setToast("Data berhasil disimpan.");
      }
      setModal(false); setForm(emptyForm); await load();
    } catch (e) { setError(e.message); setToast(e.message); }
    finally { setSaving(false); }
  };
  const changePage = label => {
    setPage(label); setQuery(""); setFilter("Semua"); setExpanded(""); setMoreOpen(false);
  };
  const isTxn = ["Stok Awal","Barang Masuk","Penjualan","Barang Reject","Stok Fisik / Opname"].includes(page);
  const selectedItem = calc.find(x => x.kode === form.kode);
  const delta = form.jumlah === "" || !selectedItem ? null : Number(form.jumlah) - selectedItem.sistem;
  const title = page;
  const isStockPage = page === "Data Barang";
  const activeKey = keyByPage[page];
  const isHistory = page === "Riwayat Transaksi";
  const historyDiffs = (data.Stok_Opname||[]).map(o=>{
    const d=String(o.tanggal||"").slice(0,10),sum=k=>(data[k]||[]).filter(x=>x.kode===o.kode&&String(x.tanggal||"").slice(0,10)<=d).reduce((s,x)=>s+Number(x.jumlah||0),0);
    const sistem=sum("Stok_Awal")+sum("Barang_Masuk")-sum("Penjualan")-sum("Barang_Reject");
    return {...o,jenis:"Selisih",jumlah:Number(o.jumlah||0)-sistem,stok_sistem:sistem,stok_fisik:Number(o.jumlah||0)};
  });
  const historyRows = [...(data.Riwayat_Aktivitas||[]),...historyDiffs].filter(r=>(historyType==="Semua" || (historyType==="Selisih" ? r.jenis==="Selisih" : String(r.jenis||"").replaceAll("_"," ").toLowerCase().includes(historyType.toLowerCase()))) && JSON.stringify(r).toLowerCase().includes(query.toLowerCase()));
  const historyGroups = isHistory ? historyRows.reduce((acc,row) => {
    const key = row.tanggal || "Tanpa tanggal"; (acc[key] ||= []).push(row); return acc;
  }, {}) : {};
  const transactionGroups = isTxn ? rows.reduce((acc,row) => {
    const key = String(row.tanggal || "Tanpa tanggal").slice(0,10);
    (acc[key] ||= []).push(row); return acc;
  }, {}) : {};
  const sortedTransactionGroups = Object.entries(transactionGroups).sort((a,b)=>b[0].localeCompare(a[0]));


  const reportRows = useMemo(() => {
    const q=reportQuery.trim().toLowerCase();
    const inRange=r=>(!reportFrom||String(r.tanggal||"").slice(0,10)>=reportFrom)&&(!reportTo||String(r.tanggal||"").slice(0,10)<=reportTo);
    const matches=r=>(String(r.nama||"")+" "+String(r.kode||"")+" "+String(r.catatan||"")).toLowerCase().includes(q);
    const rows=(data.Riwayat_Aktivitas||[]).filter(r=>inRange(r)&&matches(r)&&(reportType==="Semua"||String(r.jenis||"").replaceAll("_"," ").toLowerCase().includes(reportType.toLowerCase())));
    if(reportType==="Semua"||reportType==="Selisih") (data.Stok_Opname||[]).filter(inRange).forEach(o=>{
      const d=String(o.tanggal||"").slice(0,10);
      const sum=k=>(data[k]||[]).filter(x=>x.kode===o.kode&&String(x.tanggal||"").slice(0,10)<=d).reduce((s,x)=>s+Number(x.jumlah||0),0);
      const sistem=sum("Stok_Awal")+sum("Barang_Masuk")-sum("Penjualan")-sum("Barang_Reject");
      const x={...o,jenis:"Selisih",stok_sistem:sistem,stok_fisik:Number(o.jumlah||0),jumlah:Number(o.jumlah||0)-sistem};
      if(matches(x)) rows.push(x);
    });
    return rows.filter(r=>reportType!=="Selisih"||r.jenis==="Selisih").sort((a,b)=>String(b.tanggal||"").localeCompare(String(a.tanggal||"")));
  },[data,reportFrom,reportTo,reportType,reportQuery]);
  const exportReport = () => {
    const rows = reportRows.map(r => ({
      "Tanggal": r.tanggal || "",
      "Jenis Transaksi": String(r.jenis || "").replaceAll("_", " "),
      "Kode Barang": r.kode || "",
      "Nama Barang": r.nama || "",
      "Jumlah / Selisih": Number(r.jumlah || 0),
      "Satuan": r.satuan || "PCS",
      "Stok Sistem": r.stok_sistem === undefined ? "" : Number(r.stok_sistem),
      "Stok Fisik": r.stok_fisik === undefined ? "" : Number(r.stok_fisik),
      "Catatan": r.catatan || ""
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows, {header:["Tanggal","Jenis Transaksi","Kode Barang","Nama Barang","Jumlah / Selisih","Satuan","Stok Sistem","Stok Fisik","Catatan"]});
    ws["!cols"] = [{wch:14},{wch:20},{wch:18},{wch:30},{wch:18},{wch:12},{wch:15},{wch:15},{wch:36}];
    XLSX.utils.book_append_sheet(wb, ws, "Data Laporan");
    const info = [
      ["DEBOX PLEBURAN - LAPORAN"],
      ["Tanggal Export", today()],
      ["Filter Dari", reportFrom || "Semua tanggal"],
      ["Filter Sampai", reportTo || "Semua tanggal"],
      ["Jenis Laporan", reportType],
      ["Kata Kunci", reportQuery || "-"],
      ["Jumlah Baris", rows.length]
    ];
    const meta = XLSX.utils.aoa_to_sheet(info);
    meta["!cols"] = [{wch:24},{wch:34}];
    XLSX.utils.book_append_sheet(wb, meta, "Ringkasan Filter");
    XLSX.writeFile(wb, "DEBOX-PLEBURAN-Laporan-" + today() + ".xlsx", {bookType:"xlsx", compression:true});
  };
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 2800);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const viewport = window.visualViewport;
    const updateViewport = () => {
      const height = viewport ? viewport.height : window.innerHeight;
      const top = viewport ? viewport.offsetTop : 0;
      document.documentElement.style.setProperty("--visible-vh", height + "px");
      document.documentElement.style.setProperty("--visible-top", top + "px");
      document.body.classList.toggle("keyboard-open", Boolean(viewport && window.innerHeight - viewport.height > 140));
    };
    updateViewport();
    if (viewport) { viewport.addEventListener("resize", updateViewport); viewport.addEventListener("scroll", updateViewport); }
    window.addEventListener("resize", updateViewport);
    const keepFocusedFieldVisible = event => {
      if (!event.target.matches("input, textarea, select")) return;
      window.setTimeout(() => {
        const field = event.target;
        if (!field.isConnected) return;
        const modal = field.closest(".modal");
        if (modal) {
          const rect = field.getBoundingClientRect(); const box = modal.getBoundingClientRect();
          if (rect.bottom > box.bottom - 24 || rect.top < box.top + 12) field.scrollIntoView({block:"center",behavior:"smooth"});
        } else field.scrollIntoView({block:"center",behavior:"smooth"});
      }, 280);
    };
    document.addEventListener("focusin", keepFocusedFieldVisible);
    return () => {
      if (viewport) { viewport.removeEventListener("resize", updateViewport); viewport.removeEventListener("scroll", updateViewport); }
      window.removeEventListener("resize", updateViewport); document.removeEventListener("focusin", keepFocusedFieldVisible);
      document.body.classList.remove("keyboard-open");
    };
  }, []);

  if (!authReady) return <div className="auth-screen"><div className="auth-card">Memeriksa sesi login...</div></div>;
  if (!session) return <Login />;

  return <div className="app">
    <aside className="sidebar">
      <div className="brand"><div className="brandmark logo-slot"><img src="/logo-debox.png" alt="DEBOX PLEBURAN" onError={e=>{e.currentTarget.style.display="none";}}/><span>D</span></div><div><b>DEBOX PLEBURAN</b><small>INVENTORY</small></div></div>
      <div className="nav-caption">MENU UTAMA</div>
      <nav>{menus.map(([label,Icon]) => <button key={label} className={page===label?"nav active":"nav"} onClick={()=>changePage(label)}><Icon size={18}/><span>{label}</span></button>)}</nav>
      <div className="sidebar-foot"><span className="live-dot"/> Terhubung ke Supabase</div>
    </aside>

    <main className="main">
      <header className="topbar">
        <div className="topbar-title"><span className="eyebrow">PT DEBOX PLEBURAN</span><h1>{title}</h1></div>
        <div className="top-actions">
          <span className="today">{new Date().toLocaleDateString("id-ID",{weekday:"short",day:"2-digit",month:"short",year:"numeric"})}</span>
          <button className="icon-btn" onClick={load} aria-label="Muat ulang" title="Muat ulang"><RefreshCw size={18}/></button>
          <button className="logout-btn" onClick={signOut}><LogOut size={16}/><span>Keluar</span></button>
        </div>
      </header>

      <section className="content">
        {error && <div className="alert" role="alert"><AlertTriangle size={17}/><span>{error}</span><button className="alert-close" onClick={()=>setError("")} aria-label="Tutup pesan"><X size={16}/></button></div>}

        {!loading && isTxn && <div className="cart-workspace">
          <div className="cart-date-row"><div><b>Tanggal transaksi</b><small>Semua item dalam keranjang memakai tanggal ini.</small></div><input type="date" value={cartDate} onChange={e=>setCartDate(e.target.value)} aria-label="Tanggal transaksi"/></div>
          <div className="cart-entry">
            <label className="searchbox quick-add-search"><Search size={19}/><input
              value={quickAddQuery}
              onFocus={()=>setQuickAddOpen(true)}
              onChange={e=>{setQuickAddQuery(e.target.value);setQuickAddOpen(true);setCartItem(null);}}
             
              aria-label="Cari barang"
            />{quickAddQuery && <button type="button" className="quick-add-clear" onClick={()=>{setQuickAddQuery("");setQuickAddOpen(false);}} aria-label="Hapus pencarian"><X size={17}/></button>}</label>
            {quickAddOpen && quickAddQuery.trim() && <div className="quick-add-results">
              {quickAddResults.length ? quickAddResults.map(item=><button type="button" key={item.kode} onClick={()=>{setCartItem(item);setQuickAddQuery(item.nama);setQuickAddOpen(false);setCartQty("");}}>
                <span><b>{item.nama}</b><small>{item.kode} · Stok {fmt(calc.find(x=>x.kode===item.kode)?.sistem ?? 0)} {item.satuan||"PCS"}</small></span><Plus size={18}/>
              </button>) : <p>Barang tidak ditemukan.</p>}
            </div>}
            {cartItem && <div className="cart-qty-row"><div><b>{cartItem.nama}</b><small>{cartItem.kode} · {cartItem.satuan||"PCS"}</small></div><input type="number" min="0.01" step="any" inputMode="decimal" autoFocus value={cartQty} onChange={e=>setCartQty(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();addCartItem();}}}/><button type="button" className="primary cart-add-btn" onClick={addCartItem}><Plus size={17}/> Tambah</button></div>}
          </div>
          <div className="cart-panel">
            <div className="cart-panel-head"><div><h2>Keranjang input</h2><small>{cart.length} baris item · {dateLabel(cartDate)}</small></div><span className="cart-count">{cart.length}</span></div>
            {cart.length ? <><div className="cart-items">{cart.map((item,i)=><div className="cart-line" key={i}><div><b>{item.nama}</b><small>{item.kode} · {fmt(item.jumlah)} {item.satuan}</small></div><button type="button" onClick={()=>removeCartItem(i)} aria-label={"Hapus "+item.nama}><Trash2 size={17}/></button></div>)}</div><button type="button" className="primary cart-save-btn" disabled={saving} onClick={saveCart}>{saving?"Menyimpan...":"Simpan "+cart.length+" Item"}</button></> : <p className="cart-empty">Cari barang, isi qty, lalu tekan Enter untuk memasukkan ke keranjang.</p>}
          </div>
        </div>}
        {loading ? <Loading /> : page === "Dashboard" ?
          <Dashboard calc={calc} data={data} total={total} setPage={changePage}/> :
        isStockPage ?
          <section className="stock-page">
            <div className="summary-strip">
              <Summary label="Total item" value={fmt(calc.length)} />
              <Summary label="Total stok" value={fmt(calc.reduce((a,x)=>a+x.sistem,0))} />
              <Summary label="Nilai persediaan" value="—" note="Harga belum tersedia" />
              <Summary label="Stok habis" value={fmt(calc.filter(x=>x.sistem<=0).length)} />
            </div>
            <div className="list-toolbar">
              <label className="searchbox"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)}/></label>
              <div className="filter-chips">{["Semua","Menipis","Habis","Minus"].map(x=><button key={x} className={filter===x?"chip active":"chip"} onClick={()=>setFilter(x)}>{x}</button>)}</div>
            </div>
            <div className="stock-cards">{shownStock.length ? shownStock.map(item=><StockCard key={item.kode} item={item} expanded={expanded===item.kode} onToggle={()=>setExpanded(expanded===item.kode?"":item.kode)} onEdit={()=>openEditBarang(item)} onDelete={()=>deleteBarang(item)}/>) : <EmptyState text="Barang tidak ditemukan."/>}</div>
            <div className="desktop-table"><table><thead><tr><th>Kode</th><th>Nama Barang</th><th>Stok Sistem</th><th>Min. Stok</th><th>Aksi</th></tr></thead><tbody>{shownStock.length?shownStock.map(item=><tr key={item.kode}><td>{item.kode}</td><td>{item.nama}</td><td>{fmt(item.sistem)} {item.satuan||"PCS"}</td><td>{fmt(item.stok_minimum)}</td><td><div className="barang-actions"><button type="button" className="secondary" onClick={()=>openEditBarang(item)}>Edit</button><button type="button" className="danger-action" onClick={()=>deleteBarang(item)}>Hapus</button></div></td></tr>):<tr><td colSpan="5" className="empty">Barang tidak ditemukan.</td></tr>}</tbody></table></div>
          </section> :
        page === "Rekap Selisih" ?
          <div className="reconcile-page">
            <div className="reconcile-heading">
              <div><span className="section-kicker">ANALISIS PERSEDIAAN</span><h2>Rekap Selisih Harian</h2><p>Bandingkan stok sistem dengan hasil opname pada tanggal yang dipilih.</p></div>
              <div className="reconcile-date"><CalendarDays size={18}/><input aria-label="Tanggal rekap" type="date" value={reconcileDate} onChange={e=>setReconcileDate(e.target.value)}/></div>
            </div>
            <div className="reconcile-stats">
              <Summary label="Barang diperiksa" value={fmt(reconcileRows.length)}/>
              <Summary label="Selisih minus" value={fmt(reconcileRows.filter(x=>x.selisih!==null&&x.selisih<0).length)}/>
              <Summary label="Surplus" value={fmt(reconcileRows.filter(x=>x.selisih!==null&&x.selisih>0).length)}/>
              <Summary label="Belum opname" value={fmt(reconcileRows.filter(x=>x.fisik===null).length)}/>
            </div>
            <div className="reconcile-toolbar">
              <label className="searchbox"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)}/></label>
              <div className="filter-chips">{["Semua","Minus","Surplus","Sesuai","Belum Opname"].map(x=><button key={x} className={reconcileFilter===x?"chip active":"chip"} onClick={()=>setReconcileFilter(x)}>{x}</button>)}</div>
            </div>
            <div className="reconcile-table-wrap">
              <div className="reconcile-table-scroll"><table className="reconcile-table"><thead><tr><th>Barang</th><th>Stok Sistem</th><th>Stok Fisik</th><th>Selisih</th><th>Status</th></tr></thead>
                <tbody>{filteredReconcileRows.length?filteredReconcileRows.map(item=><tr key={item.kode}>
                  <td><div className="reconcile-item"><b>{item.nama}</b><small>{item.kode}{item.kategori?" · "+item.kategori:""}</small></div></td>
                  <td>{fmt(item.sistem)} <small>{item.satuan||"PCS"}</small></td>
                  <td>{item.fisik===null?<span className="muted">Belum diinput</span>:<>{fmt(item.fisik)} <small>{item.satuan||"PCS"}</small></>}</td>
                  <td>{item.selisih===null?<span className="muted">—</span>:<strong className={item.selisih<0?"negative":item.selisih>0?"positive":"neutral"}>{item.selisih>0?"+":""}{fmt(item.selisih)}</strong>}</td>
                  <td><span className={"reconcile-status "+(item.selisih===null?"pending":item.selisih<0?"minus":item.selisih>0?"surplus":"match")}>{item.selisih===null?"Belum opname":item.selisih<0?"Minus":item.selisih>0?"Surplus":"Sesuai"}</span></td>
                </tr>):<tr><td colSpan="5" className="empty">Tidak ada barang sesuai pencarian atau filter.</td></tr>}</tbody>
              </table></div>
              <div className="reconcile-mobile">{filteredReconcileRows.map(item=><article className="reconcile-mobile-card" key={item.kode}>
                <div className="reconcile-mobile-top"><div><b>{item.nama}</b><small>{item.kode}</small></div><span className={"reconcile-status "+(item.selisih===null?"pending":item.selisih<0?"minus":item.selisih>0?"surplus":"match")}>{item.selisih===null?"Belum opname":item.selisih<0?"Minus":item.selisih>0?"Surplus":"Sesuai"}</span></div>
                <div className="reconcile-mobile-values"><div><small>Stok sistem</small><b>{fmt(item.sistem)}</b></div><div><small>Stok fisik</small><b>{item.fisik===null?"—":fmt(item.fisik)}</b></div><div><small>Selisih</small><b className={item.selisih===null?"":item.selisih<0?"negative":item.selisih>0?"positive":"neutral"}>{item.selisih===null?"—":(item.selisih>0?"+":"")+fmt(item.selisih)}</b></div></div>
              </article>)}</div>
            </div>
            <div className="reconcile-footnote">Stok sistem dihitung sampai dengan {reconcileDate}. Selisih = stok fisik − stok sistem. Data opname hari lain tidak dicampur.</div>
          </div> :
        page === "Laporan" ?
          <div className="report-page">
            <div className="panel">
              <div className="panel-heading"><div><h2>Filter & Export Laporan</h2><p>{reportRows.length} baris sesuai filter</p></div><button className="primary export-btn" onClick={exportReport}><FileSpreadsheet size={17}/> Export Excel (.xlsx)</button></div>
              <div className="report-filter-grid">
                <label className="field"><span>Dari tanggal</span><input type="date" value={reportFrom} onChange={e=>setReportFrom(e.target.value)}/></label>
                <label className="field"><span>Sampai tanggal</span><input type="date" value={reportTo} onChange={e=>setReportTo(e.target.value)}/></label>
                <label className="field"><span>Jenis laporan</span><select value={reportType} onChange={e=>setReportType(e.target.value)}>{["Semua","Barang Masuk","Penjualan","Opname","Selisih","Barang Reject","Stok Awal"].map(x=><option key={x}>{x}</option>)}</select></label>
                <label className="field"><span>Cari barang / kode / catatan</span><input value={reportQuery} onChange={e=>setReportQuery(e.target.value)}/></label>
              </div>
              <div className="report-table-wrap"><table className="reconcile-table"><thead><tr><th>Tanggal</th><th>Jenis</th><th>Kode</th><th>Nama</th><th>Jumlah / Selisih</th><th>Satuan</th><th>Stok Sistem</th><th>Stok Fisik</th></tr></thead><tbody>{reportRows.length?reportRows.map((r,i)=><tr key={r.id||i}><td>{r.tanggal}</td><td>{r.jenis}</td><td>{r.kode}</td><td>{r.nama}</td><td>{fmt(r.jumlah)}</td><td>{r.satuan||"PCS"}</td><td>{r.stok_sistem===undefined?"—":fmt(r.stok_sistem)}</td><td>{r.stok_fisik===undefined?"—":fmt(r.stok_fisik)}</td></tr>):<tr><td colSpan="8" className="empty">Tidak ada data sesuai filter.</td></tr>}</tbody></table></div>
            </div>
            <div className="grid-two"><div className="panel"><h2>Ringkasan transaksi</h2>{[["Barang Masuk",total("Barang_Masuk")],["Penjualan",total("Penjualan")],["Barang Reject",total("Barang_Reject")],["Stok Opname",(data.Stok_Opname||[]).length]].map(([k,v])=><div className="report-row" key={k}><span>{k}</span><b>{fmt(v)}</b></div>)}</div><div className="panel"><h2>Catatan perhitungan</h2><p className="muted">Stok Sistem = Stok Awal + Barang Masuk − Penjualan − Barang Reject.</p><p className="muted">Selisih = Stok Fisik − Stok Sistem. Selisih tidak mengubah stok sistem secara otomatis.</p></div></div></div> :
        isHistory ?
          <div className="panel"><div className="panel-heading"><div><h2>Riwayat transaksi</h2><p>{historyRows.length} aktivitas sesuai filter</p></div><label className="searchbox compact"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)}/></label></div><div className="filter-chips history-filters">{["Semua","Barang Masuk","Penjualan","Opname","Selisih","Barang Reject"].map(x=><button key={x} className={historyType===x?"chip active":"chip"} onClick={()=>setHistoryType(x)}>{x}</button>)}</div>
            {Object.entries(historyGroups).sort((a,b)=>b[0].localeCompare(a[0])).map(([date,entries])=><div className="history-group" key={date}><h3><CalendarDays size={16}/>{dateLabel(date)}</h3>{entries.map((r,i)=><div className="history-row" key={r.id||i}><div className="history-mark"/><div className="history-copy"><b>{r.nama}</b><small>{r.kode} · {r.jenis?.replaceAll("_"," ") || "Transaksi"} · {r.catatan || "Tanpa catatan"}</small></div><strong className={["Penjualan","Barang_Reject"].includes(r.jenis)?"negative":"positive"}>{["Penjualan","Barang_Reject"].includes(r.jenis)?"−":"+"}{fmt(r.jumlah)}</strong></div>)}</div>)}
            {!historyRows.length && <EmptyState text="Belum ada riwayat transaksi untuk filter ini."/>}
          </div> :
          <div className="panel">
            <div className="panel-heading"><div><h2>{page}</h2><p>{isTxn ? sortedTransactionGroups.length+" kelompok tanggal · "+rows.length+" item tersimpan" : rows.length+" catatan tersimpan"}</p></div><label className="searchbox compact"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)}/></label></div>
            {isTxn ? <div className="date-transaction-groups">{sortedTransactionGroups.length ? sortedTransactionGroups.map(([date,entries])=>{
              const opened=expandedTransactionDate===date;
              const quantity=entries.reduce((sum,row)=>sum+Number(row.jumlah||0),0);
              return <section className={"date-transaction-card"+(opened?" opened":"")} key={date}>
                <button type="button" className="date-transaction-trigger" onClick={()=>setExpandedTransactionDate(opened?"":date)} aria-expanded={opened}>
                  <span className="date-transaction-icon"><CalendarDays size={19}/></span>
                  <span className="date-transaction-title"><b>{dateLabel(date)}</b><small>{entries.length} item · Total jumlah {fmt(quantity)}</small></span>
                  <span className="date-transaction-chevron">{opened?<ChevronUp size={19}/>:<ChevronDown size={19}/>}</span>
                </button>
                {opened && <div className="date-transaction-details">{entries.map((row,index)=><div className="date-transaction-item" key={row.id||row.kode+"-"+index}>
                  <span><b>{row.nama||row.kode}</b><small>{row.kode}{row.kategori?" · "+row.kategori:""}{row.catatan?" · "+row.catatan:""}</small></span>
                  <strong>{fmt(row.jumlah)} <small>{row.satuan||"unit"}</small></strong>
                </div>)}</div>}
              </section>;
            }) : <EmptyState text="Belum ada transaksi pada pencarian ini."/>}</div>
            : <><div className="mobile-records">{rows.length ? rows.map((r,i)=><RecordCard key={r.id||r.kode||i} row={r} page={page}/>) : <EmptyState text="Belum ada data. Gunakan pencarian di atas untuk menambahkan transaksi."/>}</div>
            <div className="desktop-table"><Table rows={rows} columns={page==="Data Barang"?["kode","nama","kategori","satuan","stok_minimum"]:["tanggal","kode","nama","jumlah","kategori","catatan"]} labels={{kode:"Kode",nama:"Nama Barang",tanggal:"Tanggal",jumlah:"Jumlah",kategori:"Kategori / Alasan",satuan:"Satuan",stok_minimum:"Min. Stok",catatan:"Catatan"}}/></div></>}
          </div>}

        <footer>DEBOX PLEBURAN <span>·</span> Inventory Management</footer>
      </section>
    </main>

    {isStockPage ? <button className="fab" onClick={()=>openForm("Master_Barang")} aria-label="Tambah barang"><Plus size={24}/></button> : null}

    <nav className="bottom-nav" aria-label="Navigasi utama">
      {primaryMenus.map(label=>{const Icon=menus.find(x=>x[0]===label)?.[1];return <button key={label} className={page===label?"bottom-item active":"bottom-item"} onClick={()=>changePage(label)}><Icon size={20}/><span>{label==="Stok Fisik / Opname"?"Opname":label==="Data Barang"?"Barang":label==="Barang Masuk"?"Masuk":label}</span></button>;})}
      <button className={moreMenus.includes(page)||moreOpen?"bottom-item active":"bottom-item"} onClick={()=>setMoreOpen(!moreOpen)}><MoreHorizontal size={20}/><span>Lainnya</span></button>
    </nav>
    {moreOpen && <><button className="more-scrim" aria-label="Tutup menu" onClick={()=>setMoreOpen(false)}/><div className="more-sheet">{moreMenus.map(label=>{const Icon=menus.find(x=>x[0]===label)?.[1];return <button key={label} onClick={()=>changePage(label)}><Icon size={19}/>{label}</button>;})}</div></>}

    {modal && <div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&setModal(false)}>
      <form className="modal" onSubmit={save}>
        <div className="modal-head"><div><small>{form.mode==="edit"?"EDIT DATA":"INPUT DATA"}</small><h2>{form.sheet==="Master_Barang"?(form.mode==="edit"?"Edit Barang":"Tambah Barang"):"Tambah "+page}</h2></div><button type="button" className="icon-btn" onClick={()=>setModal(false)} aria-label="Tutup"><X/></button></div>
        {form.sheet==="Master_Barang" ? <>
          <Field label="Kode Barang" value={form.kode} onChange={v=>setForm({...form,kode:v})} required disabled={form.mode==="edit"}/>
          <Field label="Nama Barang" value={form.nama} onChange={v=>setForm({...form,nama:v})} required/>
          <Field label="Kategori" value={form.kategori} onChange={v=>setForm({...form,kategori:v})}/>
          <Field label="Satuan" value={form.satuan||"PCS"} onChange={v=>setForm({...form,satuan:v})}/>
          <Field label="Stok Minimum" type="number" value={form.stok_minimum||0} onChange={v=>setForm({...form,stok_minimum:v})}/>
        </> : <>
          <Field label="Tanggal" type="date" value={form.tanggal} onChange={v=>setForm({...form,tanggal:v})} required/>
          <ItemPicker items={calc} value={form.kode} onChange={item=>setForm({...form,kode:item.kode,nama:item.nama})}/>
          {selectedItem && <div className="current-stock"><span>Stok sistem saat ini</span><b>{fmt(selectedItem.sistem)} {selectedItem.satuan||""}</b></div>}
          <div className="qty-field"><span>{form.sheet==="Stok_Opname"?"Stok fisik":"Jumlah"}</span><Stepper value={form.jumlah} onChange={v=>setForm({...form,jumlah:v})}/></div>
          {form.sheet==="Stok_Opname" && delta!==null && <div className={"delta-box "+(delta>0?"positive-bg":delta<0?"negative-bg":"neutral-bg")}><small>Selisih real-time</small><strong>{delta>0?"+":""}{fmt(delta)}</strong><span>{delta>0?"Lebih dari stok sistem":delta<0?"Kurang dari stok sistem":"Sesuai stok sistem"}</span></div>}
          <Field label={form.sheet==="Barang_Reject"?"Kategori / Alasan Reject":"Kategori (opsional)"} value={form.kategori} onChange={v=>setForm({...form,kategori:v})}/>
          <Field label="Catatan" value={form.catatan} onChange={v=>setForm({...form,catatan:v})}/>
        </>}
        <div className="modal-actions"><button type="button" className="secondary" onClick={()=>setModal(false)}>Batal</button><button className="primary" disabled={saving}>{saving?"Menyimpan...":form.mode==="edit"?"Simpan Perubahan":"Simpan Data"}</button></div>
      </form>
    </div>}
    {toast && <div className="toast" role="status"><Check size={17}/>{toast}</div>}
  </div>;
}

function Login(){
 const [email,setEmail]=useState(""),[password,setPassword]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState("");
 const submit=async e=>{e.preventDefault();setBusy(true);setError("");try{await signIn(email.trim(),password);}catch(err){setError(err.message||"Login gagal.");}finally{setBusy(false);}};
 return <div className="auth-screen"><form className="auth-card" onSubmit={submit}><div className="brandmark auth-mark">D</div><div className="eyebrow">PT DEBOX PLEBURAN</div><h1>Inventory Login</h1><p>Masuk untuk mengelola data persediaan.</p>{error&&<div className="alert">{error}</div>}<label className="field"><span>Email</span><input type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} required /></label><label className="field"><span>Password</span><input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required /></label><button className="primary auth-submit" disabled={busy}>{busy?"Memproses...":"Masuk"}</button><small>Akun dibuat administrator melalui Supabase Dashboard.</small></form></div>;
}
function Field({label,value,onChange,type="text",required=false,disabled=false}){return <label className="field"><span>{label}</span><input disabled={disabled} type={type} inputMode={type==="number"?"decimal":undefined} value={value??""} onChange={e=>onChange(e.target.value)} required={required} min={type==="number"?"0":undefined} step={type==="number"?"any":undefined}/></label>}
function Stepper({value,onChange}){const n=Number(value||0);return <div className="stepper"><button type="button" onClick={()=>onChange(String(Math.max(0,n-1)))} aria-label="Kurangi jumlah">−</button><input type="number" inputMode="decimal" min="0" step="any" value={value} onChange={e=>onChange(e.target.value)} required/><button type="button" onClick={()=>onChange(String(n+1))} aria-label="Tambah jumlah">+</button></div>}
function ItemPicker({items,value,onChange}){const [q,setQ]=useState("");const [open,setOpen]=useState(false);const selected=items.find(x=>x.kode===value);const results=items.filter(x=>(x.nama+" "+x.kode).toLowerCase().includes(q.toLowerCase())).slice(0,8);return <div className="picker"><label className="field"><span>Pilih barang</span><div className="picker-input"><Search size={17}/><input value={open?q:(selected?selected.nama+" · "+selected.kode:q)} onFocus={()=>{setOpen(true);setQ("");}} onChange={e=>setQ(e.target.value)} required={!value}/>{selected&&<button type="button" onClick={()=>{onChange({kode:"",nama:""});setQ("");setOpen(false);}} aria-label="Hapus pilihan"><X size={16}/></button>}</div></label>{open&&<div className="picker-results">{results.map(x=><button type="button" key={x.kode} onClick={()=>{onChange(x);setQ("");setOpen(false);}}><b>{x.nama}</b><small>{x.kode} · Stok {fmt(x.sistem)}</small></button>)}{!results.length&&<p>Barang tidak ditemukan.</p>}<button type="button" className="picker-close" onClick={()=>setOpen(false)}>Tutup daftar</button></div>}</div>}
function Summary({label,value,note}){return <div className="summary-card"><small>{label}</small><b>{value}</b>{note&&<span>{note}</span>}</div>}
function StockCard({item,expanded,onToggle,showPhysical=false,onEdit,onDelete}){const [label,kind]=statusOf(item);return <article className="stock-card"><button className="stock-card-main" onClick={onToggle} aria-expanded={expanded}><span className="stock-copy"><b>{item.nama}</b><small>{item.kode}{item.kategori?" · "+item.kategori:""}</small></span><span className="stock-value"><strong>{fmt(item.sistem)}</strong><small>{item.satuan||"unit"}</small></span><span className={"badge "+kind}>{label}</span><span className="expand-icon">{expanded?<ChevronUp size={18}/>:<ChevronDown size={18}/>}</span></button>{expanded&&<div className="stock-details"><Detail label="Stok awal" value={item.awal}/><Detail label="Masuk" value={item.masuk}/><Detail label="Terjual" value={item.jual}/><Detail label="Reject" value={item.reject}/><Detail label="Stok fisik" value={item.fisik??"—"}/><Detail label="Selisih" value={item.selisih??"—"}/>{onEdit&&<div className="barang-actions stock-action-row"><button type="button" className="secondary" onClick={onEdit}>Edit barang</button><button type="button" className="danger-action" onClick={onDelete}>Hapus barang</button></div>}</div>}</article>}
function Detail({label,value,tone=""}){return <div className="detail"><small>{label}</small><b className={tone}>{typeof value==="number"?fmt(value):value}</b></div>}
function RecordCard({row,page}){return <article className="record-card"><div><b>{row.nama||row.kode}</b><small>{row.kode}{row.kategori?" · "+row.kategori:""}</small></div><strong>{row.jumlah!==undefined?fmt(row.jumlah):row.stok_minimum!==undefined?"Min. "+fmt(row.stok_minimum):"—"}</strong><small className="record-date">{row.tanggal||row.satuan||""}</small></article>}
function Table({rows,columns,labels={}}){return <div className="table-wrap"><table><thead><tr>{columns.map(c=><th key={c}>{labels[c]||c}</th>)}</tr></thead><tbody>{rows.length?rows.map((r,i)=><tr key={r.id||r.kode||i}>{columns.map(c=><td key={c}>{c==="selisih"&&r[c]!=null?<span className={Number(r[c])<0?"negative":Number(r[c])>0?"positive":"neutral"}>{Number(r[c])>0?"+":""}{fmt(r[c])}</span>:r[c]??"—"}</td>)}</tr>):<tr><td className="empty" colSpan={columns.length}>Belum ada data.</td></tr>}</tbody></table></div>}
function EmptyState({text}){return <div className="empty-state"><Package size={25}/><b>{text}</b></div>}
function Loading(){return <div className="loading-list">{[1,2,3,4].map(x=><div className="skeleton" key={x}/>)}</div>}
function Dashboard({calc,data,total,setPage}){const low=calc.filter(x=>x.sistem<=Number(x.stok_minimum||0));return <><div className="dashboard-summary"><Summary label="Jenis barang" value={fmt(calc.length)}/><Summary label="Barang masuk" value={fmt(total("Barang_Masuk"))}/><Summary label="Penjualan" value={fmt(total("Penjualan"))}/><Summary label="Barang reject" value={fmt(total("Barang_Reject"))}/></div><div className="dashboard-grid"><div className="panel"><div className="panel-heading"><div><h2>Ringkasan stok</h2><p>Posisi stok sistem saat ini</p></div><button className="text-link" onClick={()=>setPage("Data Barang")}>Lihat semua <ArrowUpRight size={16}/></button></div><div className="mobile-records">{calc.slice(0,7).map(item=><StockCard key={item.kode} item={item} expanded={false} onToggle={()=>setPage("Data Barang")}/>)}</div><div className="desktop-table"><Table rows={calc.slice(0,7)} columns={["kode","nama","sistem","stok_minimum"]} labels={{kode:"Kode",nama:"Nama Barang",sistem:"Stok Sistem",stok_minimum:"Min. Stok"}}/></div></div><div className="panel side-panel"><div className="panel-heading"><div><h2>Perlu perhatian</h2><p>Stok menyentuh batas minimum</p></div><span className="count">{low.length}</span></div>{low.length?low.slice(0,6).map(i=><div className="low-item" key={i.kode}><div><b>{i.nama}</b><small>{i.kode}</small></div><strong>{fmt(i.sistem)}</strong></div>):<div className="all-good">Semua stok di atas batas minimum.</div>}<button className="wide-btn" onClick={()=>setPage("Data Barang")}>Kelola data barang</button></div></div></>}
createRoot(document.getElementById("root")).render(<App/>);
