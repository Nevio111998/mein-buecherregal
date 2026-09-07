/* Mein Bücherregal V15.9.1 — deterministic, offline graph layout.
   Presentation only: this module never reads or writes the library. */
(function(root, factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.CharacterGraphLayout=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const NODE_W=166, NODE_H=100, GAP_X=72, GAP_Y=60;
  const DX=NODE_W+GAP_X, DY=NODE_H+GAP_Y, CELL=340;
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const label=x=>String(x||'').toLocaleLowerCase('de');
  const compare=(a,b)=>label(a.name).localeCompare(label(b.name),'de')||String(a.id).localeCompare(String(b.id));
  function grid(nodes){
    const cells=new Map();
    nodes.forEach((p,i)=>{const key=Math.floor(p.x/CELL)+','+Math.floor(p.y/CELL);if(!cells.has(key))cells.set(key,[]);cells.get(key).push(i)});
    return cells;
  }
  function pairs(nodes,callback){
    const cells=grid(nodes);
    for(let i=0;i<nodes.length;i++){
      const p=nodes[i],gx=Math.floor(p.x/CELL),gy=Math.floor(p.y/CELL);
      for(let x=gx-1;x<=gx+1;x++)for(let y=gy-1;y<=gy+1;y++){
        for(const j of cells.get(x+','+y)||[])if(j>i)callback(i,j);
      }
    }
  }
  function separate(nodes,passes=32){
    for(let step=0;step<passes;step++){
      const mx=new Float64Array(nodes.length),my=new Float64Array(nodes.length);
      let count=0;
      pairs(nodes,(i,j)=>{
        const a=nodes[i],b=nodes[j],dx=b.x-a.x,dy=b.y-a.y;
        const ox=DX-Math.abs(dx),oy=DY-Math.abs(dy);
        if(ox<=0||oy<=0)return;
        count++;
        if(ox/DX<oy/DY){const sign=dx===0?(i<j?1:-1):Math.sign(dx);const d=(ox+0.4)*.5*sign;mx[i]-=d;mx[j]+=d}
        else{const sign=dy===0?(i<j?1:-1):Math.sign(dy);const d=(oy+0.4)*.5*sign;my[i]-=d;my[j]+=d}
      });
      if(!count)return true;
      nodes.forEach((p,i)=>{p.x+=mx[i];p.y+=my[i]});
    }
    return false;
  }
  function componentLayout(members,edges,degree){
    const ordered=members.slice().sort((a,b)=>(degree.get(b.id)||0)-(degree.get(a.id)||0)||compare(a,b));
    const n=ordered.length,cols=Math.max(1,Math.ceil(Math.sqrt(n*1.8)));
    const points=ordered.map((c,i)=>({id:String(c.id),x:(i%cols)*DX,y:Math.floor(i/cols)*DY,vx:0,vy:0}));
    if(n>1&&edges.length){
      const idx=new Map(points.map((p,i)=>[p.id,i]));
      const links=edges.map(e=>[idx.get(String(e.from)),idx.get(String(e.to))]).filter(e=>e[0]!==undefined&&e[1]!==undefined);
      const iterations=n>450?45:n>180?75:130;
      for(let step=0;step<iterations;step++){
        const fx=new Float64Array(n),fy=new Float64Array(n);
        for(const [i,j] of links){
          const a=points[i],b=points[j],dx=b.x-a.x,dy=b.y-a.y,d=Math.max(1,Math.hypot(dx,dy));
          const f=clamp((d-305)*.012,-6,8),x=dx/d*f,y=dy/d*f;
          fx[i]+=x;fy[i]+=y;fx[j]-=x;fy[j]-=y;
        }
        pairs(points,(i,j)=>{
          const a=points[i],b=points[j],dx=b.x-a.x,dy=b.y-a.y;
          const d=Math.max(1,Math.hypot(dx,dy)),rep=Math.max(0,330-d)*.019;
          if(rep){const x=dx/d*rep,y=dy/d*rep;fx[i]-=x;fy[i]-=y;fx[j]+=x;fy[j]+=y}
          const ox=DX-Math.abs(dx),oy=DY-Math.abs(dy);
          if(ox>0&&oy>0){
            if(ox/DX<oy/DY){const s=dx===0?1:Math.sign(dx),v=(ox+1)*.26*s;fx[i]-=v;fx[j]+=v}
            else{const s=dy===0?1:Math.sign(dy),v=(oy+1)*.26*s;fy[i]-=v;fy[j]+=v}
          }
        });
        points.forEach((p,i)=>{
          p.vx=clamp((p.vx+fx[i]-p.x*.0007)*.72,-35,35);
          p.vy=clamp((p.vy+fy[i]-p.y*.0007)*.72,-35,35);
          p.x+=p.vx;p.y+=p.vy;
        });
      }
    }
    // The final collision pass is independent of the springs. No card may overlap.
    if(!separate(points)){
      points.forEach((p,i)=>{p.x=(i%cols)*DX;p.y=Math.floor(i/cols)*DY});
    }
    const minX=Math.min(...points.map(p=>p.x)),minY=Math.min(...points.map(p=>p.y));
    points.forEach(p=>{p.x-=minX;p.y-=minY;delete p.vx;delete p.vy});
    return {nodes:points,width:Math.max(...points.map(p=>p.x))+NODE_W,height:Math.max(...points.map(p=>p.y))+NODE_H};
  }
  function layout(characters,relationships){
    const chars=(Array.isArray(characters)?characters:[]).map(c=>({id:String(c.id),name:String(c.name||'')})).sort(compare);
    if(!chars.length)return {width:0,height:0,nodes:[],nodeWidth:NODE_W,nodeHeight:NODE_H};
    const byId=new Map(chars.map(c=>[c.id,c]));const parent=new Map(chars.map(c=>[c.id,c.id]));
    const find=id=>{let p=parent.get(id);while(p!==parent.get(p)){parent.set(p,parent.get(parent.get(p)));p=parent.get(p)}return p};
    const join=(a,b)=>{a=find(a);b=find(b);if(a!==b)parent.set(a,b)};
    const edges=[],seen=new Set(),degree=new Map(chars.map(c=>[c.id,0]));
    for(const r of Array.isArray(relationships)?relationships:[]){
      const a=String(r.from),b=String(r.to);if(a===b||!byId.has(a)||!byId.has(b))continue;
      const key=[a,b].sort().join('\u0000');if(seen.has(key))continue;seen.add(key);
      edges.push({from:a,to:b});join(a,b);degree.set(a,degree.get(a)+1);degree.set(b,degree.get(b)+1);
    }
    const groups=new Map();chars.forEach(c=>{const key=find(c.id);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(c)});
    const components=[...groups.values()].sort((a,b)=>b.length-a.length||compare(a[0],b[0])).map(group=>{
      const ids=new Set(group.map(c=>c.id));return componentLayout(group,edges.filter(e=>ids.has(e.from)&&ids.has(e.to)),degree);
    });
    // Pack disconnected groups into separated rows, avoiding one giant orbit.
    const target=Math.max(1250,Math.min(6500,Math.sqrt(chars.length)*430));
    const result=[],PAD=90,SEP=130;let x=PAD,y=PAD,rowH=0,maxX=0;
    for(const c of components){
      if(x>PAD&&x+c.width>target){y+=rowH+SEP;x=PAD;rowH=0}
      c.nodes.forEach(p=>result.push({id:p.id,x:p.x+x+NODE_W/2,y:p.y+y+NODE_H/2}));
      maxX=Math.max(maxX,x+c.width);x+=c.width+SEP;rowH=Math.max(rowH,c.height);
    }
    return {width:Math.ceil(maxX+PAD),height:Math.ceil(y+rowH+PAD),nodes:result,nodeWidth:NODE_W,nodeHeight:NODE_H};
  }
  return {layout,NODE_W,NODE_H};
});
