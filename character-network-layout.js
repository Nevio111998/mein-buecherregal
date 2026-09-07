/* Mein Bücherregal V15.9.2 — grouped, readable offline graph layout.
   Presentation only: this module never reads or writes the library. */
(function(root, factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.CharacterGraphLayout=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const NODE_W=166, NODE_H=100, GAP_X=92, GAP_Y=48;
  const DX=NODE_W+GAP_X, DY=NODE_H+GAP_Y;
  const GROUP_PAD_X=50, GROUP_PAD_Y=72, GROUP_GAP=98, TOP_PAD=96, PAGE_PAD=90;
  const label=x=>String(x||'').toLocaleLowerCase('de');
  const compare=(a,b)=>label(a.name).localeCompare(label(b.name),'de')||String(a.id).localeCompare(String(b.id));
  const clean=x=>String(x||'').trim();

  function bucketName(c){
    return clean(c.faction)||clean(c.role)||'Ohne Fraktion';
  }
  function degreeMap(chars,relationships){
    const ids=new Set(chars.map(c=>String(c.id)));
    const degree=new Map(chars.map(c=>[String(c.id),0]));
    const seen=new Set();
    for(const r of Array.isArray(relationships)?relationships:[]){
      const a=String(r.from),b=String(r.to);
      if(a===b||!ids.has(a)||!ids.has(b))continue;
      const key=[a,b].sort().join('\u0000');
      if(seen.has(key))continue;
      seen.add(key);
      degree.set(a,(degree.get(a)||0)+1);
      degree.set(b,(degree.get(b)||0)+1);
    }
    return degree;
  }
  function importanceWeight(c){
    return c.importance==='legendary'?3:c.importance==='important'?2:0;
  }

  function layout(characters,relationships){
    const chars=(Array.isArray(characters)?characters:[]).map(c=>({
      id:String(c.id),
      name:String(c.name||''),
      faction:String(c.faction||''),
      role:String(c.role||''),
      importance:String(c.importance||'normal')
    })).sort(compare);

    if(!chars.length)return {width:0,height:0,nodes:[],groups:[],nodeWidth:NODE_W,nodeHeight:NODE_H};

    const degree=degreeMap(chars,relationships);
    const buckets=new Map();
    for(const c of chars){
      const key=bucketName(c);
      if(!buckets.has(key))buckets.set(key,[]);
      buckets.get(key).push(c);
    }

    const groups=[...buckets.entries()].sort((a,b)=>{
      if(a[0]==='Ohne Fraktion'&&b[0]!=='Ohne Fraktion')return 1;
      if(b[0]==='Ohne Fraktion'&&a[0]!=='Ohne Fraktion')return -1;
      return b[1].length-a[1].length||label(a[0]).localeCompare(label(b[0]),'de');
    });

    const n=chars.length;
    const maxRows=Math.max(2,Math.min(8,Math.ceil(Math.sqrt(n*1.1))));
    const nodes=[];
    const boxes=[];
    let cursorX=PAGE_PAD,maxBottom=0;

    for(const [groupName,listRaw] of groups){
      const list=listRaw.slice().sort((a,b)=>
        (degree.get(b.id)||0)-(degree.get(a.id)||0) ||
        importanceWeight(b)-importanceWeight(a) ||
        compare(a,b)
      );

      const cols=Math.max(1,Math.ceil(list.length/maxRows));
      const rows=Math.ceil(list.length/cols);
      const boxW=GROUP_PAD_X*2 + cols*DX - GAP_X;
      const boxH=GROUP_PAD_Y + rows*DY - GAP_Y + NODE_H + 42;
      const boxX=cursorX;
      const boxY=PAGE_PAD;

      list.forEach((c,i)=>{
        const col=Math.floor(i/rows);
        const row=i%rows;
        nodes.push({
          id:c.id,
          x:boxX+GROUP_PAD_X+col*DX,
          y:boxY+GROUP_PAD_Y+row*DY
        });
      });

      boxes.push({
        label:groupName,
        count:list.length,
        x:boxX,
        y:boxY,
        width:boxW,
        height:boxH
      });

      cursorX+=boxW+GROUP_GAP;
      maxBottom=Math.max(maxBottom,boxY+boxH);
    }

    // If there are too many groups, pack them into two visible rows instead of one endless strip.
    const totalW=cursorX-GROUP_GAP+PAGE_PAD;
    if(groups.length>=7 || totalW>5600){
      nodes.length=0;boxes.length=0;cursorX=PAGE_PAD;let cursorY=PAGE_PAD;let rowH=0;let maxX=0;
      const targetW=Math.max(1500,Math.min(4300,Math.sqrt(n)*640));
      for(const [groupName,listRaw] of groups){
        const list=listRaw.slice().sort((a,b)=>
          (degree.get(b.id)||0)-(degree.get(a.id)||0) ||
          importanceWeight(b)-importanceWeight(a) ||
          compare(a,b)
        );
        const localRows=Math.max(2,Math.min(maxRows,Math.ceil(Math.sqrt(list.length*1.35))));
        const cols=Math.max(1,Math.ceil(list.length/localRows));
        const rows=Math.ceil(list.length/cols);
        const boxW=GROUP_PAD_X*2 + cols*DX - GAP_X;
        const boxH=GROUP_PAD_Y + rows*DY - GAP_Y + NODE_H + 42;
        if(cursorX>PAGE_PAD && cursorX+boxW>targetW){
          cursorY+=rowH+GROUP_GAP;
          cursorX=PAGE_PAD;
          rowH=0;
        }
        list.forEach((c,i)=>{
          const col=Math.floor(i/rows);
          const row=i%rows;
          nodes.push({id:c.id,x:cursorX+GROUP_PAD_X+col*DX,y:cursorY+GROUP_PAD_Y+row*DY});
        });
        boxes.push({label:groupName,count:list.length,x:cursorX,y:cursorY,width:boxW,height:boxH});
        maxX=Math.max(maxX,cursorX+boxW);
        rowH=Math.max(rowH,boxH);
        cursorX+=boxW+GROUP_GAP;
      }
      return {width:Math.ceil(maxX+PAGE_PAD),height:Math.ceil(cursorY+rowH+PAGE_PAD),nodes,groups:boxes,nodeWidth:NODE_W,nodeHeight:NODE_H};
    }

    return {width:Math.ceil(totalW),height:Math.ceil(maxBottom+PAGE_PAD),nodes,groups:boxes,nodeWidth:NODE_W,nodeHeight:NODE_H};
  }

  return {layout,NODE_W,NODE_H};
});
