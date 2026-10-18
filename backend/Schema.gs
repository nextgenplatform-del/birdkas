/** BirdKas V0.2. No demo rows. Primary keys are strings, never row numbers. */
var BirdKasSchema = Object.freeze({
  BURUNG: ['id','operationId','typeId','type','ring','sex','age','supplierId','purchaseId','date','cost','status','notes','photosJson','updatedOperationId'],
  PEMBELIAN: ['id','operationId','date','supplierId','amount','method','accountId','count'],
  DETAIL_PEMBELIAN: ['id','operationId','purchaseId','birdId','allocatedCost'],
  PENJUALAN: ['id','operationId','date','customerId','amount','method','accountId','proofJson','verificationStatus'],
  DETAIL_PENJUALAN: ['id','operationId','saleId','birdId','price','costSnapshot'],
  BIAYA_OPERASIONAL: ['id','operationId','date','category','amount','accountId','notes'],
  MUTASI_KAS: ['id','operationId','date','accountId','signedAmount','sourceType','sourceId'],
  MUTASI_MODAL: ['id','operationId','date','kind','amount','accountId','notes'],
  PENYESUAIAN_STOK: ['id','operationId','date','birdId','reason','costSnapshot'],
  SUPPLIER: ['id','name','createdAt'],
  PELANGGAN: ['id','name','createdAt'],
  JENIS_BURUNG: ['id','name','createdAt'],
  AKUN_KAS: ['id','name','openingBalance'],
  AUDIT_LOG: ['id','operationId','requestId','actor','action','timestamp','beforeJson','afterJson'],
  TRANSACTION_LOG: ['id','operationId','action','payloadHash','status','planJson','resultJson','createdAt','updatedAt','errorCode'],
  SETTINGS: ['id','value']
});
