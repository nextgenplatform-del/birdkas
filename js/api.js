export const ENDPOINT='https://script.google.com/macros/s/AKfycbydyX-_FCcQZSQx04HChwxw8J7qwlkEmyyutdvLEYCX8SJbna8-YQzSjh3kMmfaLl8e/exec';
// POST inside a frame: credentials never enter a URL, and success requires a matched response.
export function request(action,payload={},token='',requestId=crypto.randomUUID()){
 return new Promise((resolve,reject)=>{
  const frame=document.createElement('iframe');frame.name='bk_'+requestId.replaceAll('-','');frame.hidden=true;frame.title='Koneksi BirdKas';
  const form=document.createElement('form');form.method='POST';form.action=ENDPOINT;form.target=frame.name;form.hidden=true;
  const input=document.createElement('input');input.type='hidden';input.name='payload';input.value=JSON.stringify({action,payload,token,requestId,origin:location.origin});form.append(input);
  let timer;const cleanup=()=>{clearTimeout(timer);window.removeEventListener('message',receive);form.remove();frame.remove()};
  function receive(e){if(!(e.origin==='https://script.google.com'||/^https:\/\/[a-z0-9-]+\.googleusercontent\.com$/.test(e.origin)||e.origin==='https://script.googleusercontent.com'))return;const d=e.data;if(!d||d.channel!=='birdkas-v1'||d.requestId!==requestId||d.origin!==location.origin)return;cleanup();if(d.ok)resolve(d.data);else{const error=new Error(d.error?.message||'Permintaan gagal.');error.code=d.error?.code;reject(error)}}
  window.addEventListener('message',receive);document.body.append(frame,form);timer=setTimeout(()=>{cleanup();const e=new Error('Respons belum diterima. Status transaksi belum dapat dipastikan. Coba ulangi dengan tombol yang sama; ID transaksi tetap dipertahankan.');e.code='TIMEOUT';reject(e)},60000);form.submit();input.value='';
 });
}
