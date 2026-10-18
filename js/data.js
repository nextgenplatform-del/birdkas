export const TODAY='2026-10-18';
export const TYPES=['Murai Batu','Kenari','Lovebird','Kacer','Cucak Hijau'];
export const seed=()=>({version:1,owner:'Pak Budi',birds:[
{id:'BRD-001',type:'Murai Batu',ring:'MB 024',sex:'Jantan',age:'8 bulan',supplier:'Pak Hendra',date:'2026-10-02',cost:1800000,status:'TERSEDIA',notes:'Ekor panjang, suara lantang',photo:'./assets/bird-1.svg'},
{id:'BRD-002',type:'Kenari',ring:'KN 012',sex:'Jantan',age:'6 bulan',supplier:'Pak Hendra',date:'2026-10-02',cost:450000,status:'TERSEDIA',notes:'Kuning cerah, aktif',photo:'./assets/bird-2.svg'},
{id:'BRD-003',type:'Lovebird',ring:'LB 008',sex:'Betina',age:'5 bulan',supplier:'Aviary Sejahtera',date:'2026-10-05',cost:350000,status:'TERSEDIA',notes:'Warna hijau pastel',photo:'./assets/bird-3.svg'},
{id:'BRD-004',type:'Kacer',ring:'KC 031',sex:'Jantan',age:'1 tahun',supplier:'Aviary Sejahtera',date:'2026-10-05',cost:800000,status:'TERJUAL',notes:'Dada hitam mengkilap',photo:'./assets/bird-1.svg'},
{id:'BRD-005',type:'Cucak Hijau',ring:'',sex:'Jantan',age:'7 bulan',supplier:'Aviary Sejahtera',date:'2026-10-05',cost:700000,status:'TERSEDIA',notes:'Bulu hijau segar',photo:'./assets/bird-3.svg'},
{id:'BRD-006',type:'Kenari',ring:'KN 013',sex:'Betina',age:'4 bulan',supplier:'Pak Hendra',date:'2026-10-02',cost:300000,status:'MATI_HILANG',notes:'Penyesuaian: mati, 12 Oktober',photo:'./assets/bird-2.svg'}],
purchases:[{id:'BEL-001',date:'2026-10-02',party:'Pak Hendra',ids:['BRD-001','BRD-002','BRD-006'],amount:2550000,account:'bank',method:'Transfer'},{id:'BEL-002',date:'2026-10-05',party:'Aviary Sejahtera',ids:['BRD-003','BRD-004','BRD-005'],amount:1850000,account:'cash',method:'Tunai'}],
sales:[{id:'JUL-001',date:TODAY,party:'Pak Andi',items:[{id:'BRD-004',price:1250000}],amount:1250000,account:'cash',method:'Tunai'}],
expenses:[{id:'BYA-001',date:'2026-10-08',category:'Pakan',amount:150000,account:'cash',notes:'Pakan dan jangkrik'},{id:'BYA-002',date:TODAY,category:'Obat/Vitamin',amount:50000,account:'cash',notes:'Vitamin harian'}],
capital:[{id:'MOD-001',date:'2026-10-01',kind:'in',amount:8000000,account:'bank'},{id:'MOD-002',date:'2026-10-01',kind:'in',amount:2000000,account:'cash'}],transfers:[],adjustments:[{id:'ADJ-001',birdId:'BRD-006',date:'2026-10-12',reason:'Mati',cost:300000}]});
