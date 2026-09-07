/* Mein Bücherregal V16 — pure, offline timeline data and import planning. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.WorldTimelineCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const MAX_ENTRIES=100000;
  const TYPES={event:'Ereignis',battle:'Schlacht',journey:'Reise',politics:'Bündnis & Politik',revelation:'Enthüllung',character:'Charakterereignis',magic:'Magie & Welt',other:'Sonstiges'};
  const ORDER=Object.keys(TYPES);
  const clean=x=>String(x??'').trim();
  const key=x=>clean(x).normalize('NFKC').toLocaleLowerCase('de').replace(/\s+/g,' ');
  const copy=x=>JSON.parse(JSON.stringify(x));
  const unique=items=>[...new Set(items)];
  const ident=b=>{if(!b)return '';const isbn=clean(b.isbn).replace(/[^0-9Xx]/g,'').toLowerCase();return isbn?'isbn:'+isbn:'book:'+key(b.title)+'|'+key(b.author)};
  const makeId=()=>typeof crypto!=='undefined'&&typeof crypto.randomUUID==='function'?crypto.randomUUID():'evt-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
  function str(value,max=100000){const s=String(value??'');if(s.length>max)throw new Error('Ein Textfeld ist zu lang. Bitte teile die Notiz auf.');return s}
  function normalizeEntry(raw,options={}){
    if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('Ein Ereignis ist ungültig.');
    const series=str(raw.series,500).trim();
    if(!series)throw new Error('Ein Ereignis hat keine Reihe.');
    const title=str(raw.title,500).trim();
    if(!title)throw new Error('Jedes Ereignis braucht einen Titel.');
    const refs=Array.isArray(raw.characterRefs)?raw.characterRefs:[];
    if(refs.length>3000)throw new Error('Zu viele Figurenverknüpfungen.');
    const seen=new Set(),characterRefs=[];
    for(const ref of refs){
      if(!ref||typeof ref!=='object')continue;
      const id=str(ref.id,300).trim();if(!id||seen.has(id))continue;seen.add(id);
      characterRefs.push({id,name:str(ref.name,500),series:str(ref.series||series,500)});
    }
    const tags=Array.isArray(raw.tags)?raw.tags:String(raw.tags||'').split(',');
    if(tags.length>1000)throw new Error('Zu viele Tags.');
    const createdAt=str(raw.createdAt||new Date().toISOString(),100);
    const sourceBookId=str(raw.sourceBookId||raw.bookId||'',300);
    const result={
      id:str(raw.id||(options.allowNewId?makeId():''),300).trim(),
      originId:str(raw.originId||raw.id||'',300).trim(),series,
      position:Number.isFinite(Number(raw.position))?Math.max(0,Math.floor(Number(raw.position))):0,
      type:ORDER.includes(raw.type)?raw.type:'event',title,
      body:str(raw.body,100000),notes:str(raw.notes,100000),
      storyDate:str(raw.storyDate,500),sourceBookId,
      sourceIdentity:str(raw.sourceIdentity,1000),sourceTitle:str(raw.sourceTitle,1000),
      sourceReference:str(raw.sourceReference,1000),place:str(raw.place,500),faction:str(raw.faction,500),
      characterRefs,tags:unique(tags.map(x=>str(x,500).trim()).filter(Boolean)),
      importance:['normal','important','legendary'].includes(raw.importance)?raw.importance:'normal',
      spoiler:!!raw.spoiler,createdAt,updatedAt:str(raw.updatedAt||createdAt,100)
    };
    if(!result.id)throw new Error('Ein Ereignis hat keine ID.');
    if(!result.originId)result.originId=result.id;
    return result;
  }
  function normalize(value){
    const raw=Array.isArray(value)?value:value?.entries;
    if(!Array.isArray(raw))throw new Error('Die Ereignis-Chronik muss eine Liste enthalten.');
    if(raw.length>MAX_ENTRIES)throw new Error('Das Backup enthält zu viele Ereignisse.');
    const seen=new Set(),entries=[];
    for(const item of raw){const e=normalizeEntry(item);if(seen.has(e.id))throw new Error('Doppelte Ereignis-ID im Backup.');seen.add(e.id);entries.push(e)}
    return {version:1,entries};
  }
  const sorted=(entries,series)=>entries.filter(e=>key(e.series)===key(series)).sort((a,b)=>a.position-b.position||a.createdAt.localeCompare(b.createdAt)||a.id.localeCompare(b.id));
  function compact(entries,series){sorted(entries,series).forEach((e,i)=>{e.position=i+1});return entries}
  function upsert(entries,entry,at){
    const next=copy(entries),e=normalizeEntry(entry),old=next.find(x=>x.id===e.id);
    if(old)next.splice(next.indexOf(old),1);
    const oldSeries=old?.series;
    if(oldSeries)compact(next,oldSeries);
    const same=sorted(next,e.series),index=Math.max(0,Math.min(same.length,Number.isFinite(Number(at))?Math.floor(Number(at))-1:same.length));
    same.splice(index,0,e);
    next.push(e);
    same.forEach((item,i)=>item.position=i+1);
    return normalize(next).entries;
  }
  function remove(entries,id){
    const old=entries.find(e=>e.id===id);if(!old)return copy(entries);
    const next=copy(entries).filter(e=>e.id!==id);compact(next,old.series);return next;
  }
  function move(entries,id,delta){
    const old=entries.find(e=>e.id===id);if(!old)return copy(entries);
    const next=copy(entries),list=sorted(next,old.series),i=list.findIndex(e=>e.id===id),j=Math.max(0,Math.min(list.length-1,i+delta));
    if(i===j)return next;
    const item=list.splice(i,1)[0];list.splice(j,0,item);list.forEach((e,k)=>e.position=k+1);return next;
  }
  function payload(e){const {id,originId,createdAt,updatedAt,...rest}=e;return JSON.stringify(rest)}
  function planImport(existing,data,mode,plan,networkPlan={},context={}){
    if(mode!=='replace'&&mode!=='merge')throw new Error('Unbekannter Importmodus.');
    const targetBooks=plan.books||[],targetIds=new Map(targetBooks.map(b=>[String(b.id),b]));
    const incomingBooks=data.books||[],currentBooks=context.books||[];
    const targetByIdentity=new Map();for(const b of targetBooks){const k=ident(b);if(k&&!targetByIdentity.has(k))targetByIdentity.set(k,String(b.id))}
    const currentNetwork=context.network||{characters:[]};
    const targetChars=networkPlan.characters||currentNetwork.characters||[];
    const targetCharIds=new Map(targetChars.map(c=>[String(c.id),c]));
    const charIdentity=new Map();for(const c of targetChars){const k=key(c.series)+'|'+key(c.name);if(!charIdentity.has(k))charIdentity.set(k,String(c.id))}
    const characterMap=networkPlan.characterIdMap||{};
    const mapOne=(e,sourceBooks)=>{
      const out=copy(e);
      const original=out.sourceBookId;
      if(original){
        const old=sourceBooks.find(b=>String(b.id)===original);
        const identity=out.sourceIdentity||ident(old);
        const mapped=String(plan.idMap?.get(original)||original);
        const candidate=targetIds.get(mapped);
        if(candidate&&identity&&ident(candidate)===identity)out.sourceBookId=mapped;
        else if(candidate&&plan.idMap?.has(original)&&!identity)out.sourceBookId=mapped;
        else out.sourceBookId=identity&&targetByIdentity.has(identity)?targetByIdentity.get(identity):'';
        out.sourceIdentity=identity;
        out.sourceTitle=out.sourceTitle||old?.title||'';
      }
      out.characterRefs=out.characterRefs.map(ref=>{
        const original=String(ref.id),mapped=String(characterMap[original]||original);
        const matching=targetCharIds.get(mapped);
        if(matching&&key(matching.series)===key(ref.series||out.series)&&(!ref.name||key(matching.name)===key(ref.name)))return {...ref,id:mapped,name:matching.name,series:matching.series};
        const identity=key(ref.series||out.series)+'|'+key(ref.name);
        const found=charIdentity.get(identity);
        if(found){const c=targetCharIds.get(found);return {...ref,id:found,name:c.name,series:c.series}}
        return {...ref,id:original}; // Retain historical names and missing links.
      });
      return out;
    };
    const current=normalize(existing).entries.map(e=>mapOne(e,currentBooks));
    if(!data.hasWorldTimeline)return {version:1,entries:current};
    const incoming=normalize(data.worldTimeline).entries.map(e=>mapOne(e,incomingBooks));
    if(mode==='replace')return {version:1,entries:incoming};
    const result=copy(current),byId=new Map(result.map(e=>[e.id,e]));
    const byOrigin=new Map();for(const e of result){const k=e.originId+'\0'+payload(e);byOrigin.set(k,e)}
    for(const original of incoming){
      let e=copy(original);
      if(byOrigin.has(e.originId+'\0'+payload(e)))continue;
      const hit=byId.get(e.id);
      if(hit){
        if(payload(hit)===payload(e))continue;
        do{e.id=makeId()}while(byId.has(e.id));
      }
      result.push(e);byId.set(e.id,e);byOrigin.set(e.originId+'\0'+payload(e),e);
    }
    if(result.length>MAX_ENTRIES)throw new Error('Zu viele Ereignisse nach dem Zusammenführen.');
    return normalize(result);
  }
  return {TYPES,ORDER,MAX_ENTRIES,key,ident,makeId,normalizeEntry,normalize,sorted,compact,upsert,remove,move,planImport};
});
