export const rupiah=n=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(n)||0);
export function today(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
export function age(b,now=new Date()){const days=Math.max(0,Math.floor((now-new Date(b.tanggal_beli+'T00:00:00'))/86400000))+Number(b.usia_beli)*({Hari:1,Minggu:7,Bulan:30.4375,Tahun:365.25}[b.satuan_usia]||1);if(days<7)return Math.floor(days)+' hari';if(days<30)return Math.floor(days/7)+' minggu';if(days<365)return Math.floor(days/30.4375)+' bulan';return Math.floor(days/365.25)+' tahun '+Math.floor(days%365.25/30.4375)+' bulan'}
export const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function photoUrl(url){try{const u=new URL(url);return u.protocol==='https:'?u.href:''}catch{return ''}}
const imageCache=new WeakMap();
const blobData=blob=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(Error('Foto tidak dapat dibaca. Pilih ulang foto.'));reader.readAsDataURL(blob)});
async function decodePhoto(file){
 if(typeof createImageBitmap==='function'){try{return await createImageBitmap(file)}catch(_){}}
 return new Promise((resolve,reject)=>{const url=URL.createObjectURL(file),img=new Image();img.onload=()=>{URL.revokeObjectURL(url);resolve(img)};img.onerror=()=>{URL.revokeObjectURL(url);reject(Error('Foto tidak dapat dibuka. Gunakan JPG, PNG, atau WebP.'))};img.src=url});
}
async function compressPhoto(file){
 if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('Gunakan foto JPG, PNG, atau WebP. Untuk HEIC, pilih format paling kompatibel di iPhone.');
 if(file.size>15*1024*1024)throw Error('Foto maksimal 15 MB.');
 const bitmap=await decodePhoto(file),width=bitmap.width,height=bitmap.height;
 if(!width||!height){bitmap.close?.();throw Error('Ukuran foto tidak dapat dibaca.');}
 const c=document.createElement('canvas');
 const encode=(limit,quality)=>new Promise((resolve,reject)=>{const scale=Math.min(1,limit/Math.max(width,height));c.width=Math.max(1,Math.round(width*scale));c.height=Math.max(1,Math.round(height*scale));const ctx=c.getContext('2d');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(bitmap,0,0,c.width,c.height);c.toBlob(blob=>blob?resolve(blob):reject(Error('Foto tidak dapat diproses. Pilih ulang foto.')),'image/jpeg',quality)});
 try{
  let blob=file.type==='image/jpeg'&&file.size<=200*1024&&Math.max(width,height)<=1440?file:await encode(1440,.82);
  if(blob.size>900*1024)blob=await encode(1280,.76);
  return {name:file.name.replace(/\.[^.]+$/,'.jpg'),mime:'image/jpeg',data:await blobData(blob)};
 }finally{bitmap.close?.();c.width=0;c.height=0;}
}
// Reuse precisely the same selected File; a different selection gets its own compression.
export function imageFile(file){if(!file)return Promise.resolve(null);if(!imageCache.has(file)){const task=compressPhoto(file).catch(err=>{imageCache.delete(file);throw err});imageCache.set(file,task)}return imageCache.get(file)}

// Rupiah is an integer: reject ambiguous decimal/exponent input instead of changing its value.
export function parseMoney(value){const text=String(value??'').trim().replace(/^Rp\.?\s*/i,'');if(!/^(?:\d+|\d{1,3}(?:\.\d{3})+)$/.test(text))throw Error('Masukkan nominal Rupiah bulat, tanpa koma atau desimal.');const n=Number(text.replaceAll('.',''));if(!Number.isSafeInteger(n)||n>1e12)throw Error('Nominal maksimal 1.000.000.000.000.');return n}
export function formatMoney(value){if(value===''||value==null)return '';return String(parseMoney(value)).replace(/\B(?=(\d{3})+(?!\d))/g,'.')}
export function moneyCaret(formatted,digits){if(!digits)return 0;let count=0;for(let i=0;i<formatted.length;i++)if(/\d/.test(formatted[i])&&++count===digits)return i+1;return formatted.length}
