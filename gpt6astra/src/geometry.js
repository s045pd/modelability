/** Safe radial profiles and deterministic, sub-stepped walking collision. */
const TOP=[[0,16],[.09,15.7],[.18,13.4],[.29,10],[.44,7.9],[.61,5.2],[.78,1.5],[.91,-2.1],[.975,-4.1],[1,-5]];
const BOTTOM=[[0,-17],[.14,-17],[.28,-14.2],[.44,-12.3],[.62,-10.7],[.79,-8.1],[.94,-6.5],[1,-5]];
export function saucerHeight(r,side=1){
  const p=side>0?TOP:BOTTOM; r=Math.max(0,Math.min(1,r));
  for(let i=1;i<p.length;i++) if(r<=p[i][0]){const a=p[i-1],b=p[i];let t=(r-a[0])/(b[0]-a[0]);t=t*t*(3-2*t);return a[1]+(b[1]-a[1])*t;}
  return p.at(-1)[1];
}
export function insideBounds(x,z,bounds,radius=.28){
  const contained=(a,b)=>bounds.some(r=>a>=r.minX&&a<=r.maxX&&b>=r.minZ&&b<=r.maxZ);
  if(!contained(x,z))return false;
  for(let i=0;i<12;i++){const a=i*Math.PI/6;if(!contained(x+Math.cos(a)*radius,z+Math.sin(a)*radius))return false;}
  return true;
}
export function moveWithCollision(position,delta,bounds,obstacles=[],radius=.28){
  let {x,z}=position;if(!Number.isFinite(delta.x)||!Number.isFinite(delta.z))return {x,z};
  const steps=Math.max(1,Math.ceil(Math.hypot(delta.x,delta.z)/(radius*.45)));
  const dx=delta.x/steps,dz=delta.z/steps;
  const valid=(a,b)=>insideBounds(a,b,bounds,radius)&&!obstacles.some(o=>{
    if(o.disabled)return false;
    const xx=Math.max(o.minX,Math.min(a,o.maxX)),zz=Math.max(o.minZ,Math.min(b,o.maxZ));
    return (xx-a)**2+(zz-b)**2<radius*radius;
  });
  for(let i=0;i<steps;i++){if(valid(x+dx,z))x+=dx;if(valid(x,z+dz))z+=dz;}
  return {x,z};
}
export function seededRandom(seed=1701){let s=seed>>>0;return ()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};}
export function doorwayOccupied(position,doorPosition,halfWidth=1.55,halfDepth=.8){return Math.abs(position.x-doorPosition[0])<halfWidth&&Math.abs(position.z-doorPosition[2])<halfDepth;}
export function cameraFitScale(width,height,view='hero'){return width>740?1:Math.max(view==='hero'?1.3:1.5,(view==='hero'?1:1.2)/(width/height));}
