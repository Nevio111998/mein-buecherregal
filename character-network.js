/* Mein Bücherregal V15.9 — Charakter- & Beziehungsnetz */
(function(){
  'use strict';
  const KEY='my_bookshelf_character_network_v1';
  const MAX_CHARACTERS=3000;
  const MAX_RELATIONSHIPS=6000;
  const ALL='__all__';
  const UNASSIGNED='__unassigned__';
  const REL_TYPES={ally:{label:'Verbündet',icon:'◆'},enemy:{label:'Feind',icon:'✦'},family:{label:'Familie',icon:'◇'},mentor:{label:'Mentor',icon:'☽'},rival:{label:'Rivale',icon:'⚔'},romance:{label:'Romance',icon:'♥'},oath:{label:'Eid / Schwur',icon:'✧'},faction:{label:'Fraktion',icon:'⚑'},unknown:{label:'Unklar',icon:'?'}};
  const REL_ORDER=['ally','enemy','family','mentor','rival','romance','oath','faction','unknown'];
  let state=load();
  let activeSeries='';
  let editingCharacterId='';
  let editingRelationshipId='';

  const el=id=>document.getElementById(id);
  const clone=x=>JSON.parse(JSON.stringify(x));
  const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const safeEsc=s=>typeof esc==='function'?esc(s):escapeHtml(s);
  const iso=()=>new Date().toISOString();
  const newId=()=>crypto.randomUUID?crypto.randomUUID():String(Date.now())+Math.random().toString(16).slice(2);
  const normalize=s=>typeof normalizeForSort==='function'?normalizeForSort(s):String(s||'').trim().toLowerCase();
  function tagsFromText(s){return String(s||'').split(',').map(x=>x.trim()).filter(Boolean).slice(0,18)}
  function findBook(id){try{return (books||[]).find(b=>String(b.id)===String(id))||null}catch{return null}}
  function bookSeries(book){return String(book?.series||'').trim()}
  function seriesFromInput(input){
    if(input && typeof input==='object' && !Array.isArray(input) && input.series) return String(input.series).trim();
    if(typeof input==='string'){
      const b=findBook(input);
      if(b?.series) return String(b.series).trim();
      if(seriesOptions().some(s=>s.value===input)) return input;
    }
    return '';
  }
  function validSeriesLabel(s){return s===UNASSIGNED?'Noch zuordnen':String(s||'Ohne Reihe')}
  function currentSeries(){ensureSelection();return activeSeries}
  function seriesBookList(series){return (books||[]).filter(b=>b.status!=='wishlist' && String(b.series||'').trim()===series).sort((a,b)=>normalize(a.volume||a.title).localeCompare(normalize(b.volume||b.title),'de'))}

  function seriesOptions(){
    const map=new Map();
    try{(books||[]).forEach(b=>{const s=String(b.series||'').trim();if(s&&b.status!=='wishlist')map.set(normalize(s),s)})}catch{}
    state.characters.forEach(c=>{if(c.series&&c.series!==UNASSIGNED)map.set(normalize(c.series),c.series)});
    state.relationships.forEach(r=>{if(r.series&&r.series!==UNASSIGNED)map.set(normalize(r.series),r.series)});
    const arr=[...map.values()].sort((a,b)=>normalize(a).localeCompare(normalize(b),'de'));
    if(state.characters.some(c=>!c.series||c.series===UNASSIGNED)||state.relationships.some(r=>!r.series||r.series===UNASSIGNED))arr.push(UNASSIGNED);
    return arr.map(s=>({value:s,label:validSeriesLabel(s)}));
  }
  function ensureSelection(){const options=seriesOptions();if(!options.length){activeSeries='';return}if(!activeSeries||!options.some(o=>o.value===activeSeries))activeSeries=options[0].value}
  function charactersFor(series=currentSeries()){return state.characters.filter(c=>String(c.series||UNASSIGNED)===String(series)).sort((a,b)=>{const fa=normalize(a.faction||'zzz'),fb=normalize(b.faction||'zzz');if(fa!==fb)return fa.localeCompare(fb,'de');return normalize(a.name).localeCompare(normalize(b.name),'de')})}
  function relationshipsFor(series=currentSeries()){const ids=new Set(charactersFor(series).map(c=>c.id));return state.relationships.filter(r=>String(r.series||UNASSIGNED)===String(series)&&ids.has(r.from)&&ids.has(r.to))}

  function normalizeCharacter(raw){
    if(!raw||typeof raw!=='object'||Array.isArray(raw))return null;
    const name=String(raw.name||raw.title||'').trim().slice(0,180);
    const series=String(raw.series||UNASSIGNED).trim()||UNASSIGNED;
    const role=String(raw.role||'').trim().slice(0,220);
    const faction=String(raw.faction||'').trim().slice(0,180);
    const status=['alive','dead','unknown','missing','other'].includes(raw.status)?raw.status:'unknown';
    const importance=['normal','important','legendary'].includes(raw.importance)?raw.importance:'normal';
    const notes=String(raw.notes||'').trim().slice(0,12000);
    const tags=Array.isArray(raw.tags)?raw.tags.map(x=>String(x).trim()).filter(Boolean).slice(0,18):tagsFromText(raw.tags);
    const spoiler=!!raw.spoiler;
    if(!name&&!role&&!faction&&!notes&&!tags.length)return null;
    return {id:String(raw.id||newId()),series,name:name||'Unbenannte Figur',role,faction,status,importance,notes,tags,spoiler,createdAt:String(raw.createdAt||iso()),updatedAt:String(raw.updatedAt||iso())};
  }
  function normalizeRelationship(raw,charsById){
    if(!raw||typeof raw!=='object'||Array.isArray(raw))return null;
    const from=String(raw.from||raw.source||'').trim(),to=String(raw.to||raw.target||'').trim();
    if(!from||!to||from===to)return null;
    if(charsById && (!charsById.has(from)||!charsById.has(to)))return null;
    const type=REL_ORDER.includes(raw.type)?raw.type:'unknown';
    const series=String(raw.series||charsById?.get(from)?.series||charsById?.get(to)?.series||UNASSIGNED).trim()||UNASSIGNED;
    const label=String(raw.label||'').trim().slice(0,160);
    const notes=String(raw.notes||'').trim().slice(0,12000);
    const strength=Math.max(1,Math.min(5,Number(raw.strength)||3));
    const spoiler=!!raw.spoiler;
    return {id:String(raw.id||newId()),series,from,to,type,label,notes,strength,spoiler,createdAt:String(raw.createdAt||iso()),updatedAt:String(raw.updatedAt||iso())};
  }
  function normalizeState(value){
    const raw=value&&typeof value==='object'&&!Array.isArray(value)?value:{};
    const charRaw=Array.isArray(raw.characters)?raw.characters:[];
    const relRaw=Array.isArray(raw.relationships)?raw.relationships:[];
    if(charRaw.length>MAX_CHARACTERS)throw new Error('Zu viele Charaktere im Charakter-Netz.');
    if(relRaw.length>MAX_RELATIONSHIPS)throw new Error('Zu viele Beziehungen im Charakter-Netz.');
    const ids=new Set(),characters=[];
    charRaw.forEach(raw=>{const c=normalizeCharacter(raw);if(!c)return;while(ids.has(c.id))c.id=newId();ids.add(c.id);characters.push(c)});
    const byId=new Map(characters.map(c=>[c.id,c]));
    const relIds=new Set(),relationships=[];
    relRaw.forEach(raw=>{const r=normalizeRelationship(raw,byId);if(!r)return;while(relIds.has(r.id))r.id=newId();relIds.add(r.id);relationships.push(r)});
    return {characters,relationships};
  }
  function load(){try{return normalizeState(JSON.parse(localStorage.getItem(KEY)||'{}'))}catch(e){console.warn('Charakter-Netz konnte nicht geladen werden.',e);return {characters:[],relationships:[]}}}
  function save(){try{localStorage.setItem(KEY,JSON.stringify(state))}catch(e){alert('Charakter-Netz konnte nicht gespeichert werden. Bitte erstelle ein Backup und prüfe den Speicher.');throw e}if(typeof markLibraryChanged==='function')markLibraryChanged();render()}
  function backup(){return clone(state)}
  function memorySnapshot(){return clone(state)}
  function normalizeBackup(value){return normalizeState(value)}
  function applyImported(snapshot){state=normalizeState(snapshot);render()}
  function restoreMemory(snapshot){state=normalizeState(snapshot);render()}
  function planImport(data,mode){
    if(!data.hasCharacterNetwork){return mode==='replace'?clone(state):clone(state)}
    const incoming=normalizeState(data.characterNetwork);
    if(mode==='replace')return incoming;
    const result=clone(state);const charIds=new Map(result.characters.map(c=>[c.id,c]));
    const charKey=c=>`${normalize(c.series)}|${normalize(c.name)}`;
    const byKey=new Map(result.characters.map(c=>[charKey(c),c]));
    const idMap=new Map();
    incoming.characters.forEach(c=>{let add={...c};const hit=byKey.get(charKey(c));if(hit){idMap.set(c.id,hit.id);return}while(charIds.has(add.id))add.id=newId();idMap.set(c.id,add.id);result.characters.push(add);charIds.set(add.id,add);byKey.set(charKey(add),add)});
    const relIds=new Set(result.relationships.map(r=>r.id));
    const relKey=r=>`${r.series}|${idMap.get(r.from)||r.from}|${idMap.get(r.to)||r.to}|${r.type}|${normalize(r.label)}`;
    const relKeys=new Set(result.relationships.map(relKey));
    incoming.relationships.forEach(r=>{const add={...r,from:idMap.get(r.from)||r.from,to:idMap.get(r.to)||r.to};const k=relKey(add);if(relKeys.has(k))return;while(relIds.has(add.id))add.id=newId();result.relationships.push(add);relIds.add(add.id);relKeys.add(k)});
    if(result.characters.length>MAX_CHARACTERS||result.relationships.length>MAX_RELATIONSHIPS)throw new Error('Zu viele Einträge nach dem Zusammenführen des Charakter-Netzes.');
    return normalizeState(result);
  }

  function ensureUi(){
    if(el('cnDialog'))return;
    document.body.insertAdjacentHTML('beforeend',`
      <dialog id="cnDialog" class="cn-dialog" aria-labelledby="cnHeading">
        <div class="modal-head cn-topbar"><h2 id="cnHeading">♞ Charakter- & Beziehungsnetz</h2><button type="button" class="icon-btn" id="cnClose" aria-label="Charakter-Netz schliessen">×</button></div>
        <div class="modal-body cn-body">
          <div class="cn-hero"><div><div class="cn-kicker">DEIN PRIVATES FIGUREN-NETZ</div><h3>Wer steht zu wem?</h3><p>Erfasse Figuren pro Reihe, verbinde sie als Verbündete, Feinde, Familie, Rivalen oder Fraktionen und behalte komplexe Fantasy-Welten im Griff — ohne externe Spoiler.</p></div><span class="cn-hero-mark" aria-hidden="true">♞</span></div>
          <div class="cn-toolbar"><label class="cn-field"><span>Reihe</span><select id="cnSeriesSelect"></select></label><button class="btn secondary" type="button" id="cnImportChronik">Aus Chronik übernehmen</button><button class="btn primary" type="button" id="cnNewCharacter">＋ Figur</button><button class="btn primary" type="button" id="cnNewRelation">＋ Beziehung</button></div>
          <div class="cn-context" id="cnContext"></div>
          <div class="cn-stats" id="cnStats"></div>
          <div class="cn-board"><div class="cn-canvas" id="cnCanvas"></div><div class="cn-side"><section class="cn-panel"><h4>Figuren</h4><div class="cn-list" id="cnCharacters"></div></section><section class="cn-panel"><h4>Beziehungen</h4><div class="cn-list" id="cnRelationships"></div></section></div></div>
        </div>
      </dialog>
      <dialog id="cnCharacterDialog" class="cn-entry-dialog" aria-labelledby="cnCharacterHeading"><div class="modal-head cn-topbar"><h2 id="cnCharacterHeading">Figur</h2><button type="button" class="icon-btn" id="cnCharacterClose" aria-label="Figur schliessen">×</button></div><div class="modal-body cn-entry-body"><form id="cnCharacterForm"><div class="cn-form-grid"><label class="cn-field cn-full"><span>Reihe</span><select id="cnCharacterSeries" required></select></label><label class="cn-field"><span>Name</span><input id="cnCharacterName" maxlength="180" required placeholder="z. B. Havald, Darrow, Kvothe"></label><label class="cn-field"><span>Fraktion / Gruppe</span><input id="cnCharacterFaction" maxlength="180" placeholder="z. B. Armee, Haus, Orden"></label><label class="cn-field"><span>Rolle</span><input id="cnCharacterRole" maxlength="220" placeholder="z. B. Protagonist, Mentor, Antagonist"></label><label class="cn-field"><span>Status</span><select id="cnCharacterStatus"><option value="unknown">Unbekannt</option><option value="alive">Lebt</option><option value="dead">Tot</option><option value="missing">Vermisst</option><option value="other">Anders / unklar</option></select></label><label class="cn-field"><span>Wichtigkeit</span><select id="cnCharacterImportance"><option value="normal">Normal</option><option value="important">Wichtig</option><option value="legendary">Legendär</option></select></label><label class="cn-field cn-full"><span>Notizen</span><textarea id="cnCharacterNotes" rows="5" maxlength="12000" placeholder="Was willst du über die Figur behalten?"></textarea></label><label class="cn-field cn-full"><span>Tags</span><input id="cnCharacterTags" maxlength="500" placeholder="Krieger, Magie, Spoiler, Lieblingsfigur …"></label><label class="cn-check cn-full"><input id="cnCharacterSpoiler" type="checkbox"><span>Spoiler markieren</span></label></div><div class="cn-actions"><button class="btn danger" id="cnCharacterDelete" type="button">Figur löschen</button><div><button class="btn secondary" id="cnCharacterCancel" type="button">Abbrechen</button><button class="btn primary" type="submit">Figur speichern</button></div></div><div class="cn-status" id="cnCharacterStatusText" role="status"></div></form></div></dialog>
      <dialog id="cnRelationshipDialog" class="cn-entry-dialog" aria-labelledby="cnRelationshipHeading"><div class="modal-head cn-topbar"><h2 id="cnRelationshipHeading">Beziehung</h2><button type="button" class="icon-btn" id="cnRelationshipClose" aria-label="Beziehung schliessen">×</button></div><div class="modal-body cn-entry-body"><form id="cnRelationshipForm"><div id="cnRelWarning"></div><div class="cn-form-grid"><label class="cn-field cn-full"><span>Reihe</span><select id="cnRelationshipSeries" required></select></label><label class="cn-field"><span>Von</span><select id="cnRelationshipFrom" required></select></label><label class="cn-field"><span>Zu</span><select id="cnRelationshipTo" required></select></label><label class="cn-field"><span>Typ</span><select id="cnRelationshipType">${REL_ORDER.map(t=>`<option value="${t}">${REL_TYPES[t].icon} ${REL_TYPES[t].label}</option>`).join('')}</select></label><label class="cn-field"><span>Stärke</span><select id="cnRelationshipStrength"><option value="1">1 · schwach</option><option value="2">2</option><option value="3">3 · mittel</option><option value="4">4</option><option value="5">5 · stark</option></select></label><label class="cn-field cn-full"><span>Label / Kurzbeschreibung</span><input id="cnRelationshipLabel" maxlength="160" placeholder="z. B. Mentor, Blutsfeind, geheimer Verbündeter"></label><label class="cn-field cn-full"><span>Notizen</span><textarea id="cnRelationshipNotes" rows="5" maxlength="12000" placeholder="Was macht diese Verbindung wichtig?"></textarea></label><label class="cn-check cn-full"><input id="cnRelationshipSpoiler" type="checkbox"><span>Spoiler markieren</span></label></div><div class="cn-actions"><button class="btn danger" id="cnRelationshipDelete" type="button">Beziehung löschen</button><div><button class="btn secondary" id="cnRelationshipCancel" type="button">Abbrechen</button><button class="btn primary" type="submit">Beziehung speichern</button></div></div><div class="cn-status" id="cnRelationshipStatusText" role="status"></div></form></div></dialog>`);
    el('cnClose').addEventListener('click',close);el('cnDialog').addEventListener('cancel',e=>{e.preventDefault();close()});
    el('cnSeriesSelect').addEventListener('change',()=>{activeSeries=el('cnSeriesSelect').value;render()});
    el('cnNewCharacter').addEventListener('click',()=>openCharacter());el('cnNewRelation').addEventListener('click',()=>openRelationship());el('cnImportChronik').addEventListener('click',importFromWorldbuilding);
    el('cnCanvas').addEventListener('click',e=>{const n=e.target.closest('[data-cn-character]');if(n)openCharacter(n.dataset.cnCharacter)});
    el('cnCharacters').addEventListener('click',e=>{const b=e.target.closest('[data-cn-edit-character]');if(b)openCharacter(b.dataset.cnEditCharacter)});
    el('cnRelationships').addEventListener('click',e=>{const b=e.target.closest('[data-cn-edit-relationship]');if(b)openRelationship(b.dataset.cnEditRelationship)});
    el('cnCharacterClose').addEventListener('click',closeCharacter);el('cnCharacterCancel').addEventListener('click',closeCharacter);el('cnCharacterDialog').addEventListener('cancel',e=>{e.preventDefault();closeCharacter()});el('cnCharacterForm').addEventListener('submit',saveCharacter);el('cnCharacterDelete').addEventListener('click',deleteCharacter);
    el('cnRelationshipClose').addEventListener('click',closeRelationship);el('cnRelationshipCancel').addEventListener('click',closeRelationship);el('cnRelationshipDialog').addEventListener('cancel',e=>{e.preventDefault();closeRelationship()});el('cnRelationshipForm').addEventListener('submit',saveRelationship);el('cnRelationshipDelete').addEventListener('click',deleteRelationship);el('cnRelationshipSeries').addEventListener('change',()=>fillRelationshipPeople('', ''));
    const top=el('characterNetworkBtn');if(top)top.addEventListener('click',()=>open());
  }
  function seriesSelectHtml(selected=activeSeries){const options=seriesOptions();return options.map(o=>`<option value="${safeEsc(o.value)}" ${o.value===selected?'selected':''}>${safeEsc(o.label)}</option>`).join('')}
  function relationOptionsHtml(selected='unknown'){return REL_ORDER.map(t=>`<option value="${t}" ${t===selected?'selected':''}>${REL_TYPES[t].icon} ${REL_TYPES[t].label}</option>`).join('')}
  function render(){
    if(!el('cnDialog'))return;ensureSelection();
    const options=seriesOptions();el('cnSeriesSelect').innerHTML=options.length?seriesSelectHtml(activeSeries):'<option value="">Noch keine Reihen vorhanden</option>';el('cnSeriesSelect').value=activeSeries;
    const chars=charactersFor(activeSeries),rels=relationshipsFor(activeSeries),factions=new Set(chars.map(c=>c.faction).filter(Boolean));
    const bookCount=seriesBookList(activeSeries).length;
    el('cnContext').innerHTML=activeSeries?`<div><h4>${safeEsc(validSeriesLabel(activeSeries))}</h4><p>${bookCount?`${bookCount} Bücher in dieser Reihe · `:''}${chars.length} Figuren · ${rels.length} Beziehungen</p></div><div>${chars.length<2?'<span class="cn-relation-chip">Für Beziehungen brauchst du mindestens 2 Figuren</span>':'<span class="cn-relation-chip">Netz bereit</span>'}</div>`:'<div><h4>Keine Reihe vorhanden</h4><p>Lege zuerst Bücher mit Reihen-Namen an.</p></div>';
    el('cnStats').innerHTML=`<div><strong>${chars.length}</strong><span>Figuren</span></div><div><strong>${rels.length}</strong><span>Beziehungen</span></div><div><strong>${factions.size}</strong><span>Fraktionen</span></div><div><strong>${chars.filter(c=>c.importance==='legendary').length}</strong><span>Legendär</span></div>`;
    renderCanvas(chars,rels);renderCharacters(chars);renderRelationships(chars,rels);
  }
  function renderCanvas(chars,rels){
    const box=el('cnCanvas');if(!chars.length){box.innerHTML='<div class="cn-empty" style="position:absolute;inset:18px;display:flex;align-items:center;justify-content:center">Noch keine Figuren in dieser Reihe. Erstelle zuerst eine Figur oder übernimm Charaktere aus der Reihen-Chronik.</div>';return}
    const W=1000,H=560,cx=W/2,cy=H/2,r=Math.min(W,H)*0.34;
    const pos=new Map();chars.forEach((c,i)=>{let x,y;if(chars.length===1){x=cx;y=cy}else{const a=-Math.PI/2+(i/chars.length)*Math.PI*2;x=cx+Math.cos(a)*r;y=cy+Math.sin(a)*r}pos.set(c.id,{x,y})});
    const edges=rels.map(rel=>{const a=pos.get(rel.from),b=pos.get(rel.to);if(!a||!b)return '';const mx=(a.x+b.x)/2,my=(a.y+b.y)/2;const label=rel.label||REL_TYPES[rel.type]?.label||'';return `<g><line class="cn-edge ${safeEsc(rel.type)}" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" style="stroke-width:${1.4+Number(rel.strength||3)*.55}"></line>${label?`<text class="cn-edge-label" x="${mx}" y="${my-6}" text-anchor="middle">${safeEsc(label.slice(0,22))}</text>`:''}</g>`}).join('');
    const nodes=chars.map(c=>{const p=pos.get(c.id);return `<button class="cn-node ${c.importance==='legendary'?'legendary':''}" data-cn-character="${safeEsc(c.id)}" style="left:${p.x/W*100}%;top:${p.y/H*100}%"><span class="cn-avatar">${c.importance==='legendary'?'♛':'♞'}</span><strong>${safeEsc(c.name)}</strong><small>${safeEsc(c.faction||c.role||'Figur')}</small></button>`}).join('');
    box.innerHTML=`<svg class="cn-canvas-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">${edges}</svg>${nodes}`;
  }
  function renderCharacters(chars){
    el('cnCharacters').innerHTML=chars.length?chars.map(c=>`<article class="cn-card"><div class="cn-card-head"><div><div class="cn-card-title">${safeEsc(c.name)}</div><div class="cn-card-meta">${safeEsc([c.role,c.faction,statusLabel(c.status),c.importance==='legendary'?'Legendär':c.importance==='important'?'Wichtig':''].filter(Boolean).join(' · '))}</div></div><button class="cn-mini" type="button" data-cn-edit-character="${safeEsc(c.id)}">Bearbeiten</button></div>${c.notes?`<div class="cn-card-notes">${safeEsc(c.notes)}</div>`:''}</article>`).join(''):'<div class="cn-empty">Noch keine Figuren. Tipp: Übernimm zuerst Charaktere aus der Reihen-Chronik oder lege manuell Figuren an.</div>';
  }
  function renderRelationships(chars,rels){
    const byId=new Map(chars.map(c=>[c.id,c]));
    el('cnRelationships').innerHTML=rels.length?rels.map(r=>`<article class="cn-card"><div class="cn-card-head"><div><div class="cn-card-title">${safeEsc(byId.get(r.from)?.name||'Unbekannt')} ↔ ${safeEsc(byId.get(r.to)?.name||'Unbekannt')}</div><div class="cn-card-meta"><span class="cn-relation-chip">${safeEsc(REL_TYPES[r.type]?.icon||'')} ${safeEsc(REL_TYPES[r.type]?.label||'Beziehung')}</span>${r.label?` · ${safeEsc(r.label)}`:''} · Stärke ${safeEsc(r.strength)}</div></div><button class="cn-mini" type="button" data-cn-edit-relationship="${safeEsc(r.id)}">Bearbeiten</button></div>${r.notes?`<div class="cn-card-notes">${safeEsc(r.notes)}</div>`:''}</article>`).join(''):'<div class="cn-empty">Noch keine Beziehungen. Lege mindestens zwei Figuren an und verbinde sie dann miteinander.</div>';
  }
  function statusLabel(s){return {alive:'Lebt',dead:'Tot',unknown:'Unbekannt',missing:'Vermisst',other:'Anders / unklar'}[s]||'Unbekannt'}
  function open(input=''){
    ensureUi();const s=seriesFromInput(input);if(s)activeSeries=s;ensureSelection();render();if(!el('cnDialog').open)el('cnDialog').showModal();el('cnSeriesSelect').focus({preventScroll:true});
  }
  function close(){if(el('cnDialog')?.open)el('cnDialog').close()}
  function fillCharacterForm(c=null){el('cnCharacterSeries').innerHTML=seriesSelectHtml(c?.series||activeSeries);el('cnCharacterSeries').value=c?.series||activeSeries;el('cnCharacterName').value=c?.name||'';el('cnCharacterFaction').value=c?.faction||'';el('cnCharacterRole').value=c?.role||'';el('cnCharacterStatus').value=c?.status||'unknown';el('cnCharacterImportance').value=c?.importance||'normal';el('cnCharacterNotes').value=c?.notes||'';el('cnCharacterTags').value=(c?.tags||[]).join(', ');el('cnCharacterSpoiler').checked=!!c?.spoiler;el('cnCharacterDelete').hidden=!c;el('cnCharacterStatusText').textContent=''}
  function openCharacter(id=''){ensureUi();editingCharacterId=String(id||'');const c=state.characters.find(x=>x.id===editingCharacterId)||null;el('cnCharacterHeading').textContent=c?'Figur bearbeiten':'Neue Figur';fillCharacterForm(c);el('cnCharacterDialog').showModal();el('cnCharacterName').focus({preventScroll:true})}
  function closeCharacter(){if(el('cnCharacterDialog')?.open)el('cnCharacterDialog').close();editingCharacterId=''}
  function saveCharacter(ev){ev.preventDefault();const draft={id:editingCharacterId||newId(),series:el('cnCharacterSeries').value,name:el('cnCharacterName').value,role:el('cnCharacterRole').value,faction:el('cnCharacterFaction').value,status:el('cnCharacterStatus').value,importance:el('cnCharacterImportance').value,notes:el('cnCharacterNotes').value,tags:tagsFromText(el('cnCharacterTags').value),spoiler:el('cnCharacterSpoiler').checked,createdAt:editingCharacterId?(state.characters.find(x=>x.id===editingCharacterId)?.createdAt||iso()):iso(),updatedAt:iso()};const c=normalizeCharacter(draft);if(!c){el('cnCharacterStatusText').textContent='Bitte mindestens einen Namen oder eine Notiz eintragen.';return}const ix=state.characters.findIndex(x=>x.id===c.id);if(ix>=0)state.characters[ix]=c;else state.characters.push(c);activeSeries=c.series;save();closeCharacter()}
  function deleteCharacter(){if(!editingCharacterId)return;if(!confirm('Diese Figur löschen? Beziehungen dieser Figur werden ebenfalls entfernt.'))return;state.characters=state.characters.filter(c=>c.id!==editingCharacterId);state.relationships=state.relationships.filter(r=>r.from!==editingCharacterId&&r.to!==editingCharacterId);save();closeCharacter()}
  function fillRelationshipPeople(from='',to=''){
    const series=el('cnRelationshipSeries').value;const chars=charactersFor(series);const opts=chars.map(c=>`<option value="${safeEsc(c.id)}">${safeEsc(c.name)}${c.faction?' · '+safeEsc(c.faction):''}</option>`).join('');el('cnRelationshipFrom').innerHTML=opts;el('cnRelationshipTo').innerHTML=opts;el('cnRelationshipFrom').value=from&&chars.some(c=>c.id===from)?from:(chars[0]?.id||'');el('cnRelationshipTo').value=to&&chars.some(c=>c.id===to)?to:(chars[1]?.id||chars[0]?.id||'');el('cnRelWarning').innerHTML=chars.length<2?'<div class="cn-warning">Für eine Beziehung brauchst du mindestens zwei Figuren in dieser Reihe.</div>':''}
  function openRelationship(id=''){ensureUi();editingRelationshipId=String(id||'');const r=state.relationships.find(x=>x.id===editingRelationshipId)||null;el('cnRelationshipHeading').textContent=r?'Beziehung bearbeiten':'Neue Beziehung';el('cnRelationshipSeries').innerHTML=seriesSelectHtml(r?.series||activeSeries);el('cnRelationshipSeries').value=r?.series||activeSeries;fillRelationshipPeople(r?.from||'',r?.to||'');el('cnRelationshipType').innerHTML=relationOptionsHtml(r?.type||'ally');el('cnRelationshipType').value=r?.type||'ally';el('cnRelationshipStrength').value=String(r?.strength||3);el('cnRelationshipLabel').value=r?.label||'';el('cnRelationshipNotes').value=r?.notes||'';el('cnRelationshipSpoiler').checked=!!r?.spoiler;el('cnRelationshipDelete').hidden=!r;el('cnRelationshipStatusText').textContent='';el('cnRelationshipDialog').showModal();el('cnRelationshipFrom').focus({preventScroll:true})}
  function closeRelationship(){if(el('cnRelationshipDialog')?.open)el('cnRelationshipDialog').close();editingRelationshipId=''}
  function saveRelationship(ev){ev.preventDefault();const series=el('cnRelationshipSeries').value,from=el('cnRelationshipFrom').value,to=el('cnRelationshipTo').value;if(!from||!to||from===to){el('cnRelationshipStatusText').textContent='Bitte zwei unterschiedliche Figuren auswählen.';return}const draft={id:editingRelationshipId||newId(),series,from,to,type:el('cnRelationshipType').value,label:el('cnRelationshipLabel').value,notes:el('cnRelationshipNotes').value,strength:el('cnRelationshipStrength').value,spoiler:el('cnRelationshipSpoiler').checked,createdAt:editingRelationshipId?(state.relationships.find(x=>x.id===editingRelationshipId)?.createdAt||iso()):iso(),updatedAt:iso()};const byId=new Map(state.characters.map(c=>[c.id,c]));const r=normalizeRelationship(draft,byId);if(!r){el('cnRelationshipStatusText').textContent='Diese Beziehung ist ungültig.';return}const ix=state.relationships.findIndex(x=>x.id===r.id);if(ix>=0)state.relationships[ix]=r;else state.relationships.push(r);activeSeries=series;save();closeRelationship()}
  function deleteRelationship(){if(!editingRelationshipId)return;if(!confirm('Diese Beziehung löschen? Figuren bleiben erhalten.'))return;state.relationships=state.relationships.filter(r=>r.id!==editingRelationshipId);save();closeRelationship()}
  function importFromWorldbuilding(){
    if(!window.Worldbuilding?.backup){alert('Reihen-Chronik ist noch nicht geladen. Bitte Seite neu laden.');return}
    const wb=window.Worldbuilding.backup();const series=currentSeries();const candidates=(wb.entries||[]).filter(e=>e.type==='character'&&String(e.series||'')===String(series)&&String(e.title||'').trim());
    if(!candidates.length){alert('In dieser Reihe wurden keine Charakter-Einträge in der Reihen-Chronik gefunden.');return}
    const keys=new Set(state.characters.filter(c=>c.series===series).map(c=>normalize(c.name)));let added=0;
    candidates.forEach(e=>{const name=String(e.title||'').trim();const key=normalize(name);if(keys.has(key))return;state.characters.push(normalizeCharacter({series,name,role:'Aus Reihen-Chronik',notes:[e.body,e.notes].filter(Boolean).join('\n\n'),tags:e.tags||[],importance:e.importance||'normal',spoiler:e.spoiler}));keys.add(key);added++});
    if(!added){alert('Alle Charaktere aus der Chronik sind bereits im Netz vorhanden.');return}
    save();alert(`${added} Charakter${added===1?'':'e'} aus der Reihen-Chronik übernommen.`);
  }
  function countCharacters(){return state.characters.length}
  function countRelationships(){return state.relationships.length}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ensureUi);else ensureUi();
  window.CharacterNetwork={open,backup,normalizeBackup,planImport,applyImported,restoreMemory,memorySnapshot,countCharacters,countRelationships};
})();
