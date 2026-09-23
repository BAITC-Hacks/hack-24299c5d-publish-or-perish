import { regions, projectSlots, riverPaths } from './astana-map-data.js';
import { projectIcon } from './project-icons.js';
import { MEASURES } from '../score.js';
const art={Транспорт:'transport',Экология:'ecology',Соцсфера:'social',Безопасность:'safety',Сервисы:'services'};
const uniqueArt=new Set(['M1','M2','M5','M6','M8','M9','M11','M12','M14']);
export const getCardArt=id=>`assets/art/${uniqueArt.has(id)?id:art[MEASURES[id].direction]}.png`;
const centers=Object.fromEntries(regions.map(([name,,x,y])=>[name,[x,y]]));
let previous=new Set();
const selected=document.querySelector('#selected'),heading=document.querySelector('.selected-heading');
if(selected&&heading){
 const dialog=document.createElement('dialog');dialog.className='history-dialog';dialog.id='history-dialog';
 dialog.innerHTML='<button class="close" id="close-history" aria-label="Закрыть">×</button><p class="eyebrow">ВАШ ПЛАН РАЗВИТИЯ</p><h2>Проекты города</h2>';
 dialog.append(selected);document.body.append(dialog);heading.setAttribute('role','button');heading.tabIndex=0;heading.setAttribute('aria-label','Посмотреть все проекты');
 heading.addEventListener('click',()=>dialog.showModal());heading.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();dialog.showModal();}});
 dialog.querySelector('#close-history').onclick=()=>dialog.close();
}
const building = projectIcon;
export function paintGameBoard({projects=[],preview=null,quarter=1}={}){
 document.querySelectorAll('.card[data-card]').forEach((card,index)=>{
  const id=card.dataset.card,m=MEASURES[id];if(!m)return;
  card.style.setProperty('--tilt',`${(index-(document.querySelectorAll('.card').length-1)/2)*1.2}deg`);
  card.title=m.name;
  const container=card.querySelector('.art');const coin=container.querySelector('.cost');if(coin)card.append(coin);let img=container.querySelector('img');
  if(!img){img=document.createElement('img');img.alt='';container.prepend(img);}
  img.onerror=()=>{img.hidden=true;container.style.background='linear-gradient(135deg,#385d59,#182e35)';};
  img.onload=()=>{img.hidden=false;};img.src=getCardArt(id);if(img.complete&&img.naturalWidth)img.hidden=false;
 });
 const map=document.querySelector('#map');if(!map)return;
 if(!map.querySelector('#geography')){
  const geo=document.createElementNS('http://www.w3.org/2000/svg','g');geo.id='geography';
  geo.innerHTML='<defs><clipPath id="city-clip">'+regions.map(([,path])=>'<path d="'+path+'"/>').join('')+'</clipPath></defs>'+regions.map(([,path,,,color])=>'<path d="'+path+'" fill="'+color+'"/>').join('')+'<g clip-path="url(#city-clip)" fill="#75b9bf" stroke="#75b9bf" stroke-width=".5">'+riverPaths.map(path=>'<path d="'+path+'"/>').join('')+'</g><g class="geo-decoration"><text x="92" y="100">С</text><path d="M92 109L86 133L92 127L98 133Z" fill="#ddc68d"/><text x="75" y="370" class="geo-caption">АСТАНА</text><text x="75" y="385" class="geo-small">ПЯТЬ РАЙОНОВ</text><text x="75" y="398" class="geo-small">АРХИВНЫЕ ГРАНИЦЫ</text></g>';
  map.insertBefore(geo,map.querySelector('#district-shapes'));
  const caption=document.querySelector('.map-label');if(caption)caption.innerHTML='КАРТА АСТАНЫ <span>5 районов · архивный слой</span>';
  const footer=document.querySelector('.map-footer');if(footer&&!footer.querySelector('.geo-source')){const link=document.createElement('a');link.className='geo-source';link.href='https://gis.esaulet.kz/server/rest/services/Hosted/Adm_raiony/FeatureServer';link.target='_blank';link.rel='noopener';link.textContent='Источник: геопортал Астаны ↗';link.title='Архивные границы пяти районов; значки проектов обозначают район, а не точный адрес строительства';footer.append(link);}
 }

 let layer=map.querySelector('#world-effects');if(!layer){layer=document.createElementNS('http://www.w3.org/2000/svg','g');layer.id='world-effects';layer.setAttribute('class','world-effects');map.append(layer);}
 const list=[...projects,...(preview?[{...preview,isPreview:true}]:[])];
 layer.innerHTML=Object.keys(centers).flatMap(name=>{
  const items=list.filter(p=>!MEASURES[p.id].district||p.district===name);
  return items.map((p,i)=>{const [x,y]=projectSlots[name][i%projectSlots[name].length];return `<g transform="translate(${x},${y}) scale(${items.length>3?.34:.48})" data-project="${p.id}" data-project-district="${name}" class="project-token"><title>${MEASURES[p.id].name} · ${name}${p.isPreview?' · Предпросмотр':''}</title><g class="world-object ${p.isPreview?'preview':''} ${p.quarter&&p.quarter+MEASURES[p.id].lag>quarter?'late':''}">${p.isPreview?'<ellipse cy="6" rx="27" ry="24" class="build-ring"/>':''}${building(p.id)}</g></g>`;});
 }).join('');
 const keys=new Set(projects.map(p=>`${p.id}:${p.district||'city'}:${p.quarter||0}`));
 const added=projects.find(p=>!previous.has(`${p.id}:${p.district||'city'}:${p.quarter||0}`));
 if(added&&keys.size>previous.size){const toast=document.createElement('div');toast.className='world-toast';toast.textContent=`${MEASURES[added.id].name} · ${added.district||'Весь город'}`;document.querySelector('.map-wrap').append(toast);setTimeout(()=>toast.remove(),2400);}
 previous=keys;
}
