const endpoint = import.meta.env.VITE_APPS_SCRIPT_URL || "";
export function api(action, payload = {}) {
  if (!endpoint) return Promise.reject(new Error("URL Google Apps Script belum diatur. Isi VITE_APPS_SCRIPT_URL di Vercel."));
  return new Promise((resolve, reject) => {
    const callback = "__debox_cb_" + Math.random().toString(36).slice(2);
    const script = document.createElement("script");
    const timer = setTimeout(() => finish(new Error("Koneksi ke Google Sheets timeout.")), 20000);
    function finish(error, data) {
      clearTimeout(timer); delete window[callback]; script.remove();
      error ? reject(error) : resolve(data);
    }
    window[callback] = data => data && data.ok ? finish(null, data) : finish(new Error(data?.error || "Permintaan gagal."));
    const params = new URLSearchParams({ action, callback, payload: JSON.stringify(payload) });
    script.onerror = () => finish(new Error("Tidak dapat menghubungi Google Apps Script."));
    script.src = endpoint + (endpoint.includes("?") ? "&" : "?") + params.toString();
    document.body.appendChild(script);
  });
}