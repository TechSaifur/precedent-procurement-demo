// Small, transparent models trained in the browser on the cohort.
// Production would swap in gradient-boosted trees (calibrated) and a Cox / AFT survival model.
export const FEATURE_NAMES=['Governance gap','Award size (log $M)','Technical complexity','Works package','Consultancy','Open international bidding','Complexity not reported','Energy sector'];
export const feats=c=>{const m=c.cx==null;return[(100-c.gov)/100,Math.log(c.valueM),m?0:c.cx-3,c.cat==='Works'?1:0,c.cat==='Consultancies'?1:0,c.method==='ICB'?1:0,m?1:0,c.sector==='Energy'?1:0];};
const sig=x=>1/(1+Math.exp(-x));

export function fitLogit(X,y,{iters=500,lr=.4,l2=.02}={}){
  const n=X.length,d=X[0].length,mu=Array(d).fill(0),sd=Array(d).fill(0);
  for(const r of X)r.forEach((v,i)=>mu[i]+=v/n);
  for(const r of X)r.forEach((v,i)=>sd[i]+=(v-mu[i])**2/n);
  sd.forEach((v,i)=>sd[i]=Math.sqrt(v)||1);
  const Z=X.map(r=>r.map((v,i)=>(v-mu[i])/sd[i]));
  let w=Array(d).fill(0),b=Math.log((y.reduce((a,v)=>a+v,0)+1)/(n-y.reduce((a,v)=>a+v,0)+1));
  for(let it=0;it<iters;it++){
    const gw=Array(d).fill(0);let gb=0;
    for(let i=0;i<n;i++){let s=b;for(let j=0;j<d;j++)s+=w[j]*Z[i][j];const e=sig(s)-y[i];gb+=e/n;for(let j=0;j<d;j++)gw[j]+=e*Z[i][j]/n;}
    b-=lr*gb;for(let j=0;j<d;j++)w[j]-=lr*(gw[j]+l2*w[j]);
  }
  const p=x=>{let s=b;for(let j=0;j<d;j++)s+=w[j]*(x[j]-mu[j])/sd[j];return sig(s);};
  const contrib=x=>x.map((v,j)=>w[j]*(v-mu[j])/sd[j]);
  return{w,b,mu,sd,p,contrib};
}
export function auc(scores,y){
  let pairs=0,wins=0;
  for(let i=0;i<y.length;i++)for(let j=0;j<y.length;j++)if(y[i]===1&&y[j]===0){pairs++;wins+=scores[i]>scores[j]?1:scores[i]===scores[j]?.5:0;}
  return pairs?wins/pairs:null;
}

export function trainModels(contracts){
  const X=contracts.map(feats);
  const yR=contracts.map(c=>c.rebid), yA=contracts.map(c=>c.amendments>0?1:0);
  const rebid=fitLogit(X,yR), amend=fitLogit(X,yA);
  // temporal hold-out: train <=2022, test 2023+
  const tr=contracts.filter(c=>c.year<=2022), te=contracts.filter(c=>c.year>2022&&c.year<2026);
  const out={};
  for(const [k,key] of [['rebid',c=>c.rebid],['amend',c=>c.amendments>0?1:0]]){
    const m=fitLogit(tr.map(feats),tr.map(key));const s=te.map(c=>m.p(feats(c))),y=te.map(key);
    out[k]=y.some(v=>v)&&y.some(v=>!v)?auc(s,y):null;
  }
  return{rebid,amend,auc:out,n:contracts.length,nTest:te.length,
    base:{rebid:yR.reduce((a,v)=>a+v,0)/yR.length,amend:yA.reduce((a,v)=>a+v,0)/yA.length}};
}
