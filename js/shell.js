const I={home:'M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',play:'M8 5v14l11-7z',people:'M16 11a4 4 0 1 0-8 0M3 21a9 9 0 0 1 18 0',you:'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM5 21a7 7 0 0 1 14 0',cal:'M5 4h14a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zM4 9h16M8 2v4M16 2v4',wx:'M7 18a4 4 0 1 1 1-7.9A5 5 0 0 1 18 11a3.5 3.5 0 0 1 0 7z',guide:'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 21V5',new:'M12 5v14M5 12h14',heart:'M12 21s-7-4.5-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6c-2.5 4.5-9.5 9-9.5 9z'};
const N=[['index','Home','home'],['play','Life','play'],['people','People','people'],['love','Love','heart'],['calendar','Calendar','cal'],['weather','Weather','wx'],['you','You','you'],['new','New','new'],['about','Guide','guide']];
const pg=document.body.dataset.page, saved=!!localStorage.getItem('irl-text-v1');
document.title=(N.find(n=>n[0]===pg)?.[1]||'')+' · IRL: In Remote Life';
if(saved)document.body.classList.add('has-save');
const nav=document.createElement('nav');nav.id='side';
nav.innerHTML='<div class="brand"><i>IRL</i><div>In Remote Life<small>A text life simulator</small></div></div>'+
N.map(([h,t,i])=>`<a class="nv ${h===pg?'on':''} ${h==='new'||h==='about'?'sec':''}" href="${h}.html"><svg viewBox="0 0 24 24"><path d="${I[i]}"/></svg>${t}</a>`).join('')+'<div class="foot">Auto-saves in your browser. Number keys pick options.</div>';
document.body.prepend(nav);

const o=document.getElementById('opts');
if(o&&pg!=='new'){const b=document.createElement('button');b.className='jump';b.textContent='Actions ↓';b.onclick=()=>o.scrollIntoView({behavior:'smooth',block:'start'});document.body.append(b);
new IntersectionObserver(e=>b.classList.toggle('on',!e[0].isIntersecting&&innerWidth<=1000),{rootMargin:'0px 0px -30% 0px'}).observe(o);}
