import { COUNTRIES, BY_ISO } from './countries';
import { THEMES } from './themes';

export const SECTORS=['Energy','Transport','Water','Health','Education','Digital','Agriculture'];
export const CATS=['Works','Goods','Consultancies','Non-consulting'];
const DESC={
  Energy:['Solar PV with battery storage for rural mini-grids','Rehabilitation of 33 kV distribution network','Supply of smart meters and head-end system','Hydropower turbine refurbishment'],
  Transport:['Rehabilitation of rural feeder roads','Bridge replacement on national corridor','Supply of road maintenance equipment','Urban bus rapid transit corridor'],
  Water:['Water treatment plant extension','Supply of pipes and fittings for distribution','Non-revenue water reduction programme','Rural borehole and handpump programme'],
  Health:['Construction of district referral hospital','Supply of diagnostic imaging equipment','Cold-chain equipment for vaccine storage','Medical waste treatment facilities'],
  Education:['Construction of secondary school classrooms','Supply of learning materials and laptops','Teacher training services contract','School feeding logistics services'],
  Digital:['National data centre and cloud hosting','Rural broadband last-mile network','Supply of civil registration kits','Digital payments platform integration'],
  Agriculture:['Irrigation scheme rehabilitation','Supply of certified seed and inputs','Post-harvest storage facilities','Agricultural extension advisory services'],
};
const SUP_A=['Halden','Corvane','Mbali','Tarsis','Norvik','Amara','Kestrel','Solari','Ridgeway','Baobab','Lumen','Orinoco'];
const SUP_B=['Works JV','Engineering','Consortium','Systems','Group','& Partners'];

function mulberry(seed){let a=seed>>>0;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const sig=x=>1/(1+Math.exp(-x));
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));

