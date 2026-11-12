// Hybrid retrieval over contracts that have document evidence.
// Signal 1: structured similarity (sector, category, size, governance, region).
// Signal 2: TF-IDF cosine over contract + lesson text (stands in for BM25 + dense embeddings).
// Fused with reciprocal rank fusion (RRF).
const STOP=new Set('the and for with was were that this from into than then they their have has had not are but its per all out any can may'.split(' '));
const tok=s=>s.toLowerCase().replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(w=>w.length>2&&!STOP.has(w)).map(w=>w.replace(/s$/,''));
const cache=new WeakMap();
function index(data){
  if(cache.has(data))return cache.get(data);
  const docs={};data.contracts.forEach(c=>{docs[c.projectId]=(docs[c.projectId]||'')+' '+c.desc+' '+c.sector;});
  data.lessons.forEach(l=>{docs[l.projectId]=(docs[l.projectId]||'')+' '+l.text;});
  const df={},tf={};const ids=Object.keys(docs);
  ids.forEach(id=>{const t={};tok(docs[id]).forEach(w=>t[w]=(t[w]||0)+1);tf[id]=t;Object.keys(t).forEach(w=>df[w]=(df[w]||0)+1);});
  const idf=w=>Math.log((1+ids.length)/(1+(df[w]||0)))+1;
  const vec={};ids.forEach(id=>{const v={};let nrm=0;for(const w in tf[id]){v[w]=(1+Math.log(tf[id][w]))*idf(w);nrm+=v[w]**2;}nrm=Math.sqrt(nrm)||1;for(const w in v)v[w]/=nrm;vec[id]=v;});
  const r={vec,idf};cache.set(data,r);return r;
}
export function retrieve(draft,country,data,k=6){
  const {vec,idf}=index(data);
  const q={};let qn=0;tok(`${draft.desc} ${draft.sector} ${draft.cat}`).forEach(w=>q[w]=(q[w]||0)+1);
  for(const w in q){q[w]=(1+Math.log(q[w]))*idf(w);qn+=q[w]**2;}qn=Math.sqrt(qn)||1;
  const cand=data.contracts.filter(c=>data.lessonsByProject[c.projectId]);
  const best={};
  cand.forEach(c=>{
    const st=(c.sector===draft.sector?.35:0)+(c.cat===draft.cat?.25:0)+.2*Math.exp(-Math.abs(Math.log(c.valueM/draft.valueM))/1.2)+.1*(1-Math.abs(c.gov-country.gov)/100)+(c.region===country.region?.1:0);
    let lx=0;const v=vec[c.projectId];for(const w in q)if(v[w])lx+=q[w]/qn*v[w];
    if(!best[c.projectId]||st>best[c.projectId].struct)best[c.projectId]={c,struct:st,lex:lx};
  });
  const rows=Object.values(best);
  const rs=[...rows].sort((a,b)=>b.struct-a.struct),rl=[...rows].sort((a,b)=>b.lex-a.lex);
  rows.forEach(r=>{r.score=1/(60+rs.indexOf(r)+1)+1/(60+rl.indexOf(r)+1);r.lessons=data.lessonsByProject[r.c.projectId];});
  return rows.sort((a,b)=>b.score-a.score).slice(0,k);
}
export function themeCounts(prec){
  const m={};prec.forEach(p=>p.lessons.forEach(l=>{(m[l.themeId]||(m[l.themeId]={id:l.themeId,count:0,ids:[]})).count++;m[l.themeId].ids.push(l.id);}));
  return Object.values(m).sort((a,b)=>b.count-a.count);
}
