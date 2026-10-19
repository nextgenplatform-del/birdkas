import test from 'node:test';import assert from 'node:assert/strict';import {age,esc,photoUrl} from '../js/model.js';
test('usia terus berjalan tanpa menulis ke Sheets',()=>{const b={tanggal_beli:'2026-01-01',usia_beli:2,satuan_usia:'Minggu'};assert.equal(age(b,new Date('2026-01-08T00:00:00')),'3 minggu');assert.equal(age({...b,usia_beli:0},new Date('2026-01-03T00:00:00')),'2 hari')});
test('data Sheet di-escape dan foto menolak javascript URL',()=>{assert.equal(esc('<script>'), '&lt;script&gt;');assert.equal(photoUrl('javascript:alert(1)'), '');assert.equal(photoUrl('https://drive.google.com/test'),'https://drive.google.com/test')});

import {parseMoney,formatMoney,moneyCaret,imageFile} from '../js/model.js';
test('Rupiah round-trip integer, zero, grouped paste and limit without changing value',()=>{for(const n of [0,1,10,999,1000,1500000,1000000000000])assert.equal(parseMoney(formatMoney(n)),n);assert.equal(formatMoney('1500000'),'1.500.000');assert.equal(parseMoney('Rp 1.500.000'),1500000);assert.equal(formatMoney(''),'');});
test('Rupiah rejects decimal, exponent, negative, malformed groups and excessive values',()=>{for(const v of ['1,5','1.5','1.000,50','-100','1e6','abc','1..000','1000000000001','Infinity'])assert.throws(()=>parseMoney(v),undefined,v)});
test('caret maps digits across inserted separators',()=>{assert.equal(moneyCaret('1.500.000',1),1);assert.equal(moneyCaret('1.500.000',4),5);assert.equal(moneyCaret('1.500.000',7),9);assert.equal(moneyCaret('1.000',0),0)});
test('foto encoding async: caches same File, bounds dimensions, releases decoded bitmap',async()=>{
 const previous={bitmap:globalThis.createImageBitmap,document:globalThis.document,reader:globalThis.FileReader};let decoded=0,closed=0,encodes=0;const sizes=[];let canvas;
 try{
 globalThis.createImageBitmap=async()=>{decoded++;return {width:4032,height:3024,close(){closed++}}};
 globalThis.document={createElement(){canvas={width:0,height:0,getContext:()=>({fillRect(){},drawImage(){}}),toBlob(cb,type,q){encodes++;sizes.push([this.width,this.height,q]);queueMicrotask(()=>cb(new Blob(['jpeg'],{type})))}};return canvas}};
 globalThis.FileReader=class{readAsDataURL(){this.result='data:image/jpeg;base64,anBlZw==';queueMicrotask(()=>this.onload())}};
 const file={name:'camera.jpg',type:'image/jpeg',size:4000000};const a=imageFile(file),b=imageFile(file);assert.equal(a,b);const r=await a;assert.equal(r.data,'anBlZw==');assert.equal(decoded,1);assert.equal(encodes,1);assert.deepEqual(sizes[0],[1440,1080,.82]);assert.equal(closed,1);assert.equal(canvas.width,0);await imageFile({...file});assert.equal(decoded,2);
 }finally{globalThis.createImageBitmap=previous.bitmap;globalThis.document=previous.document;globalThis.FileReader=previous.reader}
});
