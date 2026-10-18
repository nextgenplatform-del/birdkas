import vm from 'node:vm';import fs from 'node:fs';new vm.Script(fs.readFileSync('backend/Code.gs','utf8'));console.log('Code.gs syntax OK');
