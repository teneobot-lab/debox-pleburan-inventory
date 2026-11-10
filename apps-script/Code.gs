const SHEETS = {
  Master_Barang: ["kode","nama","kategori","satuan","stok_minimum","created_at"],
  Stok_Awal: ["tanggal","kode","nama","jumlah","catatan","waktu"],
  Barang_Masuk: ["tanggal","kode","nama","jumlah","kategori","catatan","waktu"],
  Penjualan: ["tanggal","kode","nama","jumlah","kategori","catatan","waktu"],
  Barang_Reject: ["tanggal","kode","nama","jumlah","kategori","catatan","waktu"],
  Stok_Opname: ["tanggal","kode","nama","jumlah","kategori","catatan","waktu"],
  Riwayat_Aktivitas: ["tanggal","kode","nama","jumlah","kategori","catatan","waktu","jenis"]
};
function doGet(e) {
  const callback = (e.parameter.callback || "").replace(/[^a-zA-Z0-9_$]/g, "");
  try {
    const action = e.parameter.action || "init";
    const payload = e.parameter.payload ? JSON.parse(e.parameter.payload) : {};
    const result = route_(action, payload);
    return output_({ok:true,...result}, callback);
  } catch (err) {
    return output_({ok:false,error:String(err.message || err)}, callback);
  }
}
function output_(obj, callback) {
  const json = JSON.stringify(obj);
  return callback ? ContentService.createTextOutput(callback + "(" + json + ");").setMimeType(ContentService.MimeType.JAVASCRIPT)
    : ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}
function route_(action, p) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (action === "init") {
    ensureSheets_(ss);
    const data = {};
    Object.keys(SHEETS).forEach(name => data[name] = readSheet_(ss.getSheetByName(name)));
    return {data};
  }
  if (action === "create") {
    const name = p.sheet;
    if (!SHEETS[name]) throw new Error("Sheet tidak diizinkan.");
    ensureSheets_(ss);
    const row = p.row || {};
    if (name === "Master_Barang" && !row.kode) throw new Error("Kode barang wajib diisi.");
    if (name === "Master_Barang" && readSheet_(ss.getSheetByName(name)).some(x => String(x.kode) === String(row.kode))) throw new Error("Kode barang sudah digunakan.");
    const sh = ss.getSheetByName(name);
    const values = SHEETS[name].map(k => row[k] == null ? "" : row[k]);
    sh.appendRow(values);
    const log = ss.getSheetByName("Riwayat_Aktivitas");
    if (name !== "Riwayat_Aktivitas" && name !== "Master_Barang") {
      log.appendRow([row.tanggal||"",row.kode||"",row.nama||"",row.jumlah||"",row.kategori||"",row.catatan||"",row.waktu||new Date().toISOString(),name]);
    }
    return {message:"Data tersimpan."};
  }
  throw new Error("Action tidak dikenal.");
}
function ensureSheets_(ss) {
  Object.keys(SHEETS).forEach(name => {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    if (sh.getLastRow() === 0) {
      sh.appendRow(SHEETS[name]);
      sh.setFrozenRows(1);
      sh.getRange(1,1,1,SHEETS[name].length).setFontWeight("bold").setBackground("#d9eaf7");
    }
  });
}
function readSheet_(sh) {
  const values = sh.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0].map(String);
  return values.slice(1).filter(row => row.some(v => v !== "")).map(row => {
    const item = {};
    headers.forEach((h,i) => item[h] = row[i] instanceof Date ? Utilities.formatDate(row[i], Session.getScriptTimeZone(), "yyyy-MM-dd") : row[i]);
    return item;
  });
}
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureSheets_(ss);
  Logger.log("Database siap: " + ss.getUrl());
}