function generate(o){
  const R=mulberry(o.seed), U=()=>R();
  const N=()=>{let u=0;while(!u)u=U();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*U());};
  const pick=a=>a[Math.floor(U()*a.length)];
  const contracts=[],lessons=[],isr=[];
  let cid=o.cidStart;
  const pool=o.countryPool||COUNTRIES;
  for(let p=0;p<o.nProjects;p++){
    const country=pick(pool), sector=o.sector||pick(SECTORS);
    const year=o.year??Math.floor(o.y0+U()*(o.y1-o.y0+1));
    const projectId='SP'+(o.pidStart+p);
    const nC=1+(U()<.55?1:0)+(U()<.25?1:0);
    const pc=[];
    for(let i=0;i<nC;i++){
      const r=U(); const cat=r<.35?'Works':r<.65?'Goods':r<.9?'Consultancies':'Non-consulting';
      const method=cat==='Consultancies'?(U()<.6?'QCBS':'Shortlist'):U()<.08?'Direct':(U()<.55?'ICB':'NCB');
      const mu={Works:2.2,Goods:1.3,Consultancies:-.2,'Non-consulting':.2}[cat];
      const valueM=+clamp(Math.exp(mu+N()*.85),.15,120).toFixed(2);
      const cxTrue=clamp(Math.round(3+N()*1.1),1,5);
      const cx=U()<.3?null:cxTrue; // ~30% of records do not report complexity
      const gov=clamp(country.gov+N()*4,2,95), gap=(100-gov)/100, lv=Math.log(valueM);
      const sh=(o.shift&&country.gov<o.shift.govBelow)?o.shift.logit:0;
      const rb=-2.7+1.7*gap+.30*lv+.30*(cxTrue-3)+(cat==='Works'?.35:0)+(cat==='Consultancies'?-.5:0)+(method==='ICB'?.25:0)+(method==='Direct'?-.4:0)+N()*.4+sh;
      const am=-1.2+1.1*gap+.25*lv+.45*(cxTrue-3)+(cat==='Works'?.3:0)+N()*.5+sh*.6;
      const rebid=U()<sig(rb)?1:0;
      const amendments=U()<sig(am)?1+Math.floor(U()*3):0;
      const scale=60*{Works:1.5,Goods:1,Consultancies:1.2,'Non-consulting':.8}[cat]*Math.exp(.9*gap+.12*(cxTrue-3)+(method==='ICB'?.15:0)+(rebid?.25:0));
      let t=scale*Math.pow(-Math.log(U()||1e-9),1/1.8), event=1;
      if(U()<.08){t*=U();event=0;} // right-censored: tender still open at data cut-off
      const sp=country.spread*.6;
      contracts.push({id:'C-'+String(cid++).padStart(4,'0'),projectId,iso:country.iso,region:country.region,sector,cat,method,
        desc:pick(DESC[sector]),supplier:pick(SUP_A)+' '+pick(SUP_B),year,valueM,cx,gov:+gov.toFixed(1),
        lat:country.lat+N()*sp,lon:country.lon+N()*sp,tenderDays:Math.max(21,Math.round(t)),event,amendments,rebid});
      pc.push(contracts[contracts.length-1]);
    }
    // ISR series (mid-term) — often rosier than the later ICR
    const anyRebid=pc.some(c=>c.rebid);
    const last=anyRebid?pick(['S','MS','S','MU']):pick(['S','S','MS','HS','MU']);
    const ISR_TXT={HS:'Procurement is highly satisfactory; bids were received on schedule and evaluation is proceeding ahead of plan.',S:'Procurement is progressing in line with plan; no material delays identified at this stage.',MS:'Procurement is moderately satisfactory; minor clarification delays noted but contained.',MU:'Procurement is moderately unsatisfactory; evaluation has exceeded planned timelines.'};
    [1,2,3].forEach((k,i)=>isr.push({id:`${projectId}-ISR-${i+1}`,projectId,year:year+k,rating:i===2?last:pick(['S','MS','S']),text:ISR_TXT[i===2?last:'S'],doc:'ISR'}));
    // ICR lessons: only ~55% of projects have retrievable documents
    if(U()<(o.docRate??.55)){
      const gap=(100-country.gov)/100, rb=anyRebid?1:0, tw={
        spec_mismatch:1+3*rb,low_competition:1+2*rb+gap*2,eval_delay:1+gap*5,capacity:1+rb,
        site_access:['Energy','Transport','Water'].includes(sector)?2.2:.8,env_clearance:['Energy','Transport','Water'].includes(sector)?1.8:.5,
        fx:1,success_market:1+(1-rb)*2,success_standard:1+(1-rb)*2};
      const nL=1+Math.floor(U()*3), chosen=[];
      for(let j=0;j<nL;j++){
        const keys=Object.keys(tw).filter(k=>!chosen.includes(k)); const tot=keys.reduce((s,k)=>s+tw[k],0);
        let x=U()*tot; let k=keys[0]; for(const kk of keys){x-=tw[kk];if(x<=0){k=kk;break;}} chosen.push(k);
        const page=20+Math.floor(U()*70), c0=pc[0];
        const v={sector,country:country.name,cat:c0.cat,n:4+Math.floor(U()*8),m:3+Math.floor(U()*8),k:1+Math.floor(U()*3),d:90+30*Math.floor(U()*3)};
        lessons.push({id:`${projectId}-ICR-p${page}`,projectId,themeId:k,kind:THEMES[k].kind,doc:'ICR',year:year+4,page,
          section:pick(['4.2 Procurement','5.1 Lessons learned','3.3 Implementation','4.4 Risks realised']),text:THEMES[k].tpl(v),chunk:12+Math.floor(U()*300)});
      }
    }
  }
  return {contracts,lessons,isr};
}

export function buildDataset(){
  const g=generate({seed:7,nProjects:230,y0:2012,y1:2025,cidStart:1,pidStart:1000});
  return finalize(g);
}
// Simulated "new completion reports": 2026 cohort with worse outcomes in weak-governance Energy projects.
export function extendDataset(base){
  const g=generate({seed:99,nProjects:34,year:2026,sector:'Energy',cidStart:base.contracts.length+1,pidStart:2000,
    shift:{govBelow:45,logit:1.6},docRate:.9,countryPool:COUNTRIES.filter(c=>c.gov<45)});
  return finalize({contracts:[...base.contracts,...g.contracts],lessons:[...base.lessons,...g.lessons],isr:[...base.isr,...g.isr]},base);
}
function finalize(g){
  const lessonsByProject={}; g.lessons.forEach(l=>(lessonsByProject[l.projectId]||(lessonsByProject[l.projectId]=[])).push(l));
  const isrByProject={}; g.isr.forEach(l=>(isrByProject[l.projectId]||(isrByProject[l.projectId]=[])).push(l));
  const lessonById=Object.fromEntries(g.lessons.map(l=>[l.id,l]));
  const projects=[...new Set(g.contracts.map(c=>c.projectId))];
  const withDocs=projects.filter(p=>lessonsByProject[p]);
  return {...g,lessonsByProject,isrByProject,lessonById,projects,withDocs,
    byId:Object.fromEntries(g.contracts.map(c=>[c.id,c])),
    coverage:{projects:projects.length,withDocs:withDocs.length,cxMissing:g.contracts.filter(c=>c.cx==null).length}};
}
export const countryOf=iso=>BY_ISO[iso];
