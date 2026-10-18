import vm from 'node:vm';import{readFileSync}from'node:fs';import{createHash}from'node:crypto';
export const plain=x=>JSON.parse(JSON.stringify(x));
export function environment(){
 const state={uuid:0,active:'owner@example.test',effective:'owner@example.test',busy:false,locked:false,mutations:[],fail:null,files:new Map(),properties:{BIRDKAS_OWNER_EMAIL:'owner@example.test',BIRDKAS_SPREADSHEET_ID:'test-spreadsheet',BIRDKAS_DRIVE_FOLDER_ID:'restricted-folder'},timezone:'Asia/Jakarta',flushes:0};
 class Sheet{
  constructor(name,grid=[]){this.name=name;this.grid=plain(grid);this.formulas=[];this.frozen=0;this.formats=[]}
  getLastRow(){let last=0;this.grid.forEach((r,i)=>{if(r.some(v=>v!==''&&v!==undefined))last=i+1});return last}
  getLastColumn(){return Math.max(0,...this.grid.map(r=>r.reduce((last,v,i)=>v!==''&&v!==undefined?i+1:last,0)))}
  setFrozenRows(n){this.frozen=n}
  getRange(row,col,height=1,width=1){const sheet=this;return{
   getValues(){return Array.from({length:height},(_,y)=>Array.from({length:width},(_,x)=>sheet.grid[row-1+y]?.[col-1+x]??''))},
   getFormulas(){return Array.from({length:height},(_,y)=>Array.from({length:width},(_,x)=>sheet.formulas[row-1+y]?.[col-1+x]??''))},
   setNumberFormats(formats){sheet.formats.push({row,col,formats:plain(formats)});return this},
   setValues(values){const event={table:sheet.name,row,values:plain(values)};const failure=state.fail?.(event);if(failure==='before')throw Error('Injected Sheets write failure');for(let y=0;y<height;y++){sheet.grid[row-1+y]||=[];for(let x=0;x<width;x++)sheet.grid[row-1+y][col-1+x]=values[y][x]}state.mutations.push(event);if(failure==='after')throw Error('Injected ambiguous write failure');return this}
  }}
 }
 const sheets=new Map();const spreadsheet={getId:()=> 'test-spreadsheet',getSpreadsheetTimeZone:()=>state.timezone,getSheetByName:n=>sheets.get(n)||null,insertSheet(n){if(sheets.has(n))throw Error('Duplicate sheet');const s=new Sheet(n);sheets.set(n,s);state.mutations.push({table:n,created:true});return s}};
 const lock={tryLock(){if(state.busy||state.locked)return false;state.locked=true;return true},releaseLock(){state.locked=false}};
 const privateAccess='PRIVATE';
 const folder={getId:()=> 'restricted-folder',isTrashed:()=>false,getSharingAccess:()=>privateAccess};
 const context=vm.createContext({console,Date,Map,Set,JSON,Number,Object,Array,String,Error,RegExp,Math,
  SpreadsheetApp:{getActiveSpreadsheet:()=>spreadsheet,flush(){state.flushes++}},
  LockService:{getScriptLock:()=>lock},
  PropertiesService:{getScriptProperties:()=>({getProperty:k=>state.properties[k]||null})},
  Session:{getActiveUser:()=>({getEmail:()=>state.active}),getEffectiveUser:()=>({getEmail:()=>state.effective})},
  Utilities:{getUuid:()=>`00000000-0000-4000-8000-${String(++state.uuid).padStart(12,'0')}`,formatDate:()=> '2026-10-18',DigestAlgorithm:{SHA_256:'sha256'},Charset:{UTF_8:'utf8'},computeDigest:(algorithm,text)=>Array.from(createHash('sha256').update(text).digest())},
  DriveApp:{Access:{PRIVATE:privateAccess},getFolderById(id){if(id!=='restricted-folder')throw Error('Unknown folder');return folder},getFileById(id){if(!state.files.has(id))throw Error('Unknown file');return state.files.get(id)}}
 });
 for(const file of ['Schema.gs','Core.gs','SheetsRepository.gs','Code.gs'])vm.runInContext(readFileSync(new URL('../../backend/'+file,import.meta.url),'utf8'),context,{filename:file});
 function call(name,arg){return plain(context[name](arg))}
 function request(id,payload){return {version:1,requestId:id,payload}}
 function addFile(id='drive-proof-00001',options={}){const file={getId:()=>id,getName:()=> 'receipt.png',getMimeType:()=> 'image/png',getSize:()=>100,isTrashed:()=>false,getSharingAccess:()=>options.access||'PRIVATE',getParents(){let done=false;return {hasNext:()=>!done,next(){done=true;return {getId:()=>options.folder||'restricted-folder'}}}}};state.files.set(id,file);return {storage:'drive',driveFileId:id}}
 function rows(name){const sheet=sheets.get(name);if(!sheet||sheet.getLastRow()<2)return [];return sheet.grid.slice(1,sheet.getLastRow()).map(r=>Object.fromEntries(sheet.grid[0].map((h,i)=>[h,r[i]??''])))}
 function seedCapital(amount=10000000,account='cash',id='capital-seed-001'){return call('createCapitalTransaction',request(id,{date:'2026-10-01',kind:'in',amount,account}))}
 function purchase(individuals=[{type:'Kenari',cost:500000}],amount=500000,id='purchase-test-001'){return call('createPurchase',request(id,{date:'2026-10-02',party:'Supplier Test',amount,method:'Tunai',account:'cash',individuals}))}
 return {state,call,request,addFile,rows,sheets,Sheet,context,seedCapital,purchase,setup:()=>call('setupDatabase')};
}
