import vm from 'node:vm';import{readFileSync,readdirSync}from'node:fs';
const files=readdirSync(new URL('../backend/',import.meta.url)).filter(n=>n.endsWith('.gs'));
for(const name of files)new vm.Script(readFileSync(new URL('../backend/'+name,import.meta.url),'utf8'),{filename:name});
const manifest=JSON.parse(readFileSync(new URL('../backend/appsscript.json',import.meta.url)));
if(manifest.webapp||manifest.executionApi)throw Error('Public/API deployment manifest is not allowed at this stage');
if(manifest.timeZone!=='Asia/Jakarta')throw Error('Invalid backend time zone');
for(const name of files){const source=readFileSync(new URL('../backend/'+name,import.meta.url),'utf8');if(/function\s+do(?:Get|Post)\s*\(/.test(source))throw Error('HTTP endpoints must remain absent');}
console.log(`Backend syntax: ${files.length} Apps Script files valid; no HTTP/API deployment configured.`);
