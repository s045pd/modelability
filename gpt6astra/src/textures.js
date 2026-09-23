import * as THREE from 'three';
import {seededRandom} from './geometry.js';
function canvas(size,h=size){const c=document.createElement('canvas');c.width=size;c.height=h;return [c,c.getContext('2d')];}
function texture(c){const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t;}
/** Aztec plating is drawn in polar cells, never a stretched checkerboard. */
export function saucerMaps(bottom=false){
  const N=2048,[c,g]=canvas(N),[em,eg]=canvas(N);const R=N*.495,C=N/2,rand=seededRandom(bottom?81:1701);
  g.fillStyle='#b6bcbd';g.fillRect(0,0,N,N);eg.fillStyle='#000';eg.fillRect(0,0,N,N);
  const cell=(r1,r2,a,b,color,context=g)=>{context.beginPath();context.arc(C,C,r2,a,b);context.arc(C,C,r1,b,a,true);context.closePath();context.fillStyle=color;context.fill();};
  for(let ring=0;ring<72;ring++){
    const r1=ring*R/72,r2=(ring+1)*R/72;const n=Math.max(18,Math.floor(r2*.46));
    for(let j=0;j<n;j++){
      const a=j*Math.PI*2/n,b=(j+1)*Math.PI*2/n;
      const tone=rand();const v=Math.floor(169+tone*31);cell(r1+.6,r2-.6,a+.0005,b-.0005,`rgb(${v},${v+5},${v+6})`);
      if(rand()>.54){cell(r1+2,r1+(r2-r1)*.48,a+.001,b-.001,'rgba(227,229,219,.20)');cell(r1+(r2-r1)*.56,r2-2,a+.001,(a+b)/2,'rgba(94,109,118,.12)');}
      if(rand()>.78){g.strokeStyle='rgba(78,92,105,.2)';g.lineWidth=.6;g.beginPath();g.arc(C,C,(r1+r2)/2,a,b);g.stroke();}
    }
  }
  // Deck boundaries, radial structural seams, fine sensor markings.
  for(let k=1;k<35;k++){g.beginPath();g.arc(C,C,R*k/35,0,Math.PI*2);g.strokeStyle=k%5===0?'rgba(65,81,91,.58)':'rgba(72,91,102,.25)';g.lineWidth=k%5===0?1.8:.8;g.stroke();}
  for(let j=0;j<72;j++){let a=j*Math.PI/36;g.beginPath();g.moveTo(C+Math.cos(a)*R*.28,C+Math.sin(a)*R*.28);g.lineTo(C+Math.cos(a)*R*.974,C+Math.sin(a)*R*.974);g.lineWidth=j%6===0?1.4:.65;g.strokeStyle='rgba(64,79,85,.25)';g.stroke();}
  // Thousands of individual dark and lit viewport slots, clustered by decks.
  for(let ring=0;ring<15;ring++){
    const radius=R*(.25+ring*.046);const count=Math.floor(radius*.75);
    for(let j=0;j<count;j++){
      if(j%17<3||j%5===0)continue;const a=j*Math.PI*2/count;
      if(!bottom && Math.sin(a)<-.4 && ring>4&&ring<10 && Math.abs(Math.cos(a))<.47)continue;
      const x=C+Math.cos(a)*radius,y=C+Math.sin(a)*radius;const lit=rand()>.36;
      for(const context of [g,eg]){context.save();context.translate(x,y);context.rotate(a);context.fillStyle=context===eg?(lit?'#acb5ac':'#000'):'#293b44';context.fillRect(-3.6,-1,7.2,2);if(context===g&&lit){context.fillStyle='#d6dacb';context.fillRect(-2.4,-.65,4.8,1.3);}context.restore();}
    }
  }
  // Red radial safety lines and marking zones.
  for(const a of [-Math.PI/2-.65,-Math.PI/2+.65,Math.PI/2-.53,Math.PI/2+.53]){cell(R*.54,R*.548,a-.022,a+.022,'#914947');}
  if(!bottom){
    g.save();g.translate(C,C-R*.54);g.rotate(Math.PI);g.textAlign='center';g.textBaseline='middle';g.fillStyle='#29323a';g.font='500 87px Arial';g.fillText('NCC-1701-D',0,0);g.font='500 32px Arial';g.fillText('U.S.S. ENTERPRISE',0,-112);g.restore();
    g.save();g.translate(C,C+R*.67);g.fillStyle='#4d5458';g.textAlign='center';g.font='14px Arial';g.fillText('UNITED FEDERATION OF PLANETS',0,0);g.restore();
  }else{g.save();g.translate(C,C-R*.55);g.rotate(Math.PI);g.fillStyle='#3a4449';g.textAlign='center';g.font='64px Arial';g.fillText('NCC-1701-D',0,0);g.restore();}
  return {map:texture(c),emissiveMap:texture(em)};
}
export function hullMap(){
  const [c,g]=canvas(1024);const rand=seededRandom(300);g.fillStyle='#b0b7b9';g.fillRect(0,0,1024,1024);
  for(let y=0;y<1024;y+=16)for(let x=0;x<1024;x+=32){const v=Math.floor(165+rand()*35);g.fillStyle=`rgb(${v},${v+5},${v+7})`;g.fillRect(x+.6,y+.6,31,15);g.fillStyle='rgba(240,240,220,.13)';g.fillRect(x+2,y+2,12,5);g.fillStyle='rgba(61,78,87,.18)';g.fillRect(x+21,y+8,8,2);}
  const t=texture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(2,3);return t;
}
export function labelMap(text,color='#28343b',stripe=true){const [c,g]=canvas(1024,256);g.clearRect(0,0,1024,256);g.textAlign='center';g.fillStyle=color;g.font='500 96px Arial';g.fillText(text,512,127);if(stripe){g.fillStyle='#983e3e';g.fillRect(32,164,960,11);g.fillRect(32,182,960,4);}return texture(c);}
export function glowMap(){const [c,g]=canvas(128);const grad=g.createRadialGradient(64,64,0,64,64,64);grad.addColorStop(0,'rgba(255,255,255,1)');grad.addColorStop(.12,'rgba(255,255,255,.7)');grad.addColorStop(.36,'rgba(255,255,255,.16)');grad.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=grad;g.fillRect(0,0,128,128);return texture(c);}
export function deflectorMap(){const [c,g]=canvas(512);g.fillStyle='#061d2b';g.fillRect(0,0,512,512);const grad=g.createRadialGradient(256,256,0,256,256,256);grad.addColorStop(0,'#d1f6ff');grad.addColorStop(.15,'#68cce2');grad.addColorStop(.48,'#177697');grad.addColorStop(.86,'#114456');grad.addColorStop(1,'#1e2b39');g.fillStyle=grad;g.beginPath();g.arc(256,256,252,0,Math.PI*2);g.fill();for(let r=20;r<250;r+=8){g.beginPath();g.arc(256,256,r,0,Math.PI*2);g.strokeStyle='rgba(145,233,255,.32)';g.lineWidth=1;g.stroke();}for(let a=0;a<Math.PI*2;a+=Math.PI/72){g.beginPath();g.moveTo(256+Math.cos(a)*60,256+Math.sin(a)*60);g.lineTo(256+Math.cos(a)*249,256+Math.sin(a)*249);g.strokeStyle='rgba(2,32,51,.36)';g.stroke();}return texture(c);}
