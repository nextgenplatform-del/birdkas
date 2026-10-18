/** Pure business engine. Infrastructure is injected; no frontend or live API. */
var BirdKasCore = (function () {
  'use strict';
  function fail(code,message,retryable) { var e=new Error(message);e.code=code;e.retryable=!!retryable;throw e; }
  function check(condition,code,message) { if(!condition)fail(code,message); }
  function stable(value) {
    if(Array.isArray(value))return '['+value.map(stable).join(',')+']';
    if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(function(k){return JSON.stringify(k)+':'+stable(value[k]);}).join(',')+'}';
    return JSON.stringify(value);
  }
  function equal(a,b){return stable(a)===stable(b);}
  function text(v,label,optional,max) {
    if(optional&&(v===undefined||v===null||v===''))return '';
    check(typeof v==='string'&&v.trim().length>0&&v.length<=(max||300),'INVALID_PAYLOAD',label+' tidak valid.');
    check(!/^[\s]*[=+@-]/.test(v),'INVALID_PAYLOAD',label+' tidak boleh diawali karakter formula.');
    return v.trim();
  }
  function positive(v,label){check(Number.isSafeInteger(v)&&v>0,'INVALID_PAYLOAD',label+' harus integer Rupiah positif.');return v;}
  function sum(rows,key){return rows.reduce(function(s,r){var n=s+r[key];check(Number.isSafeInteger(n),'AMOUNT_OVERFLOW','Nominal melampaui batas integer aman.');return n;},0);}
  function date(v){check(typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!isNaN(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v,'INVALID_DATE','Gunakan tanggal YYYY-MM-DD yang valid.');return v;}
  function account(v){check(v==='cash'||v==='bank','INVALID_ACCOUNT','Akun harus cash atau bank.');return v;}
  function method(v){check(v==='Tunai'||v==='Transfer','INVALID_METHOD','Metode harus Tunai atau Transfer.');return v;}
  function list(v,label){check(Array.isArray(v)&&v.length>0&&v.length<=50,'INVALID_PAYLOAD',label+' harus berisi 1–50 individu.');return v;}
  function uniqueIds(rows,key){var ids=rows.map(function(r){return r[key];});check(new Set(ids).size===ids.length,'DUPLICATE_BIRD','Burung tidak boleh dipilih ganda.');}
  function create(port) {
    function rows(t){return port.read(t);}
    function get(t,id){var matches=rows(t).filter(function(r){return r.id===id;});check(matches.length<=1,'DATA_CONFLICT','Primary ID ganda pada '+t);return matches[0];}
    function pending(){return rows('TRANSACTION_LOG').filter(function(r){return r.status!=='POSTED';});}
    function assertReady(){var p=pending();check(!p.length,'RECOVERY_REQUIRED','Operasi belum selesai: '+p.map(function(r){return r.id;}).join(', '));}
    function balances(){var result={cash:0,bank:0};rows('MUTASI_KAS').forEach(function(r){account(r.accountId);check(Number.isSafeInteger(r.signedAmount),'DATA_CONFLICT','Mutasi kas tidak valid.');result[r.accountId]+=r.signedAmount;check(Number.isSafeInteger(result[r.accountId]),'AMOUNT_OVERFLOW','Saldo melampaui integer aman.');});return result;}
    function enough(acc,amount){check(balances()[acc]>=amount,'INSUFFICIENT_FUNDS','Saldo '+acc+' tidak cukup.');}
    function newPlan(action,requestId,actor){return {operationId:'OP-'+port.uuid(),action:action,requestId:requestId,actor:actor,steps:[],result:null};}
    function insert(plan,table,row){plan.steps.push({table:table,id:row.id,before:null,after:row});return row;}
    function update(plan,table,before,after){plan.steps.push({table:table,id:before.id,before:before,after:after});}
    function entity(plan,table,name){name=text(name,table);var existing=rows(table).find(function(r){return r.name===name;});if(existing)return existing.id;var planned=plan.steps.find(function(s){return s.table===table&&s.after.name===name;});if(planned)return planned.id;return insert(plan,table,{id:table+'-'+port.uuid(),name:name,createdAt:port.now()}).id;}
    function entry(plan,dt,acc,value,source,id){insert(plan,'MUTASI_KAS',{id:'KAS-'+port.uuid(),operationId:plan.operationId,date:dt,accountId:acc,signedAmount:value,sourceType:source,sourceId:id});}
    function available(id){text(id,'birdId');var bird=get('BURUNG',id);check(bird&&bird.status==='TERSEDIA','STOCK_UNAVAILABLE','Burung '+id+' tidak tersedia.');return bird;}
    function photoRefs(refs){if(refs===undefined)return [];check(Array.isArray(refs)&&refs.length<=4,'INVALID_PAYLOAD','Maksimal empat referensi foto.');return refs.map(function(r){return port.verifyDriveReference(r);});}
    function build(action,p,plan) {
      var op=plan.operationId,id,dt,acc,total,items,party;
      if(action==='setupDatabase') {
        [{id:'cash',name:'Kas Tunai',openingBalance:0},{id:'bank',name:'Rekening Bank',openingBalance:0}].forEach(function(r){if(!get('AKUN_KAS',r.id))insert(plan,'AKUN_KAS',r);});
        [{id:'schemaVersion',value:'0.2'},{id:'timeZone',value:'Asia/Jakarta'}].forEach(function(r){if(!get('SETTINGS',r.id))insert(plan,'SETTINGS',r);});
        plan.result={schemaVersion:'0.2',tables:Object.keys(BirdKasSchema),accounts:['cash','bank']};return;
      }
      dt=date(p.date);
      if(action==='createPurchase') {
        id='BEL-'+port.uuid();method(p.method);acc=account(p.account);total=positive(p.amount,'Total pembelian');enough(acc,total);
        party=entity(plan,'SUPPLIER',p.party);items=list(p.individuals,'individuals');
        if(p.count!==undefined)check(p.count===items.length,'INVALID_PAYLOAD','Jumlah individu tidak sama dengan count.');
        var base=Math.floor(total/items.length),remaining=total%items.length;
        var manual=items.some(function(b){return b.cost!==undefined;});
        var birds=items.map(function(b,i){check(b&&typeof b==='object','INVALID_PAYLOAD','Individu tidak valid.');var cost=positive(manual?b.cost:base+(i===0?remaining:0),'HPP individu');var type=text(b.type,'Jenis burung');var typeId=entity(plan,'JENIS_BURUNG',type);return {id:'BRD-'+port.uuid(),operationId:op,typeId:typeId,type:type,ring:text(b.ring,'Ring',true),sex:b.sex===undefined?'Belum diketahui':text(b.sex,'Jenis kelamin'),age:text(b.age,'Usia',true),supplierId:party,purchaseId:id,date:dt,cost:cost,status:'TERSEDIA',notes:text(b.notes,'Ciri fisik',true,1000),photosJson:JSON.stringify(photoRefs(b.photos)),updatedOperationId:op};});
        birds.forEach(function(b){check(['Jantan','Betina','Belum diketahui'].indexOf(b.sex)>=0,'INVALID_PAYLOAD','Jenis kelamin tidak valid.');});
        check(sum(birds,'cost')===total,'HPP_MISMATCH','Total alokasi HPP harus sama dengan nilai pembelian.');
        insert(plan,'PEMBELIAN',{id:id,operationId:op,date:dt,supplierId:party,amount:total,method:p.method,accountId:acc,count:birds.length});
        birds.forEach(function(b){insert(plan,'BURUNG',b);insert(plan,'DETAIL_PEMBELIAN',{id:'DBEL-'+port.uuid(),operationId:op,purchaseId:id,birdId:b.id,allocatedCost:b.cost});});
        entry(plan,dt,acc,-total,action,id);plan.result={id:id,ids:birds.map(function(b){return b.id;}),amount:total,count:birds.length,account:acc};return;
      }
      if(action==='createSale') {
        id='JUL-'+port.uuid();method(p.method);acc=p.method==='Transfer'?'bank':'cash';
        var proof=p.method==='Transfer'?port.verifyDriveReference(p.transferProof):null;
        party=entity(plan,'PELANGGAN',p.party);items=list(p.items,'items');uniqueIds(items,'id');
        var sold=items.map(function(i){var b=available(i.id);return {bird:b,price:positive(i.price,'Harga jual')};});
        total=sum(sold,'price');
        insert(plan,'PENJUALAN',{id:id,operationId:op,date:dt,customerId:party,amount:total,method:p.method,accountId:acc,proofJson:JSON.stringify(proof),verificationStatus:'UNVERIFIED'});
        sold.forEach(function(i){insert(plan,'DETAIL_PENJUALAN',{id:'DJUL-'+port.uuid(),operationId:op,saleId:id,birdId:i.bird.id,price:i.price,costSnapshot:i.bird.cost});update(plan,'BURUNG',i.bird,Object.assign({},i.bird,{status:'TERJUAL',updatedOperationId:op}));});
        entry(plan,dt,acc,total,action,id);plan.result={id:id,amount:total,account:acc,items:sold.map(function(i){return {id:i.bird.id,price:i.price};}),hpp:sold.reduce(function(s,i){return s+i.bird.cost;},0),transferProof:proof};return;
      }
      if(action==='createExpense') {
        id='BYA-'+port.uuid();acc=account(p.account);total=positive(p.amount,'Biaya');enough(acc,total);
        var category=p.category==='Obat/Vitamin'?'Vitamin/Obat':p.category;
        check(['Pakan','Vitamin/Obat','Kandang/Perawatan','Transport','Lainnya'].indexOf(category)>=0,'INVALID_CATEGORY','Kategori biaya tidak valid.');
        insert(plan,'BIAYA_OPERASIONAL',{id:id,operationId:op,date:dt,category:category,amount:total,accountId:acc,notes:text(p.notes,'Keterangan',true,1000)});entry(plan,dt,acc,-total,action,id);plan.result={id:id,amount:total,account:acc};return;
      }
      if(action==='createCapitalTransaction') {
        id='MOD-'+port.uuid();acc=account(p.account);total=positive(p.amount,'Modal');check(p.kind==='in'||p.kind==='out','INVALID_PAYLOAD','Jenis modal harus in/out.');if(p.kind==='out')enough(acc,total);
        insert(plan,'MUTASI_MODAL',{id:id,operationId:op,date:dt,kind:p.kind,amount:total,accountId:acc,notes:text(p.notes,'Keterangan',true,1000)});entry(plan,dt,acc,total*(p.kind==='in'?1:-1),action,id);plan.result={id:id,amount:total,kind:p.kind,account:acc};return;
      }
      if(action==='transferCash') {
        id='TRF-'+port.uuid();var from=account(p.from),to=account(p.to);check(from!==to,'INVALID_ACCOUNT','Akun asal dan tujuan harus berbeda.');total=positive(p.amount,'Transfer');enough(from,total);
        entry(plan,dt,from,-total,action,id);entry(plan,dt,to,total,action,id);plan.result={id:id,amount:total,from:from,to:to};return;
      }
      if(action==='adjustBirdStock') {
        id='ADJ-'+port.uuid();var bird=available(p.birdId);check(p.reason==='Mati'||p.reason==='Hilang','INVALID_PAYLOAD','Alasan harus Mati atau Hilang.');
        insert(plan,'PENYESUAIAN_STOK',{id:id,operationId:op,date:dt,birdId:bird.id,reason:p.reason,costSnapshot:bird.cost});update(plan,'BURUNG',bird,Object.assign({},bird,{status:'MATI_HILANG',updatedOperationId:op}));plan.result={id:id,birdId:bird.id,cost:bird.cost,status:'MATI_HILANG'};return;
      }
      fail('UNKNOWN_ACTION','Layanan tidak dikenal.');
    }
    function integrity() {
      Object.keys(BirdKasSchema).forEach(function(t){var data=rows(t);check(new Set(data.map(function(r){return r.id;})).size===data.length,'DATA_CONFLICT','ID ganda pada '+t);});
      var birds=rows('BURUNG'),purchases=rows('PEMBELIAN'),purchaseItems=rows('DETAIL_PEMBELIAN'),sales=rows('PENJUALAN'),saleItems=rows('DETAIL_PENJUALAN'),adjustments=rows('PENYESUAIAN_STOK'),expenses=rows('BIAYA_OPERASIONAL'),capital=rows('MUTASI_MODAL'),ledger=rows('MUTASI_KAS');
      var recordedOps=new Set(rows('TRANSACTION_LOG').map(function(r){return r.operationId;}));
      ['BURUNG','PEMBELIAN','DETAIL_PEMBELIAN','PENJUALAN','DETAIL_PENJUALAN','BIAYA_OPERASIONAL','MUTASI_KAS','MUTASI_MODAL','PENYESUAIAN_STOK'].forEach(function(t){rows(t).forEach(function(r){check(recordedOps.has(r.operationId),'DATA_CONFLICT','Baris tanpa jurnal pada '+t);});});
      purchases.forEach(function(p){var its=purchaseItems.filter(function(i){return i.purchaseId===p.id;});positive(p.amount,'Pembelian');check(its.length===p.count&&sum(its,'allocatedCost')===p.amount,'DATA_CONFLICT','Detail pembelian tidak konsisten.');check(!!get('SUPPLIER',p.supplierId),'DATA_CONFLICT','Supplier tidak ditemukan.');});
      birds.forEach(function(b){positive(b.cost,'HPP');var type=get('JENIS_BURUNG',b.typeId);check(type&&type.name===b.type,'DATA_CONFLICT','Master jenis burung tidak cocok.');var purchase=get('PEMBELIAN',b.purchaseId);check(purchase&&purchase.supplierId===b.supplierId,'DATA_CONFLICT','Relasi supplier burung tidak cocok.');var pi=purchaseItems.filter(function(i){return i.birdId===b.id;});check(pi.length===1&&pi[0].purchaseId===b.purchaseId&&pi[0].allocatedCost===b.cost&&!!get('PEMBELIAN',b.purchaseId),'DATA_CONFLICT','Relasi HPP burung tidak konsisten.');var si=saleItems.filter(function(i){return i.birdId===b.id;}),ad=adjustments.filter(function(a){return a.birdId===b.id;});check(si.length<=1&&ad.length<=1&&!(si.length&&ad.length),'DATA_CONFLICT','Burung terjual atau disesuaikan ganda.');check(b.status===(si.length?'TERJUAL':ad.length?'MATI_HILANG':'TERSEDIA'),'DATA_CONFLICT','Status burung tidak konsisten.');});
      purchaseItems.forEach(function(i){check(!!get('BURUNG',i.birdId)&&!!get('PEMBELIAN',i.purchaseId),'DATA_CONFLICT','Detail pembelian tanpa induk.');});
      saleItems.forEach(function(i){var b=get('BURUNG',i.birdId);positive(i.price,'Harga jual');check(b&&i.costSnapshot===b.cost&&!!get('PENJUALAN',i.saleId),'DATA_CONFLICT','Snapshot HPP penjualan tidak konsisten.');});
      sales.forEach(function(s){method(s.method);var its=saleItems.filter(function(i){return i.saleId===s.id;});check(its.length>0&&sum(its,'price')===s.amount&&!!get('PELANGGAN',s.customerId),'DATA_CONFLICT','Detail penjualan tidak konsisten.');check(s.accountId===(s.method==='Transfer'?'bank':'cash'),'DATA_CONFLICT','Akun penjualan tidak sesuai metode.');if(s.method==='Transfer'){var proof=JSON.parse(s.proofJson);check(proof&&proof.storage==='drive'&&proof.driveFileId,'DATA_CONFLICT','Bukti transfer tidak ada.');}});
      adjustments.forEach(function(a){var b=get('BURUNG',a.birdId);check(b&&a.costSnapshot===b.cost,'DATA_CONFLICT','Snapshot penyesuaian tidak konsisten.');});
      var expected=[];function cashExpected(source,id,acc,amount){expected.push({sourceType:source,sourceId:id,accountId:acc,signedAmount:amount});}
      purchases.forEach(function(p){cashExpected('createPurchase',p.id,p.accountId,-p.amount);});sales.forEach(function(s){cashExpected('createSale',s.id,s.accountId,s.amount);});expenses.forEach(function(e){positive(e.amount,'Biaya');cashExpected('createExpense',e.id,e.accountId,-e.amount);});capital.forEach(function(c){positive(c.amount,'Modal');check(c.kind==='in'||c.kind==='out','DATA_CONFLICT','Jenis modal tidak valid.');cashExpected('createCapitalTransaction',c.id,c.accountId,c.amount*(c.kind==='in'?1:-1));});
      var transfers={};ledger.filter(function(e){return e.sourceType==='transferCash';}).forEach(function(e){(transfers[e.sourceId]||(transfers[e.sourceId]=[])).push(e);});
      Object.keys(transfers).forEach(function(id){var es=transfers[id];check(es.length===2&&es[0].accountId!==es[1].accountId&&sum(es,'signedAmount')===0&&es[0].signedAmount!==0,'DATA_CONFLICT','Transfer antar kas tidak seimbang.');es.forEach(function(e){cashExpected('transferCash',id,e.accountId,e.signedAmount);});});
      var actual=ledger.map(function(e){return {sourceType:e.sourceType,sourceId:e.sourceId,accountId:e.accountId,signedAmount:e.signedAmount};});
      var sort=function(a,b){return stable(a).localeCompare(stable(b));};check(equal(expected.sort(sort),actual.sort(sort)),'DATA_CONFLICT','Ledger kas tidak cocok dengan sumber transaksi.');
      var cash=balances();check(cash.cash>=0&&cash.bank>=0,'DATA_CONFLICT','Saldo kas negatif.');
      var profit=sum(sales,'amount')-sum(saleItems,'costSnapshot')-sum(expenses,'amount')-sum(adjustments,'costSnapshot');var inventory=sum(birds.filter(function(b){return b.status==='TERSEDIA';}),'cost');var equity=capital.reduce(function(s,c){return s+c.amount*(c.kind==='in'?1:-1);},0);
      check([cash.cash+cash.bank,profit,inventory,equity,equity+profit].every(Number.isSafeInteger),'AMOUNT_OVERFLOW','Total keuangan melampaui integer aman.');
      check(cash.cash+cash.bank+inventory===equity+profit,'DATA_CONFLICT','Persamaan kas + persediaan = modal neto + laba tidak seimbang.');return true;
    }
    function persistLog(log){port.put('TRANSACTION_LOG',log);port.flush();check(equal(get('TRANSACTION_LOG',log.id),log),'JOURNAL_WRITE_FAILED','Jurnal belum terkonfirmasi.');}
    function apply(log) {
      var plan=JSON.parse(log.planJson);
      try {
        persistLog(Object.assign({},log,{status:'APPLYING',updatedAt:port.now(),errorCode:''}));
        plan.steps.forEach(function(step){var current=get(step.table,step.id);if(equal(current,step.after))return;check(equal(current||null,step.before),'RECOVERY_CONFLICT','Baris '+step.table+'/'+step.id+' berubah di luar jurnal.');port.put(step.table,step.after);port.flush();});
        plan.steps.forEach(function(step){check(equal(get(step.table,step.id),step.after),'RECOVERY_CONFLICT','Efek bisnis belum lengkap.');});
        integrity();
        persistLog(Object.assign({},log,{status:'POSTED',resultJson:JSON.stringify(plan.result),updatedAt:port.now(),errorCode:''}));
        return {ok:true,requestId:log.id,operationId:log.operationId,data:plan.result};
      } catch(e) {
        try{persistLog(Object.assign({},log,{status:'RECOVERY_REQUIRED',updatedAt:port.now(),errorCode:e.code||'WRITE_INTERRUPTED'}));}catch(ignored){}
        fail(e.code==='RECOVERY_CONFLICT'?'RECOVERY_CONFLICT':'RECOVERY_REQUIRED','Operasi parsial '+log.id+'; gunakan recoverTransaction setelah memeriksa jurnal.',false);
      }
    }
    function validateRequest(request){check(request&&request.version===1&&request.payload&&typeof request.payload==='object'&&!Array.isArray(request.payload),'INVALID_REQUEST','Gunakan {version:1, requestId, payload}.');check(typeof request.requestId==='string'&&/^[A-Za-z0-9_-]{8,100}$/.test(request.requestId),'INVALID_REQUEST','requestId unik 8–100 karakter wajib.');check(JSON.stringify(request).length<=40000,'REQUEST_TOO_LARGE','Request terlalu besar untuk jurnal.');}
    function executeWithin(action,request,actor){
      validateRequest(request);port.preflight(action==='setupDatabase');
      var hash=port.hash(stable({action:action,payload:request.payload})),old=get('TRANSACTION_LOG',request.requestId);
      if(old){check(old.action===action&&old.payloadHash===hash,'IDEMPOTENCY_CONFLICT','requestId sama dengan isi berbeda.');if(old.status==='POSTED'){assertReady();integrity();return {ok:true,requestId:old.id,operationId:old.operationId,replayed:true,data:JSON.parse(old.resultJson)};}fail('RECOVERY_REQUIRED','Request sudah ada tetapi belum selesai.');}
      assertReady();integrity();var plan=newPlan(action,request.requestId,actor);build(action,request.payload,plan);
      insert(plan,'AUDIT_LOG',{id:'AUD-'+plan.operationId,operationId:plan.operationId,requestId:request.requestId,actor:actor,action:action,timestamp:port.now(),beforeJson:JSON.stringify(plan.steps.filter(function(s){return s.before;}).map(function(s){return {table:s.table,row:s.before};})),afterJson:JSON.stringify(plan.result)});
      var encoded=JSON.stringify(plan);check(encoded.length<=40000,'REQUEST_TOO_LARGE','Rencana transaksi terlalu besar; pecah pembelian menjadi beberapa transaksi.');
      var log={id:request.requestId,operationId:plan.operationId,action:action,payloadHash:hash,status:'PREPARED',planJson:encoded,resultJson:'',createdAt:port.now(),updatedAt:port.now(),errorCode:''};
      // Once PREPARED is durable, all retry/recovery uses this exact plan and IDs.
      persistLog(log);return apply(log);
    }
    function setup(request,actor){return port.withLock(function(){port.preflight(true);port.ensureSchema();return executeWithin('setupDatabase',request||{version:1,requestId:'setup-database-v02',payload:{}},actor);});}
    function execute(action,request,actor){return port.withLock(function(){return executeWithin(action,request,actor);});}
    function recover(request,actor){return port.withLock(function(){check(request&&typeof request.requestId==='string','INVALID_REQUEST','requestId operasi asli wajib.');port.preflight(true);var log=get('TRANSACTION_LOG',request.requestId);check(log,'NOT_FOUND','Request tidak ditemukan.');check(pending().every(function(p){return p.id===log.id;}),'RECOVERY_CONFLICT','Ada operasi parsial lain; periksa jurnal.');check(JSON.parse(log.planJson).actor===actor,'FORBIDDEN','Owner jurnal berbeda; periksa konfigurasi sebelum pemulihan.');if(log.status==='POSTED'){integrity();return {ok:true,requestId:log.id,operationId:log.operationId,replayed:true,data:JSON.parse(log.resultJson)};}return apply(log);});}
    function period(p){if(p.month!==undefined)check(/^\d{4}-(0[1-9]|1[0-2])$/.test(p.month),'INVALID_DATE','month harus YYYY-MM.');return p.month||port.today().slice(0,7);}
    function profitLoss(month){function inMonth(r){return r.date.slice(0,7)===month;}var sales=rows('PENJUALAN').filter(inMonth),ids=new Set(sales.map(function(s){return s.id;})),revenue=sum(sales,'amount'),cogs=sum(rows('DETAIL_PENJUALAN').filter(function(i){return ids.has(i.saleId);}),'costSnapshot'),expenses=sum(rows('BIAYA_OPERASIONAL').filter(inMonth),'amount'),loss=sum(rows('PENYESUAIAN_STOK').filter(inMonth),'costSnapshot');return {month:month,revenue:revenue,cogs:cogs,grossProfit:revenue-cogs,expenses:expenses,loss:loss,profit:revenue-cogs-expenses-loss};}
    function birdDTO(b){var supplier=get('SUPPLIER',b.supplierId),photos=JSON.parse(b.photosJson);return {id:b.id,typeId:b.typeId,type:b.type,ring:b.ring,sex:b.sex,age:b.age,supplier:supplier?supplier.name:'',supplierId:b.supplierId,date:b.date,cost:b.cost,status:b.status,notes:b.notes,photos:photos,photo:photos[0]||null};}
    function query(action,p) {return port.withLock(function(){p=p||{};port.preflight(action==='getTransactionStatus');
      if(action==='getTransactionStatus'){var log=get('TRANSACTION_LOG',text(p.requestId,'requestId'));check(log,'NOT_FOUND','Request tidak ditemukan.');return {requestId:log.id,operationId:log.operationId,status:log.status,errorCode:log.errorCode};}
      assertReady();integrity();
      if(action==='getCashBalances'){var cash=balances();return {cash:cash.cash,bank:cash.bank,totalCash:cash.cash+cash.bank};}
      if(action==='getCashTransactions'){if(p.account!==undefined)account(p.account);return rows('MUTASI_KAS').filter(function(r){return !p.account||r.accountId===p.account;}).sort(function(a,b){return b.date.localeCompare(a.date);}).map(function(r){return Object.assign({},r,{account:r.accountId,signed:r.signedAmount,amount:Math.abs(r.signedAmount)});});}
      if(action==='getProfitLoss')return profitLoss(period(p));
      if(action==='getInventoryReport'){var active=rows('BURUNG').filter(function(b){return b.status==='TERSEDIA';});return {count:active.length,inventory:sum(active,'cost'),birds:active.map(birdDTO)};}
      if(action==='getDashboard'){var m=profitLoss(period(p)),cash=balances(),active=rows('BURUNG').filter(function(b){return b.status==='TERSEDIA';});return Object.assign({},m,{cash:cash,totalCash:cash.cash+cash.bank,activeCount:active.length,inventory:sum(active,'cost'),today:port.today(),salesToday:sum(rows('PENJUALAN').filter(function(s){return s.date===port.today();}),'amount'),expensesToday:sum(rows('BIAYA_OPERASIONAL').filter(function(e){return e.date===port.today();}),'amount')});}
      if(action==='getBirds'){if(p.status!==undefined)check(['TERSEDIA','TERJUAL','MATI_HILANG'].indexOf(p.status)>=0,'INVALID_PAYLOAD','Status tidak valid.');if(p.search!==undefined)check(typeof p.search==='string'&&p.search.length<=300,'INVALID_PAYLOAD','Pencarian tidak valid.');var search=(p.search||'').toLowerCase();return rows('BURUNG').filter(function(b){return (!p.status||b.status===p.status)&&(b.id+' '+b.type+' '+b.ring).toLowerCase().indexOf(search)>=0;}).map(birdDTO);}
      if(action==='getBirdDetail'){var b=get('BURUNG',text(p.birdId,'birdId'));check(b,'NOT_FOUND','Burung tidak ditemukan.');return Object.assign(birdDTO(b),{activities:[{kind:'purchase',date:b.date,purchaseId:b.purchaseId,amount:b.cost}].concat(rows('DETAIL_PENJUALAN').filter(function(i){return i.birdId===b.id;}).map(function(i){return {kind:'sale',saleId:i.saleId,date:get('PENJUALAN',i.saleId).date,amount:i.price,cost:i.costSnapshot};})).concat(rows('PENYESUAIAN_STOK').filter(function(i){return i.birdId===b.id;}).map(function(i){return {kind:'adjustment',date:i.date,reason:i.reason,cost:i.costSnapshot};}))});}
      fail('UNKNOWN_ACTION','Layanan tidak dikenal.');
    });}
    return {setup:setup,execute:execute,recover:recover,query:query};
  }
  return {create:create,fail:fail,stable:stable,equal:equal};
}());
