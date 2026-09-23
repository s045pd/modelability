import {build} from 'esbuild';
import {readFile,writeFile} from 'node:fs/promises';
const result=await build({entryPoints:['src/main.js'],bundle:true,write:false,format:'iife',target:['es2022'],minify:true,legalComments:'inline',charset:'utf8'});
const shell=await readFile('src/shell.html','utf8');const license=await readFile('node_modules/three/LICENSE','utf8');
const code=result.outputFiles[0].text.replace(/<\/script/gi,'<\\/script');
const html=shell.replace('/* APPLICATION_BUNDLE */',()=>`/* Three.js — ${license.replace(/\*\//g,'* /')} */\n${code}`);
await writeFile('index.html',html);console.log(`Standalone HTML written: ${(Buffer.byteLength(html)/1024/1024).toFixed(2)} MB; no runtime network dependencies.`);
