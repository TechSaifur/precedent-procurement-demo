import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide } from 'd3-force';
import { THEMES } from '../data/themes';
import { BY_ISO } from '../data/countries';

// Reconciles disjoint keys into one neighbourhood: exact joins (Project ID, supplier name, ISO3+year)
// and derived joins (sector + temporal proximity + theme similarity) carry a confidence score.
export function neighbourhood(pid,data){
  const nodes=[],edges=[],seen=new Set();
  const add=(id,type,label,extra={})=>{if(!seen.has(id)){seen.add(id);nodes.push({id,type,label,...extra});}};
  const link=(a,b,how,conf,kind='exact')=>edges.push({source:a,target:b,how,conf,kind});
  const cs=data.contracts.filter(c=>c.projectId===pid);if(!cs.length)return{nodes,edges};
  const c0=cs[0],country=BY_ISO[c0.iso];
  add(pid,'Project',pid,{sub:`${c0.sector} · ${country.name} · ${c0.year}`});
  add('ctry:'+c0.iso,'Country',country.name);link(pid,'ctry:'+c0.iso,'Project country code',1);
  add('gov:'+c0.iso,'Indicator',`Governance ${country.gov}`,{sub:`CPIA-style ${country.cpia}`});link('ctry:'+c0.iso,'gov:'+c0.iso,'Join on ISO3 + year',1);
  add('pad:'+pid,'PAD','PAD §procurement',{sub:'Appraisal arrangements'});link(pid,'pad:'+pid,'Project ID',1);
  cs.forEach(c=>{add(c.id,'Contract',c.id,{sub:`${c.cat} · $${c.valueM}M`,rec:c});link(pid,c.id,'Project ID',1);
    add('sup:'+c.supplier,'Supplier',c.supplier);link(c.id,'sup:'+c.supplier,'Exact supplier-name match',.97);});
  (data.isrByProject[pid]||[]).forEach(r=>{add(r.id,'ISR',`ISR ${r.year}`,{sub:`Rating ${r.rating}`,rec:r});link(pid,r.id,'Project ID',1);});
  (data.lessonsByProject[pid]||[]).forEach(l=>{add(l.id,'Lesson',`ICR p.${l.page}`,{sub:THEMES[l.themeId].label,rec:l});link(pid,l.id,'Project ID',1);
    add('th:'+l.themeId,'Theme',THEMES[l.themeId].label);link(l.id,'th:'+l.themeId,'Extracted theme (rules + model)',.86,'derived');});
  // neighbouring projects: same sector, within ±3 years, sharing a theme
  const mine=new Set((data.lessonsByProject[pid]||[]).map(l=>l.themeId));
  const near=data.withDocs.filter(p=>p!==pid).map(p=>{const c=data.contracts.find(x=>x.projectId===p);
    const shared=(data.lessonsByProject[p]||[]).filter(l=>mine.has(l.themeId));
    const s=(c.sector===c0.sector?.45:0)+.25*Math.max(0,1-Math.abs(c.year-c0.year)/3)+Math.min(.3,shared.length*.15);
    return{p,c,s,shared};}).filter(x=>x.s>.6&&x.shared.length).sort((a,b)=>b.s-a.s).slice(0,3);
  near.forEach(n=>{add(n.p,'Project',n.p,{sub:`${n.c.sector} · ${BY_ISO[n.c.iso].name} · ${n.c.year}`,neighbour:true});
    link(pid,n.p,'Sector + time proximity + shared theme',+n.s.toFixed(2),'derived');
    link(n.p,'th:'+n.shared[0].themeId,'Theme link',.86,'derived');add('th:'+n.shared[0].themeId,'Theme',THEMES[n.shared[0].themeId].label);});
  // layout: run the simulation to rest so positions are deterministic
  const sim=forceSimulation(nodes).force('l',forceLink(edges).id(d=>d.id).distance(70).strength(.6)).force('c',forceManyBody().strength(-260)).force('m',forceCenter(0,0)).force('k',forceCollide(26)).stop();
  for(let i=0;i<320;i++)sim.tick();
  return{nodes,edges:edges.map(e=>({...e,source:e.source.id||e.source,target:e.target.id||e.target}))};
}

// Conflict = later ICR documents a failure the mid-term ISR rated as fine, corroborated by award records.
const RANK={HS:4,S:3,MS:2,MU:1,U:0};
export function findConflicts(data){
  const out=[];
  data.withDocs.forEach(pid=>{
    const isr=(data.isrByProject[pid]||[]).slice(-1)[0];const ls=(data.lessonsByProject[pid]||[]).filter(l=>['spec_mismatch','eval_delay','low_competition'].includes(l.themeId));
    const cs=data.contracts.filter(c=>c.projectId===pid&&c.rebid);
    if(isr&&ls.length&&cs.length&&RANK[isr.rating]>=2)out.push({pid,isr,icr:ls[0],contract:cs[0]});
  });
  return out;
}
// Evidence weighing: recency, document authority, specificity (figures/dates), corroboration by structured records.
export function resolve(cf){
  const icrNums=(cf.icr.text.match(/\d+/g)||[]).length,isrNums=(cf.isr.text.match(/\d+/g)||[]).length;
  const rules=[
    {k:'Recency',d:`ICR (${cf.icr.year}) is later than ISR (${cf.isr.year})`,icr:cf.icr.year>cf.isr.year?1:0,isr:cf.icr.year>cf.isr.year?0:1,w:.2},
    {k:'Document authority',d:'Completion review outranks interim supervision',icr:1,isr:.4,w:.2},
    {k:'Specificity',d:`${icrNums} concrete figures vs ${isrNums}`,icr:icrNums>isrNums?1:.4,isr:isrNums>icrNums?1:.3,w:.2},
    {k:'Corroboration by award records',d:`Contract ${cf.contract.id}: re-tender flag = ${cf.contract.rebid?'yes':'no'}, ${cf.contract.amendments} amendment(s)`,icr:cf.contract.rebid?1:.2,isr:cf.contract.rebid?0:.8,w:.4},
  ];
  const a=rules.reduce((s,r)=>s+r.icr*r.w,0),b=rules.reduce((s,r)=>s+r.isr*r.w,0);
  return{rules,icr:a,isr:b,winner:a>=b?'ICR':'ISR'};
}
