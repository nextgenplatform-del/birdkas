import{saveReceipt,deleteReceipt,validateReceipt}from'./attachments.js';
import{sell}from'./store.js';
export const saleAccount=method=>method==='Tunai'?'cash':method==='Transfer'?'bank':null;
export function paymentFields(){return `<div class="form-grid"><label>Metode pembayaran<select name="method" id="sale-method"><option>Tunai</option><option>Transfer</option></select></label><div class="sale-account"><span>Akun kas tujuan</span><strong id="sale-account" aria-live="polite">Kas Tunai</strong></div></div><section id="transfer-proof" class="transfer-proof" hidden><h3>Bukti Transfer <span class="required-label">Wajib</span></h3><input id="proof-file" type="file" accept="image/jpeg,image/png,image/heic,image/heif,.jpg,.jpeg,.png,.heic,.heif" hidden aria-label="Bukti Transfer"><button class="secondary full" type="button" id="proof-upload">Upload Bukti Transfer</button><div id="proof-preview" hidden><img id="proof-image" alt="Preview bukti transfer"><p id="proof-name"></p><p id="proof-fallback" hidden>Preview HEIC tidak didukung browser ini. Foto tetap dapat dilampirkan; gunakan JPG/PNG jika ingin melihat preview.</p><div class="inline-actions"><button type="button" id="proof-replace">Ganti foto</button><button type="button" id="proof-remove">Hapus foto</button></div></div><p id="proof-error" role="status"></p><p class="local-note">JPG, PNG, HEIC · maksimal 10 MB · disimpan di perangkat ini. Lampiran bukan verifikasi penerimaan uang.</p></section>`}
export function setupPayment(form){
  const method=form.querySelector('#sale-method'),input=form.querySelector('#proof-file'),section=form.querySelector('#transfer-proof'),preview=form.querySelector('#proof-preview'),image=form.querySelector('#proof-image'),error=form.querySelector('#proof-error');
  let file=null,url=null,revision=0,destroyed=false,pending=false;
  function clear(){revision++;pending=false;file=null;input.value='';if(url)URL.revokeObjectURL(url);url=null;image.removeAttribute('src');image.hidden=false;preview.hidden=true;form.querySelector('#proof-upload').hidden=false;error.textContent='';form.querySelector('#proof-name').textContent='';form.querySelector('#proof-fallback').hidden=true}
  method.onchange=()=>{form.querySelector('#sale-account').textContent=method.value==='Transfer'?'Rekening Bank':'Kas Tunai';section.hidden=method.value!=='Transfer';if(section.hidden)clear()};
  form.querySelector('#proof-upload').onclick=form.querySelector('#proof-replace').onclick=()=>input.click();
  form.querySelector('#proof-remove').onclick=clear;
  image.onerror=()=>{image.hidden=true;form.querySelector('#proof-fallback').hidden=false};
  input.onchange=async()=>{const chosen=input.files[0];if(!chosen)return;const ticket=++revision;pending=true;error.textContent='Memeriksa gambar…';try{await validateReceipt(chosen);if(destroyed||ticket!==revision||method.value!=='Transfer')return;if(url)URL.revokeObjectURL(url);file=chosen;url=URL.createObjectURL(chosen);image.hidden=false;form.querySelector('#proof-fallback').hidden=true;image.src=url;preview.hidden=false;form.querySelector('#proof-upload').hidden=true;form.querySelector('#proof-name').textContent=chosen.name;error.textContent=''}catch(err){if(ticket===revision){clear();error.textContent=err.message}}finally{if(ticket===revision)pending=false}};
  return{getFile(){if(pending)throw Error('Tunggu pemeriksaan gambar selesai.');if(method.value==='Transfer'&&!file){error.textContent='Bukti transfer wajib dilampirkan.';form.querySelector('#proof-upload').focus();throw Error('Bukti transfer wajib dilampirkan.')}return method.value==='Transfer'?file:null},destroy(){destroyed=true;clear()}};
}
export async function saveSale(info,items,file){
  const account=saleAccount(info.method);if(!account)throw Error('Metode pembayaran tidak valid.');
  if(info.method==='Transfer'&&!file)throw Error('Bukti transfer wajib dilampirkan.');
  let attachment=null;
  try{if(info.method==='Transfer')attachment=await saveReceipt(file);sell({...info,account,transferProof:attachment},items)}
  catch(err){if(attachment)await deleteReceipt(attachment.id).catch(()=>{});throw err}
}
