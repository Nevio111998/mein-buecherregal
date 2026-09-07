/* Mein Bücherregal V15.9.3 — deterministic, grouped graph layout.
   Pure presentation module; it never reads or writes library data. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.CharacterGraphLayout=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const NODE_W=196,NODE_H=116,GAP_X=26,GAP_Y=24,PAD=30,HEADER=76,GROUP_GAP=48,PAGE=60;
  const norm=s=>String(s||'').trim().toLocaleLowerCase('de');
  const compare=(a,b)=>norm(a.name).localeCompare(norm(b.name),'de')||String(a.id).localeCompare(String(b.id));
  const groupName=c=>String(c.faction||'').trim()||String(c.role||'').trim()||'Ohne Fraktion';
  function groups(characters,relationships){
    const chars=Array.isArray(characters)?characters:[];
    const ids=new Set(chars.map(c=>String(c.id)));
    const degree=new Map([...ids].map(id=>[id,0]));
    const seen=new Set();
    for(const r of Array.isArray(relationships)?relationships:[]){
      const a=String(r.from),b=String(r.to),key=[a,b].sort().join('\0');
      if(a===b||!ids.has(a)||!ids.has(b)||seen.has(key))continue;
      seen.add(key);degree.set(a,degree.get(a)+1);degree.set(b,degree.get(b)+1);
    }
    const buckets=new Map();
    for(const c of chars){const name=groupName(c),key=norm(name);if(!buckets.has(key))buckets.set(key,{name,characters:[]});buckets.get(key).characters.push(c)}
    const result=[...buckets.values()];
    result.forEach(g=>g.characters.sort((a,b)=>(degree.get(String(b.id))||0)-(degree.get(String(a.id))||0)||compare(a,b)));
    result.sort((a,b)=>b.characters.length-a.characters.length||norm(a.name).localeCompare(norm(b.name),'de'));
    return result;
  }
  function layout(characters,relationships){
    const buckets=groups(characters,relationships),n=(characters||[]).length;
    if(!n)return {width:0,height:0,nodes:[],groups:[],nodeWidth:NODE_W,nodeHeight:NODE_H};
    const specs=buckets.map(g=>{
      const cols=g.characters.length===1?1:g.characters.length<=10?2:3;
      const rows=Math.ceil(g.characters.length/cols);
      return {...g,cols,rows,width:PAD*2+cols*NODE_W+(cols-1)*GAP_X,height:HEADER+PAD+rows*NODE_H+(rows-1)*GAP_Y+PAD};
    });
    // A balanced two-column atlas layout prevents the endlessly wide strip.
    // Large collections use three lanes, with deterministic ordering.
    const laneCount=specs.length===1?1:(n>100&&specs.length>5?3:2);
    const laneWidths=Array(laneCount).fill(0),laneHeights=Array(laneCount).fill(PAGE);
    specs.forEach((g,i)=>{const lane=i<laneCount?i:laneHeights.indexOf(Math.min(...laneHeights));g.lane=lane;laneWidths[lane]=Math.max(laneWidths[lane],g.width);laneHeights[lane]+=g.height+GROUP_GAP});
    const laneXs=[];let x=PAGE;
    laneWidths.forEach(w=>{laneXs.push(x);x+=w+GROUP_GAP});
    const nodes=[],boxes=[],cursor=Array(laneCount).fill(PAGE);
    for(const g of specs){
      const gx=laneXs[g.lane],gy=cursor[g.lane];
      boxes.push({label:g.name,count:g.characters.length,x:gx,y:gy,width:g.width,height:g.height});
      g.characters.forEach((c,i)=>{
        const col=i%g.cols,row=Math.floor(i/g.cols);
        nodes.push({id:String(c.id),x:gx+PAD+col*(NODE_W+GAP_X)+NODE_W/2,y:gy+HEADER+row*(NODE_H+GAP_Y)+NODE_H/2});
      });
      cursor[g.lane]+=g.height+GROUP_GAP;
    }
    const maxBottom=Math.max(...cursor)-GROUP_GAP;
    return {width:Math.ceil(x-GROUP_GAP+PAGE),height:Math.ceil(maxBottom+PAGE),nodes,groups:boxes,nodeWidth:NODE_W,nodeHeight:NODE_H};
  }
  return {layout,groups,NODE_W,NODE_H};
});
