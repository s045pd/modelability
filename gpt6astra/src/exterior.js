import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {saucerHeight,seededRandom} from './geometry.js';
import {saucerMaps,hullMap,labelMap,glowMap,deflectorMap} from './textures.js';
const TAU=Math.PI*2;
export function createExterior(){
  const group=new THREE.Group();group.name='USS Enterprise NCC-1701-D';
  const hullMaterials=[],rand=seededRandom(47101),glows=[];let detailCount=0;
  const hullTex=hullMap();
  const mat=(color,roughness=.54,metalness=.26,extra={})=>new THREE.MeshStandardMaterial({color,roughness,metalness,...extra});
  const hull=mat('#bcc4c6',.5,.32,{map:hullTex});const edge=mat('#7f8e95',.56,.48);const dark=mat('#25343d',.65,.4);const trim=mat('#c5c4b6',.45,.5);const gold=mat('#857663',.57,.52);const red=mat('#a93b2a',.36,.3,{emissive:'#fb361f',emissiveIntensity:1.9});const blue=mat('#1b7eaf',.36,.3,{emissive:'#23a9e8',emissiveIntensity:2});const black=mat('#0c1923',.4,.3);
  hullMaterials.push(hull,edge,dark,trim,gold);
  const boxG=new THREE.BoxGeometry(1,1,1),planeG=new THREE.PlaneGeometry(1,1),dummy=new THREE.Object3D();
  function mesh(geo,material,name,parent=group){const o=new THREE.Mesh(geo,material);o.name=name||'';o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
  function box(p,s,m=hull,name='',parent=group,rounded=false){const o=mesh(rounded?new RoundedBoxGeometry(s[0],s[1],s[2],2,Math.min(...s)*.23):boxG,m,name,parent);o.position.set(...p);if(!rounded)o.scale.set(...s);return o;}
  function ellipsoid(p,s,m=hull,name='',parent=group){const o=mesh(new THREE.SphereGeometry(1,48,24),m,name,parent);o.position.set(...p);o.scale.set(...s);return o;}
  function tube(points,radius,m,name='',closed=false){const curve=new THREE.CatmullRomCurve3(points,closed,'centripetal');return mesh(new THREE.TubeGeometry(curve,Math.max(32,points.length*2),radius,6,closed),m,name);}
  function ring(rx,rz,y,cz,m,r=.5,start=0,end=TAU){const ps=[];for(let i=0;i<=180;i++){const a=start+(end-start)*i/180;ps.push(new THREE.Vector3(Math.cos(a)*rx,y,cz+Math.sin(a)*rz));}return tube(ps,r,m,'deck-ring',end-start>6.28);}
  function instances(items,geo,m,name){const inst=new THREE.InstancedMesh(geo,m,items.length);inst.name=name;for(let i=0;i<items.length;i++){const v=items[i];dummy.position.set(...v.p);dummy.scale.set(...v.s);dummy.rotation.set(0,0,0);dummy.quaternion.identity();if(v.q)dummy.quaternion.copy(v.q);else if(v.rot)dummy.rotation.set(...v.rot);dummy.updateMatrix();inst.setMatrixAt(i,dummy.matrix);if(v.color)inst.setColorAt(i,new THREE.Color(v.color));}inst.castShadow=false;inst.receiveShadow=true;inst.computeBoundingSphere();group.add(inst);detailCount+=items.length;return inst;}
  // A shared center vertex prevents the zero-area pole faces that contaminate bloom.
  function disc(side){const R=72,S=256,verts=[0,saucerHeight(0,side),0],uv=[.5,.5],indices=[];for(let j=1;j<=R;j++){const r=j/R;for(let i=0;i<S;i++){const a=i/S*TAU,x=Math.cos(a)*230*r,z=Math.sin(a)*175*r;verts.push(x,saucerHeight(r,side),z);uv.push(.5+x/460,.5-z/350);}}
    for(let i=0;i<S;i++){const ni=(i+1)%S;indices.push(...(side>0?[0,1+ni,1+i]:[0,1+i,1+ni]));}
    for(let j=1;j<R;j++)for(let i=0;i<S;i++){const n=(i+1)%S,a=1+(j-1)*S+i,b=1+(j-1)*S+n,c=1+j*S+i,d=1+j*S+n;indices.push(...(side>0?[a,b,c,b,d,c]:[a,c,b,b,c,d]));}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;}
  const saucer=new THREE.Group();saucer.name='saucer';saucer.position.set(0,22,-125);group.add(saucer);
  for(const side of [1,-1]){const maps=saucerMaps(side<0);const m=mat('#eeeeea',.62,.23,{...maps,emissive:'#afbdc1',emissiveIntensity:.44,bumpMap:maps.map,bumpScale:.17});hullMaterials.push(m);mesh(disc(side),m,side>0?'dorsal-plating':'ventral-plating',saucer);}
  // Rim segmentation, phaser tracks and ventral sensor rings.
  ring(230*.992,175*.992,17.1,-125,dark,1.12);ring(230*.993,175*.993,18.3,-125,edge,.45);ring(230*.985,175*.985,19.1,-125,trim,.35);
  for(const side of [1,-1]){const r=.875;const y=22+saucerHeight(r,side)+side*.68;ring(230*r,175*r,y,-125,dark,1.4,Math.PI/2+.30,TAU+Math.PI/2-.30);ring(230*r,175*r,y+side*.63,-125,gold,.68,Math.PI/2+.30,TAU+Math.PI/2-.30);}
  for(const r of [.24,.34,.47,.67])ring(230*r,175*r,22+saucerHeight(r,-1)-.45,-125,edge,.35);
  const rimWindows=[],rimLights=[],pods=[],smallPanels=[],runningLights=[];
  const winMat=new THREE.MeshStandardMaterial({color:'#dce5cf',emissive:'#cedac5',emissiveIntensity:1.4,roughness:.38,metalness:.15});
  for(let j=0;j<1100;j++){const a=j/1100*TAU;if(j%13===0)continue;for(let d=0;d<2;d++){const p=[Math.cos(a)*229.7,16.65+d*1.25,-125+Math.sin(a)*174.8];const q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),new THREE.Vector3(Math.cos(a)/230,0,Math.sin(a)/175).normalize());rimWindows.push({p,s:[1.2,.67,.17],q});if(rand()>.35)rimLights.push({p:[p[0]*1.0008,p[1],-125+(p[2]+125)*1.0008],s:[.85,.3,.19],q,color:rand()>.5?'#b5cbd0':'#e8d9a4'});}}
  for(const side of [1,-1])for(const rr of [.50,.57,.64,.73,.79,.93]){const n=Math.floor(rr*110);for(let j=0;j<n;j++){if(j%7<2)continue;const a=j/n*TAU;const x=Math.cos(a)*230*rr,z=Math.sin(a)*175*rr;const d=(saucerHeight(rr+.002,side)-saucerHeight(rr-.002,side))/.004;
    const normal=new THREE.Vector3(-Math.cos(a)*d/230,1,-Math.sin(a)*d/175).normalize().multiplyScalar(side);const q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),normal);
    pods.push({p:[x,22+saucerHeight(rr,side)+side*.25,z-125],s:[2.3,2.9,.35],q,color:'#b1a496'});smallPanels.push({p:[x,22+saucerHeight(rr,side)+side*.5,z-125],s:[1.8,2.2,.1],q,color:'#d7d3bf'});
  }}
  instances(rimWindows,boxG,black,'viewport-recesses');instances(rimLights,boxG,winMat,'illuminated-rim-windows');instances(pods,boxG,dark,'escape-pod-borders');instances(smallPanels,boxG,trim,'escape-pod-hatches');
  // Sensors and RCS thruster groups on the saucer cardinal points.
  for(let i=0;i<12;i++){const a=i*TAU/12+.13,r=.97;const p=[Math.cos(a)*230*r,22+saucerHeight(r,1)+.6,-125+Math.sin(a)*175*r];const o=box(p,[7,.7,4],dark,'rcs-thruster-pallet');o.rotation.y=-a;for(let j=0;j<3;j++){const b=box([p[0]+Math.cos(a)*(j-1)*1.5,p[1]+.5,p[2]-Math.sin(a)*(j-1)*1.5],[.7,.25,2.6],gold);b.rotation.y=-a;}}
  // Command complex: upper sensor platform, bridge blister and conference windows.
  ellipsoid([0,37.8,-104],[32,4.5,42],hull,'upper-sensor-platform');ellipsoid([0,42,-105],[19,5,28],edge,'bridge-support');ellipsoid([0,45.2,-116],[13,4.5,17],hull,'main-bridge');ellipsoid([0,48,-118],[8.5,2.8,10.5],trim,'bridge-dome');ellipsoid([0,49.5,-119],[4.2,1.3,5],dark,'bridge-sensor-cap');
  box([0,42,-73],[23,4,8],hull,'observation-lounge',group,true);
  for(let x=-10;x<=10;x+=2)box([x,43,-68.9],[1.1,1.7,.15],winMat,'lounge-window');
  const bridgeRim=ring(16,22,43.5,-110,gold,.3);bridgeRim.name='command-deck-ring';
  // A sculpted longitudinal hull from Catmull-Rom control sections.
  function loft(name,sections,material,exponent=1){const segments=104,sides=64;const curve=new THREE.CatmullRomCurve3(sections.map(s=>new THREE.Vector3(s[0],s[1],s[2])));const center=new THREE.CatmullRomCurve3(sections.map(s=>new THREE.Vector3(0,s[3],s[2])));const pos=[],uv=[],idx=[];
    for(let j=0;j<=segments;j++){const p=curve.getPoint(j/segments),c=center.getPoint(j/segments);for(let i=0;i<=sides;i++){const a=i/sides*TAU,co=Math.cos(a),si=Math.sin(a);pos.push(Math.sign(co)*Math.pow(Math.abs(co),exponent)*Math.max(.2,p.x),c.y+Math.sign(si)*Math.pow(Math.abs(si),exponent)*Math.max(.2,p.y),p.z);uv.push(i/sides,j/segments);}}
    for(let j=0;j<segments;j++)for(let i=0;i<sides;i++){const a=j*(sides+1)+i,b=a+sides+1;idx.push(a,a+1,b,a+1,b+1,b);}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return mesh(g,material,name);}
  loft('secondary-hull',[[1,1,-122,-42],[31,19,-110,-41],[58,32,-72,-38],[66,34,-10,-37],[59,30,68,-38],[46,24,146,-36],[25,17,223,-32],[1,1,269,-29]],hull,.9);
  loft('connecting-dorsal',[[1,1,-124,-2],[24,23,-93,-5],[45,26,-48,-7],[47,29,8,-10],[33,20,65,-13],[1,1,108,-15]],hull,.78);
  // Engineering hull deck windows use a common batch instead of per-window draw calls.
  const secondaryWindows=[];
  for(let i=0;i<44;i++){const z=-81+i*6.5,progress=(z+120)/389;const width=Math.sin(progress*Math.PI)*65;
    for(const side of [-1,1])for(let d=0;d<5;d++){const yy=-44+d*4.1;const rr=1-((yy+37)/35)**2;const x=side*width*Math.sqrt(Math.max(.2,rr));if(rand()<.23)continue;secondaryWindows.push({p:[x,yy,z],s:[1.1,.6,.2],rot:[0,side*Math.PI/2,0]});}}
  instances(secondaryWindows,boxG,winMat,'secondary-hull-windows');
  // Swept curved wing pylons, inset armor and trailing edge technical strips.
  for(const side of [-1,1]){
    const pts=[new THREE.Vector3(side*39,-23,86),new THREE.Vector3(side*80,-13,108),new THREE.Vector3(side*116,8,152),new THREE.Vector3(side*143,20,180)];
    const path=new THREE.CatmullRomCurve3(pts);const p=[],uv=[],ix=[],steps=36;
    for(let j=0;j<=steps;j++){const t=j/steps,c=path.getPoint(t),w=44-t*14,h=5-t*1.6;for(const k of [[-h,-w],[h,-w],[h,w],[-h,w]]){p.push(c.x,c.y+k[0],c.z+k[1]);uv.push(t,k[1]<0?0:1);}}
    for(let j=0;j<steps;j++)for(let k=0;k<4;k++){const a=j*4+k,b=j*4+(k+1)%4,c=a+4,d=b+4;ix.push(a,c,b,b,c,d);}ix.push(0,1,2,0,2,3,steps*4,steps*4+2,steps*4+1,steps*4,steps*4+3,steps*4+2);
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(ix);g.computeVertexNormals();const m=mesh(g,hull,'swept-nacelle-pylon');m.material.side=THREE.DoubleSide;
    tube(pts.map((v,i)=>v.clone().add(new THREE.Vector3(0,5,19-i*2))),1.2,dark,'pylon-phaser-array');
    for(let j=0;j<7;j++){const c=path.getPoint(.2+j*.09);box([c.x,c.y+5,c.z],[7,.5,22],edge,'pylon-panel').rotation.z=side*.5;}
    const n=loft(side<0?'port-nacelle':'starboard-nacelle',[[1,2,42,20],[17,12,50,20],[22,15,74,20],[24,14,115,20],[21,12,220,20],[16,10,289,20],[9,7,322,20],[.5,.5,335,20]],hull,.62);n.position.x=side*142;
    ellipsoid([side*142,21,58],[18,11.5,24],red,'bussard-collector');
    for(let k=0;k<7;k++)box([side*142-15+k*5,21,39],[.5,14,3],gold,'collector-fluting',group,true);
    const cage=[];for(let j=0;j<42;j++)for(const s of [-1,1]){cage.push({p:[side*142+s*(22-j*.10),22,101+j*4.7],s:[1.8,10,.6]});}
    instances(cage,boxG,edge,'warp-grille-ribs');
    for(const s of [-1,1]){box([side*142+s*21.2,22.7,193],[1.0,7.4,194],blue,'warp-field-grille',group,true);box([side*142+s*22,28.4,193],[1.6,1.1,195],dark,'grille-upper-rail',group,true);box([side*142+s*22,17.2,193],[1.6,1.1,195],dark,'grille-lower-rail',group,true);}
    box([side*142,34.4,183],[20,1,179],edge,'nacelle-dorsal-channel',group,true);box([side*142,35,183],[8,.45,170],hull,'dorsal-armor',group,true);
    const decal=mesh(new THREE.PlaneGeometry(13,54),new THREE.MeshBasicMaterial({map:labelMap('NCC-1701-D'),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2}),'nacelle-registry');decal.position.set(side*142,35.8,180);decal.rotation.set(-Math.PI/2,0,Math.PI/2);
    ellipsoid([side*142,19,330],[10,6,5],dark,'nacelle-aft-cap');box([side*142,20,333.5],[6,2,.5],blue,'nacelle-aft-light');
    // Nacelle safety stripes and vent fields.
    for(let j=0;j<8;j++)box([side*142,34.2,94+j*2],[11,.4,.7],dark,'dorsal-radiator');
  }
  // Recessed primary navigational deflector, concentric coil rings and central dish.
  ellipsoid([0,-43,-115],[39,23,9],dark,'deflector-cowl');ellipsoid([0,-43,-122],[35.5,19.2,3],gold,'deflector-rim');
  const dm=deflectorMap();const def=mesh(new THREE.CircleGeometry(1,96),new THREE.MeshStandardMaterial({map:dm,emissiveMap:dm,emissive:'#50d0ff',emissiveIntensity:1.4,roughness:.38,metalness:.4,side:THREE.DoubleSide}),'navigational-deflector');def.position.set(0,-43,-126);def.scale.set(33,17,1);def.rotation.y=Math.PI;
  for(let j=0;j<5;j++){const o=mesh(new THREE.TorusGeometry(34-j*1.3,.28,6,96),gold,'deflector-coil');o.position.set(0,-43,-124-j*.35);o.scale.y=.55;}
  // Saucer impulse drives, main aft hangar and secondary shuttlebays.
  for(const x of [-76,76]){box([x,23,29],[30,5,9],dark,'impulse-housing',group,true);box([x,23,34.1],[24,2.4,.6],red,'impulse-exhaust');for(let j=0;j<12;j++)box([x-11+j*2,23,34.6],[.35,3,.5],edge,'impulse-exhaust-slat');}
  box([0,25.1,41],[41,7.6,13],hull,'main-shuttlebay',group,true);box([0,25.1,47.8],[33,5,.45],dark,'hangar-door');for(let j=0;j<7;j++)box([0,22.9+j*.66,48.1],[31,.23,.14],edge,'hangar-door-slat');box([0,29,47],[32,.5,.7],winMat,'hangar-approach-light');
  for(const side of [-1,1]){box([side*26,-12,176],[19,10,7],edge,'secondary-shuttlebay',group,true);box([side*26,-11,180],[15,6,.6],dark,'secondary-shuttlebay-door');for(let j=0;j<6;j++)box([side*26,-13.5+j,180.4],[14,.2,.2],trim);}
  // Captain's yacht ventral blister, torpedo launchers and sensor apertures.
  ellipsoid([0,1,-138],[15,4,24],edge,'captains-yacht');ellipsoid([0,-1,-143],[11,2.5,18],hull,'yacht-hull');box([0,-9,-87],[18,6,11],dark,'forward-torpedo-launcher',group,true);box([0,-9,-93],[8,1.5,.4],red,'torpedo-aperture');
  for(const side of [-1,1])for(let j=0;j<14;j++){box([side*(17+j*.1),-58,10+j*5],[3,.8,2],dark,'ventral-cooling-vent');}
  // Navigation beacons use a restrained sprite halo instead of point-light floods.
  const glow=glowMap();for(const [p,color,s] of [[[228,19,-125],'#e23831',5],[[-228,19,-125],'#62dba6',5],[[0,49,-118],'#ecedcb',3],[[0,20,-299],'#ccddee',4],[[0,-53,205],'#ebdcbf',3]]){ellipsoid(p,[.8,.6,.8],new THREE.MeshBasicMaterial({color}),'navigation-beacon');const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:glow,color,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));sprite.position.set(...p);sprite.scale.set(s,s,1);group.add(sprite);glows.push(sprite);}
  // Batch repeated static box details by material: hundreds of parts, few draw calls.
  group.updateMatrixWorld(true);
  const batches=new Map();
  group.traverse(o=>{if(o.isMesh&&!o.isInstancedMesh&&o.geometry===boxG){if(!batches.has(o.material))batches.set(o.material,[]);batches.get(o.material).push(o);}});
  for(const [material,objects] of batches){if(objects.length<3)continue;const b=new THREE.InstancedMesh(boxG,material,objects.length);b.name='batched-hull-fittings';objects.forEach((o,i)=>{b.setMatrixAt(i,o.matrixWorld);o.removeFromParent();});b.castShadow=true;b.receiveShadow=true;b.computeBoundingSphere();group.add(b);detailCount+=objects.length;}
  const anchors={bridge:new THREE.Vector3(0,52,-118),engineering:new THREE.Vector3(52,-26,70),hangar:new THREE.Vector3(0,30,51),nacelle:new THREE.Vector3(166,30,175),deflector:new THREE.Vector3(0,-43,-127)};
  return {group,anchors,hullMaterials,detailCount,update(t,dt,warp=0){blue.emissiveIntensity=1.1+warp*1.8+Math.sin(t*1.6)*.10;red.emissiveIntensity=.7+Math.sin(t*2)*.08;glows.forEach((g,i)=>g.material.opacity=.5+.5*Math.pow(Math.max(0,Math.sin(t*1.5+i)),6));}};
}
