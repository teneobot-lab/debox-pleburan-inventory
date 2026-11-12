const OCR_LANG = "ind+eng";
const REVIEW_BELOW = 85;

export function normalizeOcrText(value = "") {
  return String(value).toLowerCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").replace(/[|]/g, " ")
    .replace(/[^\w\s.,/-]/g, " ").replace(/\s+/g, " ").trim();
}
function splitLines(text) {
  return String(text).split(/\r?\n|\r/).map(x=>x.replace(/[ \t]+/g," ").trim()).filter(x=>x.length>=2);
}
function editDistance(a,b) {
  if(a===b)return 0;
  const dp=Array.from({length:b.length+1},(_,i)=>i);
  for(let i=1;i<=a.length;i++){let prev=dp[0];dp[0]=i;for(let j=1;j<=b.length;j++){const old=dp[j];dp[j]=Math.min(dp[j]+1,dp[j-1]+1,prev+(a[i-1]===b[j-1]?0:1));prev=old;}}
  return dp[b.length];
}
function similarity(a,b){if(!a||!b)return 0;if(a===b)return 1;return 1-editDistance(a,b)/Math.max(a.length,b.length);}
function fixDigits(token){
  const map={O:"0",o:"0",D:"0",I:"1",l:"1","|":"1",S:"5",s:"5",B:"8",Z:"2",z:"2"};
  const digits=(token.match(/\d/g)||[]).length;
  if(!digits||digits/token.length<0.5)return token;
  return token.replace(/[OoDIl|SsBZz]/g,c=>map[c]??c);
}
export function parseNumber(raw){
  let s=fixDigits(String(raw).trim()).replace(/[^\d.,]/g,"");if(!s)return null;
  if(s.includes(".")&&s.includes(","))s=s.replace(/\./g,"").replace(",",".");
  else if(/^\d{1,3}(\.\d{3})+$/.test(s))s=s.replace(/\./g,"");
  else s=s.replace(",",".");
  const n=parseFloat(s);return Number.isFinite(n)?n:null;
}
const UNIT_MAP={porsi:"Porsi",kilogram:"Kilogram",kg:"Kilogram",gram:"Gram",gr:"Gram",liter:"Liter",ltr:"Liter",ml:"ML",pcs:"Pcs",pc:"Pcs",pack:"Pack",pck:"Pack",pak:"Pack",roll:"Roll",box:"Box",dus:"Dus",kardus:"Kardus",botol:"Botol",btl:"Botol",rim:"Rim",lembar:"Lembar",lusin:"Lusin",lsn:"Lusin",buah:"Buah"};
const UNIT_PATTERN=Object.keys(UNIT_MAP).sort((a,b)=>b.length-a.length).join("|");
const QTY_UNIT_RE=new RegExp("([0-9OoIl|SB][0-9OoIl|SB.,]*)\\s*("+UNIT_PATTERN+")\\b","gi");
export function extractQuantityAndUnit(body){
  const matches=[...String(body).matchAll(QTY_UNIT_RE)];
  for(let i=matches.length-1;i>=0;i--){
    const m=matches[i];if(!/\d/.test(fixDigits(m[1])))continue;
    const jumlah=parseNumber(m[1]);if(jumlah===null||jumlah<=0||jumlah>=1e6)continue;
    const rest=(body.slice(0,m.index)+" "+body.slice(m.index+m[0].length)).replace(/\s+\d{1,2}\s*$/,"").replace(/\s+/g," ").trim();
    return {jumlah,satuan:UNIT_MAP[m[2].toLowerCase()]||"",rest};
  }
  const tail=String(body).match(/^(.*\D)\s(\d{1,4}(?:[.,]\d+)?)\s*$/);
  if(tail){const jumlah=parseNumber(tail[2]);if(jumlah&&jumlah>0)return {jumlah,satuan:"",rest:tail[1].trim()};}
  return null;
}
export function extractQuantity(text){return extractQuantityAndUnit(text)?.jumlah??"";}
export function extractUnit(text){return extractQuantityAndUnit(text)?.satuan??"";}
function cleanLine(line){return line.replace(/\b(belum|sudah|ok)\b/gi," ").replace(/[✓✔√]/g," ").replace(/\s+[JVv/\\|]\s*$/g,"").replace(/\s+/g," ").trim();}
function stripRowNumber(line){const m=line.match(/^(\d{1,3})[\s.)\]]+(?=[A-Za-z])/);return m?{no:parseInt(m[1],10),body:line.slice(m[0].length).trim()}:{no:null,body:line};}
export function matchOcrItem(text,masterBarang=[]){
  const source=normalizeOcrText(text);if(!source)return null;
  const sourceWords=source.split(" ").filter(Boolean);let bestItem=null,bestScore=0;
  for(const item of masterBarang){
    const nama=normalizeOcrText(item.nama||item.name||"");
    const kode=normalizeOcrText(item.kode||item.code||"").replace(/\s/g,"");
    if(!nama&&!kode)continue;let score=0;
    if(kode.length>=3&&source.replace(/\s/g,"").includes(kode))score=1;
    else if(nama&&source===nama)score=1;
    else if(nama&&(source.includes(nama)||nama.includes(source)))score=.95;
    else if(nama){
      const words=nama.split(" ").filter(Boolean);let itemHit=0,sourceHit=0;
      for(const w of words)itemHit+=Math.max(0,...sourceWords.map(c=>{const v=similarity(c,w);return v>=.75?v:0;}));
      for(const c of sourceWords)sourceHit+=Math.max(0,...words.map(w=>{const v=similarity(c,w);return v>=.75?v:0;}));
      score=.7*(itemHit/words.length)+.3*(sourceHit/sourceWords.length);
    }
    if(score>bestScore){bestScore=score;bestItem=item;}
  }
  return bestScore<.62?null:{item:bestItem,score:Math.round(bestScore*100)};
}
export function parseOcrLines(text,masterBarang=[]){
  const results=[];
  for(const raw of splitLines(text)){
    const {no,body}=stripRowNumber(cleanLine(raw));const q=extractQuantityAndUnit(body);
    if(!q||q.rest.length<3)continue;
    const match=matchOcrItem(q.rest,masterBarang);
    results.push({no,originalText:raw,namaTerbaca:q.rest,item:match?.item||null,matchScore:match?.score||0,jumlah:q.jumlah,satuan:q.satuan,needsReview:!match||match.score<REVIEW_BELOW||!q.satuan,selected:Boolean(match)});
  }
  const byNo=new Map(),noNumber=[];
  for(const r of results){if(r.no===null){noNumber.push(r);continue;}const old=byNo.get(r.no);if(!old||r.matchScore>old.matchScore)byNo.set(r.no,r);}
  return [...byNo.values()].sort((a,b)=>a.no-b.no).concat(noNumber);
}
export function findMissingRowNumbers(rows){
  const nums=rows.map(r=>r.no).filter(n=>n!==null).sort((a,b)=>a-b),missing=[];
  for(let i=1;i<nums.length;i++)for(let n=nums[i-1]+1;n<nums[i];n++)missing.push(n);
  return missing;
}
async function loadToCanvas(file,targetLongSide,rotateDeg=0){
  if(!file||!file.type.startsWith("image/"))throw new Error("File harus berupa gambar.");
  const bitmap=await createImageBitmap(file,{imageOrientation:"from-image"});
  const scale=Math.min(2.2,targetLongSide/Math.max(bitmap.width,bitmap.height));
  const w=Math.round(bitmap.width*scale),h=Math.round(bitmap.height*scale),swap=rotateDeg===90||rotateDeg===270;
  const canvas=document.createElement("canvas");canvas.width=swap?h:w;canvas.height=swap?w:h;
  const ctx=canvas.getContext("2d",{willReadFrequently:true});ctx.fillStyle="#fff";ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.translate(canvas.width/2,canvas.height/2);ctx.rotate(rotateDeg*Math.PI/180);ctx.drawImage(bitmap,-w/2,-h/2,w,h);bitmap.close();return canvas;
}
function enhanceCanvas(canvas){
  const ctx=canvas.getContext("2d",{willReadFrequently:true}),{width,height}=canvas;
  const img=ctx.getImageData(0,0,width,height),d=img.data,gray=new Uint8ClampedArray(width*height),hist=new Array(256).fill(0);
  for(let i=0,p=0;i<d.length;i+=4,p++){const g=(.299*d[i]+.587*d[i+1]+.114*d[i+2])|0;gray[p]=g;hist[g]++;}
  const total=width*height;let lo=0,hi=255,acc=0;
  for(let i=0;i<256;i++){acc+=hist[i];if(acc>total*.01){lo=i;break;}}
  acc=0;for(let i=255;i>=0;i--){acc+=hist[i];if(acc>total*.01){hi=i;break;}}
  const range=Math.max(1,hi-lo);
  for(let i=0,p=0;i<d.length;i+=4,p++){const v=Math.min(255,Math.max(0,((gray[p]-lo)*255)/range));d[i]=d[i+1]=d[i+2]=v;d[i+3]=255;}
  ctx.putImageData(img,0,0);return canvas;
}
function canvasToBlob(canvas){return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error("Gagal memproses gambar.")),"image/png"));}
export async function preprocessOcrImage(file,{rotateDeg=0,targetLongSide=2400}={}){
  return canvasToBlob(enhanceCanvas(await loadToCanvas(file,targetLongSide,rotateDeg)));
}
function scoreOcrText(text){const rows=parseOcrLines(text,[]).length,header=/formulir|pengajuan|pesanan|produk|jumlah|unit/i.test(text)?2:0;return rows+header;}
async function pickBestRotation(worker,file,onProgress){
  let best={deg:0,score:-1};const candidates=[0,90,270,180];
  for(let i=0;i<candidates.length;i++){
    const deg=candidates[i];onProgress(5+i*4);
    const blob=await preprocessOcrImage(file,{rotateDeg:deg,targetLongSide:1200});
    const {data}=await worker.recognize(blob);const score=scoreOcrText(data.text||"");
    if(score>best.score)best={deg,score};if(score>=8)break;
  }
  return best;
}
export async function scanA4Document(file,masterBarang=[],onProgress=()=>{}){
  if(!window.Tesseract)throw new Error("Tesseract.js belum dimuat. Periksa script di index.html.");
  if(!file)throw new Error("Pilih foto terlebih dahulu.");
  let phase="detect";
  const worker=await window.Tesseract.createWorker(OCR_LANG,1,{logger(message){if(phase==="final"&&message.status==="recognizing text")onProgress(Math.round(25+message.progress*70));}});
  try{
    await worker.setParameters({tessedit_pageseg_mode:"6",preserve_interword_spaces:"1"});
    onProgress(5);const best=await pickBestRotation(worker,file,onProgress);
    if(best.score<3)throw new Error("Foto tidak terbaca. Coba foto ulang lebih terang, sejajar, dan tidak terpotong.");
    phase="final";onProgress(25);
    const processedImage=await preprocessOcrImage(file,{rotateDeg:best.deg,targetLongSide:2400});
    const result=await worker.recognize(processedImage),rawText=result.data.text||"",rows=parseOcrLines(rawText,masterBarang);
    onProgress(100);
    return {rawText,rows,missingNumbers:findMissingRowNumbers(rows),rotation:best.deg,confidence:result.data.confidence||0,processedImage};
  }finally{await worker.terminate();}
}
