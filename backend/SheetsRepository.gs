/** Google services adapter. Only called by owner-guarded entry points. */
var BirdKasSheets = (function () {
  'use strict';
  function create() {
    var fail=BirdKasCore.fail;
    var properties=PropertiesService.getScriptProperties();
    var expectedId=properties.getProperty('BIRDKAS_SPREADSHEET_ID');
    var spreadsheet=SpreadsheetApp.getActiveSpreadsheet();
    if(!expectedId||!spreadsheet||spreadsheet.getId()!==expectedId)fail('CONFIG_REQUIRED','Tetapkan BIRDKAS_SPREADSHEET_ID untuk spreadsheet terikat yang benar.');
    // No table data is cached across invocations or returned during partial writes.
    function read(table) {
      var sheet=spreadsheet.getSheetByName(table);
      if(!sheet)fail('SCHEMA_NOT_READY','Sheet '+table+' belum tersedia.');
      if(sheet.getLastRow()<=1)return [];
      var columns=BirdKasSchema[table];
      return sheet.getRange(2,1,sheet.getLastRow()-1,columns.length).getValues().map(function(values){var row={};columns.forEach(function(key,i){row[key]=values[i];});return row;});
    }
    function checkMasters(allowMissing) {
      var required={AKUN_KAS:[{id:'cash',name:'Kas Tunai',openingBalance:0},{id:'bank',name:'Rekening Bank',openingBalance:0}],SETTINGS:[{id:'schemaVersion',value:'0.2'},{id:'timeZone',value:'Asia/Jakarta'}]};
      Object.keys(required).forEach(function(table){
        if(!spreadsheet.getSheetByName(table)||spreadsheet.getSheetByName(table).getLastRow()===0){if(!allowMissing)fail('SCHEMA_NOT_READY','Master '+table+' belum tersedia.');return;}
        var data=read(table),ids=data.map(function(r){return r.id;});
        if(new Set(ids).size!==ids.length)fail('SCHEMA_CONFLICT','Primary ID master ganda pada '+table);
        if(table==='AKUN_KAS'&&data.some(function(r){return r.id!=='cash'&&r.id!=='bank';}))fail('SCHEMA_CONFLICT','Hanya dua akun kas didukung pada V0.2.');
        required[table].forEach(function(expected){var current=data.find(function(r){return r.id===expected.id;});if(current&&!BirdKasCore.equal(current,expected))fail('SCHEMA_CONFLICT','Konfigurasi '+table+'/'+expected.id+' berbeda; tidak ditimpa.');if(!current&&!allowMissing)fail('SCHEMA_NOT_READY','Master '+expected.id+' belum tersedia.');});
      });
    }
    function preflight(allowMissing) {
      if(spreadsheet.getSpreadsheetTimeZone()!=='Asia/Jakarta')fail('TIMEZONE_CONFLICT','Zona waktu spreadsheet harus Asia/Jakarta; ubah manual setelah review.');
      // Inspect ALL existing tables first. A conflict means no automatic edits at all.
      Object.keys(BirdKasSchema).forEach(function(table){
        var sheet=spreadsheet.getSheetByName(table),expected=BirdKasSchema[table];
        if(!sheet||sheet.getLastRow()===0){if(!allowMissing)fail('SCHEMA_NOT_READY','Jalankan setupDatabase: '+table);return;}
        if(sheet.getLastColumn()!==expected.length)fail('SCHEMA_CONFLICT','Jumlah kolom '+table+' tidak cocok.');
        var header=sheet.getRange(1,1,1,expected.length);
        if(!BirdKasCore.equal(header.getValues()[0],expected)||header.getFormulas()[0].some(function(v){return !!v;}))fail('SCHEMA_CONFLICT','Header '+table+' tidak kompatibel.');
        if(sheet.getLastRow()>1){
          var range=sheet.getRange(2,1,sheet.getLastRow()-1,expected.length);
          if(range.getFormulas().some(function(r){return r.some(function(v){return !!v;});}))fail('SCHEMA_CONFLICT','Formula tidak diperbolehkan di tabel ledger '+table+'.');
          range.getValues().forEach(function(values){if(typeof values[0]!=='string'||!values[0])fail('SCHEMA_CONFLICT','Primary ID harus string, tanpa baris kosong di '+table);values.forEach(function(value){if(value instanceof Date)fail('SCHEMA_CONFLICT','Tanggal sel harus string ISO, bukan Date Sheets: '+table);});});
        }
      });
      checkMasters(allowMissing);
    }
    function ensureSchema() {
      Object.keys(BirdKasSchema).forEach(function(table){var sheet=spreadsheet.getSheetByName(table)||spreadsheet.insertSheet(table);if(sheet.getLastRow()===0){sheet.getRange(1,1,1,BirdKasSchema[table].length).setValues([BirdKasSchema[table]]);sheet.setFrozenRows(1);}});
      SpreadsheetApp.flush();
    }
    function put(table,row) {
      var sheet=spreadsheet.getSheetByName(table),columns=BirdKasSchema[table],data=read(table);
      var matching=data.map(function(r,i){return r.id===row.id?i+2:0;}).filter(Boolean);
      if(matching.length>1)fail('DATA_CONFLICT','Primary ID ganda pada '+table);
      var index=matching[0]||sheet.getLastRow()+1;
      var values=columns.map(function(key){if(row[key]===undefined)fail('INVALID_ROW','Kolom '+key+' hilang.');return row[key];});
      // Preserve ISO dates / IDs as text, numbers as numbers. Never allow formula payloads.
      var formats=values.map(function(value){return typeof value==='number'?'0':'@';});
      sheet.getRange(index,1,1,columns.length).setNumberFormats([formats]);
      sheet.getRange(index,1,1,columns.length).setValues([values]);
    }
    function verifyDriveReference(ref) {
      if(!ref||ref.storage!=='drive'||typeof ref.driveFileId!=='string'||!/^[A-Za-z0-9_-]{10,200}$/.test(ref.driveFileId))fail('INVALID_ATTACHMENT','Gunakan referensi file Drive; referensi IndexedDB/Base64 tidak diterima.');
      var folderId=properties.getProperty('BIRDKAS_DRIVE_FOLDER_ID');
      if(!folderId)fail('CONFIG_REQUIRED','Tetapkan BIRDKAS_DRIVE_FOLDER_ID sebelum memakai foto.');
      var folder,file;
      try{folder=DriveApp.getFolderById(folderId);file=DriveApp.getFileById(ref.driveFileId);}catch(e){fail('INVALID_ATTACHMENT','File atau folder Drive tidak dapat diakses Owner.');}
      if(folder.isTrashed()||file.isTrashed())fail('INVALID_ATTACHMENT','File/folder berada di sampah.');
      if(folder.getSharingAccess()!==DriveApp.Access.PRIVATE||file.getSharingAccess()!==DriveApp.Access.PRIVATE)fail('INVALID_ATTACHMENT','File dan folder wajib Restricted, tanpa berbagi link/domain.');
      var parents=file.getParents(),inside=false;while(parents.hasNext()){if(parents.next().getId()===folderId)inside=true;}
      if(!inside)fail('INVALID_ATTACHMENT','File harus berada langsung di folder birdkas yang dikonfigurasi.');
      var mime=file.getMimeType();if(['image/jpeg','image/png','image/heic','image/heif','image/webp'].indexOf(mime)<0||file.getSize()<=0||file.getSize()>10*1024*1024)fail('INVALID_ATTACHMENT','File foto harus JPG/PNG/HEIC/HEIF/WebP, maksimal 10 MB.');
      return {id:file.getId(),storage:'drive',driveFileId:file.getId(),name:file.getName(),mimeType:mime,size:file.getSize(),verificationStatus:'UNVERIFIED'};
    }
    return {
      read:read,put:put,preflight:preflight,ensureSchema:ensureSchema,verifyDriveReference:verifyDriveReference,
      now:function(){return new Date().toISOString();},
      today:function(){return Utilities.formatDate(new Date(),'Asia/Jakarta','yyyy-MM-dd');},
      uuid:function(){return Utilities.getUuid();},
      hash:function(value){return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,value,Utilities.Charset.UTF_8).map(function(b){return ('0'+((b+256)%256).toString(16)).slice(-2);}).join('');},
      flush:function(){SpreadsheetApp.flush();},
      withLock:function(fn){var lock=LockService.getScriptLock();if(!lock.tryLock(30000))fail('BUSY','Backend sedang digunakan; coba ulang dengan requestId sama.',true);try{return fn();}finally{try{SpreadsheetApp.flush();}finally{lock.releaseLock();}}}
    };
  }
  return {create:create};
}());
