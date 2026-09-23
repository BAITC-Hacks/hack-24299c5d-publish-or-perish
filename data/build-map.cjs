// Convert the archived five-district municipal GIS layer to a local SVG module.
// Run from the repository root: node data/build-map.cjs
const fs = require('node:fs');
const source = JSON.parse(fs.readFileSync('data/astana-districts-source.json', 'utf8'));
const rivers = JSON.parse(fs.readFileSync('data/astana-rivers-source.json', 'utf8'));
const raw = source.features.flatMap(f => f.geometry.rings.flat());
const project = ([lon, lat]) => [lon * Math.cos(51.15 * Math.PI / 180), -lat];
const points = raw.map(project);
const minX = Math.min(...points.map(p=>p[0])), maxX = Math.max(...points.map(p=>p[0]));
const minY = Math.min(...points.map(p=>p[1])), maxY = Math.max(...points.map(p=>p[1]));
const scale = Math.min(600/(maxX-minX), 360/(maxY-minY));
const xy = p => { const [x,y]=project(p);return [+(350+(x-(minX+maxX)/2)*scale).toFixed(2), +(225+(y-(minY+maxY)/2)*scale).toFixed(2)]; };
const grouped = {};
for (const f of source.features) (grouped[f.attributes.name_object] ||= []).push(...f.geometry.rings.map(r=>r.map(xy)));
const inside = (p,rings) => rings.reduce((hit,r) => {let c=false; for(let i=0,j=r.length-1;i<r.length;j=i++){const a=r[i],b=r[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])c=!c;}return hit!==c;},false);
function distance(p,rings){let d=Infinity;for(const r of rings)for(let i=1;i<r.length;i++){const a=r[i-1],b=r[i],dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1)));d=Math.min(d,Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy));}return d;}
const path = rings => rings.map(r=>'M'+r.map(p=>p.join(',')).join('L')+'Z').join('');
const colors = {Сарыарка:'#687c50',Байконур:'#5a777a',Алматы:'#82764e',Есиль:'#51766c',Нура:'#6e6384'};
const regions=[], slots={};
for(const [name,rings] of Object.entries(grouped)){
 const candidates=[];
 for(let y=50;y<405;y+=4)for(let x=60;x<640;x+=4)if(inside([x,y],rings))candidates.push({p:[x,y],d:distance([x,y],rings)});
 candidates.sort((a,b)=>b.d-a.d); const [x,y]=candidates[0].p;
 regions.push([name,path(rings),x,y-8,colors[name]]);
 slots[name]=[];
 // Place project tokens within their actual district, clear of its label.
 const choices=candidates.filter(c=>c.d>7 && !(Math.abs(c.p[0]-x)<35&&c.p[1]>y-20&&c.p[1]<y+16));
 choices.sort((a,b)=>(Math.hypot(a.p[0]-x,a.p[1]-y-35)-a.d*.25)-(Math.hypot(b.p[0]-x,b.p[1]-y-35)-b.d*.25));
 for(const c of choices)if(slots[name].every(p=>Math.hypot(p[0]-c.p[0],p[1]-c.p[1])>17)){slots[name].push(c.p);if(slots[name].length===14)break;}
}
const riverPaths = rivers.features.map(f=>path(f.geometry.rings.map(r=>r.map(xy))));
fs.writeFileSync('assets/astana-map-data.js', '// Municipal GIS snapshot; sources and scope: data/MAP-SOURCES.md\nexport const regions='+JSON.stringify(regions)+';\nexport const projectSlots='+JSON.stringify(slots)+';\nexport const riverPaths='+JSON.stringify(riverPaths)+';\n');
