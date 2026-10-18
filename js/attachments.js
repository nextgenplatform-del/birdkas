// Binary files stay in IndexedDB; transaction records contain portable metadata only.
const DATABASE='birdkas-demo-attachments',STORE='files';
export const MAX_RECEIPT_BYTES=10*1024*1024;
export async function validateReceipt(file){
  if(!file||!file.size)throw Error('Bukti transfer wajib dilampirkan.');
  if(file.size>MAX_RECEIPT_BYTES)throw Error('Bukti transfer maksimal 10 MB.');
  const bytes=new Uint8Array(await file.slice(0,64).arrayBuffer());
  const text=String.fromCharCode(...bytes);
  const jpeg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
  const png=bytes.slice(0,8).join(',')==='137,80,78,71,13,10,26,10';
  const heic=text.slice(4,8)==='ftyp'&&/heic|heix|hevc|hevx|mif1|msf1/.test(text.slice(8));
  if(!jpeg&&!png&&!heic)throw Error('Gunakan gambar JPG, PNG, atau HEIC yang valid.');
  return jpeg?'image/jpeg':png?'image/png':'image/heic';
}
function openDatabase(){return new Promise((resolve,reject)=>{
  if(!globalThis.indexedDB){reject(Error('Penyimpanan foto lokal tidak tersedia di browser ini.'));return}
  const request=indexedDB.open(DATABASE,1);
  request.onupgradeneeded=()=>request.result.createObjectStore(STORE,{keyPath:'id'});
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>reject(Error('Penyimpanan bukti transfer tidak dapat dibuka.'));
  request.onblocked=()=>reject(Error('Tutup tab BirdKas lain lalu coba lagi.'));
})}
async function operation(mode,run){const database=await openDatabase();try{return await new Promise((resolve,reject)=>{
  const tx=database.transaction(STORE,mode);let value;
  const request=run(tx.objectStore(STORE));
  request.onsuccess=()=>{value=request.result};
  tx.oncomplete=()=>resolve(value);
  tx.onerror=tx.onabort=()=>reject(Error('Bukti transfer gagal disimpan atau dibaca. Periksa ruang penyimpanan browser.'));
})}finally{database.close()}}
export async function saveReceipt(file){const mimeType=await validateReceipt(file);const id='ATT-'+crypto.randomUUID();const ref={id,storage:'indexeddb',name:file.name,mimeType,size:file.size,driveFileId:null,verificationStatus:'UNVERIFIED'};await operation('readwrite',s=>s.add({id,blob:file,metadata:ref}));return ref}
export const getReceipt=id=>operation('readonly',s=>s.get(id));
export const deleteReceipt=id=>operation('readwrite',s=>s.delete(id));
export const clearReceipts=()=>operation('readwrite',s=>s.clear());
