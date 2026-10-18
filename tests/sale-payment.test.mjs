import test from 'node:test';import assert from 'node:assert/strict';import{readFile}from'node:fs/promises';
globalThis.localStorage={getItem:()=>null,setItem(){},removeItem(){}};
const store=await import('../js/store.js');
const{saleAccount,saveSale}=await import('../js/sale-payment.js');
const{validateReceipt}=await import('../js/attachments.js');
const info={date:'2026-10-18',party:'Tes',method:'Transfer',account:'cash'};
const items=[{id:'BRD-001',price:2300000}];
test('cash destination is derived; cash strips proof and does not require IndexedDB',async()=>{
 store.reset();assert.equal(saleAccount('Tunai'),'cash');assert.equal(saleAccount('Transfer'),'bank');
 await saveSale({...info,method:'Tunai',account:'bank',transferProof:{id:'stale'}},items,null);
 assert.equal(store.db.sales.at(-1).account,'cash');assert.equal(store.db.sales.at(-1).transferProof,null);
 assert.deepEqual(store.metrics().cash,{cash:3500000,bank:5450000});assert.equal(store.metrics().profit,450000);
});
test('transfer without proof and storage failure never change stock or balances',async()=>{
 store.reset();const before=structuredClone(store.db);
 await assert.rejects(saveSale(info,items,null),/wajib/);
 assert.throws(()=>store.sell(info,items),/wajib/);
 const png=new File([await readFile(new URL('../assets/icon-192.png',import.meta.url))],'proof.png',{type:'image/png'});
 await assert.rejects(saveSale(info,items,png),/tidak tersedia/);
 assert.deepEqual(store.db,before);
});
test('persisted transfer metadata routes ledger to bank, retains HPP and stock guard',()=>{
 store.reset();const proof={id:'ATT-test',storage:'indexeddb',name:'proof.png',mimeType:'image/png',size:100,driveFileId:null,verificationStatus:'UNVERIFIED'};
 store.sell({...info,transferProof:proof},items);
 assert.equal(store.db.sales.at(-1).account,'bank');assert.deepEqual(store.db.sales.at(-1).transferProof,proof);
 assert.deepEqual(store.metrics().cash,{cash:1200000,bank:7750000});assert.equal(store.metrics().profit,450000);
 assert.equal(store.db.birds.find(b=>b.id==='BRD-001').status,'TERJUAL');assert.throws(()=>store.sell({...info,transferProof:proof},items),/tidak tersedia/);
 assert.ok(!JSON.stringify(store.db.sales.at(-1)).includes('base64'));
});
test('receipt formats and file size are checked before storage',async()=>{
 const png=new File([await readFile(new URL('../assets/icon-192.png',import.meta.url))],'proof.png');
 assert.equal(await validateReceipt(png),'image/png');
 assert.equal(await validateReceipt(new File([new Uint8Array([255,216,255,224])],'proof.jpg')),'image/jpeg');
 assert.equal(await validateReceipt(new File([new Uint8Array([0,0,0,24]),'ftypheic0000'],'proof.heic')),'image/heic');
 await assert.rejects(validateReceipt(new File(['not a photo'],'fake.png',{type:'image/png'})),/valid/);
 await assert.rejects(validateReceipt(new File([],'empty.png')),/wajib/);
 await assert.rejects(validateReceipt(new File([new Uint8Array(10*1024*1024+1)],'large.jpg')),/10 MB/);
});
