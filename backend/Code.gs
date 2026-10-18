/** Internal editor services only. Deliberately no doGet/doPost or web/API manifest. */
function birdKasOwner_() {
  var expected=PropertiesService.getScriptProperties().getProperty('BIRDKAS_OWNER_EMAIL');
  var active=Session.getActiveUser().getEmail();
  var effective=Session.getEffectiveUser().getEmail();
  if(!expected)BirdKasCore.fail('CONFIG_REQUIRED','Tetapkan BIRDKAS_OWNER_EMAIL pada Script Properties.');
  if(!active||!effective||active.toLowerCase()!==expected.toLowerCase()||effective.toLowerCase()!==expected.toLowerCase())BirdKasCore.fail('FORBIDDEN','Hanya Owner terkonfigurasi dengan identitas Google yang tersedia dapat menjalankan layanan.');
  return active.toLowerCase();
}
function birdKasService_(action,request,mode) {
  try {
    var actor=birdKasOwner_(); // Before any spreadsheet / Drive access.
    var core=BirdKasCore.create(BirdKasSheets.create());
    if(mode==='setup')return core.setup(request,actor);
    if(mode==='recover')return core.recover(request,actor);
    if(mode==='write')return core.execute(action,request,actor);
    return {ok:true,data:core.query(action,request||{})};
  } catch(e) {
    return {ok:false,requestId:request&&request.requestId||null,error:{code:e.code||'INTERNAL_ERROR',message:e.code?e.message:'Layanan gagal. Periksa konfigurasi dan jurnal; tidak ada klaim sukses.',retryable:!!e.retryable}};
  }
}
function setupDatabase(request){return birdKasService_('setupDatabase',request,'setup');}
function getDashboard(query){return birdKasService_('getDashboard',query);}
function getBirds(query){return birdKasService_('getBirds',query);}
function getBirdDetail(query){return birdKasService_('getBirdDetail',query);}
function createPurchase(request){return birdKasService_('createPurchase',request,'write');}
function createSale(request){return birdKasService_('createSale',request,'write');}
function createExpense(request){return birdKasService_('createExpense',request,'write');}
function createCapitalTransaction(request){return birdKasService_('createCapitalTransaction',request,'write');}
function transferCash(request){return birdKasService_('transferCash',request,'write');}
function adjustBirdStock(request){return birdKasService_('adjustBirdStock',request,'write');}
function getCashBalances(){return birdKasService_('getCashBalances');}
function getCashTransactions(query){return birdKasService_('getCashTransactions',query);}
function getProfitLoss(query){return birdKasService_('getProfitLoss',query);}
function getInventoryReport(){return birdKasService_('getInventoryReport');}
function getTransactionStatus(query){return birdKasService_('getTransactionStatus',query);}
// Recovery requestId is the ORIGINAL request ID; it resumes, never re-plans the command.
function recoverTransaction(request){return birdKasService_('recoverTransaction',request,'recover');}
