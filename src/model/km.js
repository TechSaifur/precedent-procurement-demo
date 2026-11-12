// Kaplan–Meier with Greenwood confidence band. rows: [{t, e}] (e=1 event, 0 censored)
export function km(rows){
  const r=[...rows].sort((a,b)=>a.t-b.t);let n=r.length,S=1,v=0,i=0;const pts=[{t:0,S:1,lo:1,hi:1}];
  while(i<r.length){
    const t=r[i].t;let d=0,c=0;while(i<r.length&&r[i].t===t){r[i].e?d++:c++;i++;}
    if(d>0){S*=1-d/n;if(n>d)v+=d/(n*(n-d));const se=S*Math.sqrt(v);pts.push({t,S,lo:Math.max(0,S-1.96*se),hi:Math.min(1,S+1.96*se)});}
    n-=d+c;
  }
  return pts;
}
// Time by which a fraction q of tenders have completed (1 - S(t) >= q)
export const quantile=(pts,q)=>{const p=pts.find(x=>1-x.S>=q);return p?p.t:null;};
export function cohortFor(draft,country,contracts){
  const f=(gv)=>contracts.filter(c=>c.cat===draft.cat&&Math.abs(c.gov-country.gov)<=gv);
  let rows=f(15),rule=`${draft.cat} · governance within ±15`;
  if(rows.length<35){rows=f(28);rule=`${draft.cat} · governance within ±28 (relaxed)`;}
  if(rows.length<35){rows=contracts.filter(c=>c.cat===draft.cat);rule=`${draft.cat} · all governance bands (relaxed)`;}
  return{rows,rule};
}
