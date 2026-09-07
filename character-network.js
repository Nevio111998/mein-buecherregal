/* Mein Bücherregal V15.9.3 — Charakter- & Beziehungsnetz */
(function(){
  'use strict';
  const KEY='my_bookshelf_character_network_v1';
  const MAX_CHARACTERS=3000;
  const MAX_RELATIONSHIPS=6000;
  const ALL='__all__';
  const UNASSIGNED='__unassigned__';
  const REL_TYPES={ally:{label:'Verbündet',icon:'◆'},enemy:{label:'Feind',icon:'✦'},family:{label:'Familie',icon:'◇'},mentor:{label:'Mentor',icon:'☽'},rival:{label:'Rivale',icon:'⚔'},romance:{label:'Romance',icon:'♥'},oath:{label:'Eid / Schwur',icon:'✧'},faction:{label:'Fraktion',icon:'⚑'},unknown:{label:'Unklar',icon:'?'}};
  const REL_ORDER=['ally','enemy','family','mentor','rival','romance','oath','faction','unknown'];
  let activeSeries='';
  let editingCharacterId='';
  let editingRelationshipId='';
  // View state is deliberately separate from the library's stored characters.
  const graphView={mode:'atlas',lineMode:'focus',atlasQuery:'',atlasGroup:'all',atlasLimit:120,scale:1,x:0,y:0,autoFit:true,expanded:false,showLabels:false,neighborhood:false,selected:'',selectedRelation:'',series:'',layoutKey:'',layout:null,data:null,pointers:new Map(),gesture:null,dragged:false,dragDistance:0,suppressClickUntil:0,pendingInitial:false,resizeObserver:null};
  const GRAPH_MIN=.01,GRAPH_MAX=3;
  const graphClamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const graphSafeId=id=>String(id||'');


  const el=id=>document.getElementById(id);
  const clone=x=>JSON.parse(JSON.stringify(x));
  const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const safeEsc=s=>typeof esc==='function'?esc(s):escapeHtml(s);
  const iso=()=>new Date().toISOString();
  const newId=()=>crypto.randomUUID?crypto.randomUUID():String(Date.now())+Math.random().toString(16).slice(2);
  const normalize=s=>typeof normalizeForSort==='function'?normalizeForSort(s):String(s||'').trim().toLowerCase();
  let state=load();
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
    if(!data.hasCharacterNetwork){return {...clone(state),characterIdMap:Object.fromEntries(state.characters.map(c=>[c.id,c.id]))}}
    const incoming=normalizeState(data.characterNetwork);
    if(mode==='replace')return {...incoming,characterIdMap:Object.fromEntries(incoming.characters.map(c=>[c.id,c.id]))};
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
    return {...normalizeState(result),characterIdMap:Object.fromEntries(idMap)};
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
          <div class="cn-modebar" role="group" aria-label="Darstellung auswählen"><div class="cn-mode-switch"><button type="button" id="cnModeAtlas" aria-pressed="true">▦ Figuren-Atlas</button><button type="button" id="cnModeNetwork" aria-pressed="false">◇ Beziehungsnetz</button></div><p id="cnModeDescription">Deine Figuren, übersichtlich nach Fraktionen und Rollen sortiert.</p></div>
          <div class="cn-atlas" id="cnAtlas"><div class="cn-atlas-toolbar"><label class="cn-field"><span>Figuren suchen</span><input type="search" id="cnAtlasSearch" placeholder="Name, Rolle oder Fraktion …" autocomplete="off"></label><label class="cn-field"><span>Gruppe</span><select id="cnAtlasGroup"><option value="all">Alle Gruppen</option></select></label><button type="button" class="cn-mini" id="cnAtlasClear">Filter zurücksetzen</button></div><div id="cnAtlasSummary" class="cn-atlas-summary" aria-live="polite"></div><div id="cnAtlasGrid" class="cn-atlas-grid"></div><div id="cnAtlasMore" class="cn-atlas-more"></div></div>
          <div class="cn-view-tools" id="cnViewTools" aria-label="Netzansicht steuern">
            <label class="cn-field cn-focus-field"><span>Figur suchen / fokussieren</span><select id="cnFocusSelect" aria-label="Figur fokussieren"><option value="">Alle Figuren</option></select></label>
            <label class="cn-view-check"><input type="checkbox" id="cnNeighborhood"> Nur direktes Umfeld</label>
            <button type="button" class="cn-mini" id="cnShowWhole">Gesamtes Netz</button>
            <label class="cn-view-check"><input type="checkbox" id="cnAllLines"> Alle Linien</label>
            <label class="cn-view-check"><input type="checkbox" id="cnLabels"> Beziehungsnamen</label><span class="cn-density-hint" id="cnDensityHint" hidden>Bei vielen Linien zeigt die App Namen nur im Fokus.</span>
            <div class="cn-view-actions"><button type="button" class="cn-mini" id="cnZoomOut" aria-label="Verkleinern">−</button><label class="cn-zoom-field"><span>Zoom</span><input type="range" id="cnZoomRange" min="1" max="300" step="1" value="100" aria-label="Zoomstufe"></label><button type="button" class="cn-mini" id="cnZoomIn" aria-label="Vergrössern">＋</button><output id="cnZoomReadout" for="cnZoomRange">100 %</output><button type="button" class="cn-mini" id="cnFit">Einpassen</button><button type="button" class="cn-mini" id="cnOneToOne">1:1</button><button type="button" class="cn-mini" id="cnExpand" aria-pressed="false">⛶ Grossansicht</button></div>
          </div>
          <div class="cn-board"><div class="cn-graph-area" id="cnGraphArea"><div class="cn-canvas" id="cnCanvas"><div class="cn-viewport" id="cnViewport" tabindex="0" role="region" aria-label="Verschiebbares Charakter-Netz" aria-describedby="cnGraphHelp"><div class="cn-world" id="cnWorld"></div></div><div class="cn-pan-controls" aria-label="Netz verschieben"><button type="button" data-cn-pan="up" aria-label="Nach oben verschieben">↑</button><button type="button" data-cn-pan="left" aria-label="Nach links verschieben">←</button><button type="button" data-cn-pan="down" aria-label="Nach unten verschieben">↓</button><button type="button" data-cn-pan="right" aria-label="Nach rechts verschieben">→</button></div></div><p class="cn-graph-help" id="cnGraphHelp">Freie Fläche ziehen: verschieben · Mausrad oder zwei Finger: zoomen · Figur anklicken: Verbindungen hervorheben · Pfeiltasten: verschieben</p><div class="cn-inspector" id="cnInspector" aria-live="polite"></div></div><div class="cn-side"><section class="cn-panel"><h4>Figuren</h4><div class="cn-list" id="cnCharacters"></div></section><section class="cn-panel"><h4>Beziehungen</h4><div class="cn-list" id="cnRelationships"></div></section></div></div>
        </div>
      </dialog>
      <dialog id="cnCharacterDialog" class="cn-entry-dialog" aria-labelledby="cnCharacterHeading"><div class="modal-head cn-topbar"><h2 id="cnCharacterHeading">Figur</h2><button type="button" class="icon-btn" id="cnCharacterClose" aria-label="Figur schliessen">×</button></div><div class="modal-body cn-entry-body"><form id="cnCharacterForm"><div class="cn-form-grid"><label class="cn-field cn-full"><span>Reihe</span><select id="cnCharacterSeries" required></select></label><label class="cn-field"><span>Name</span><input id="cnCharacterName" maxlength="180" required placeholder="z. B. Havald, Darrow, Kvothe"></label><label class="cn-field"><span>Fraktion / Gruppe</span><input id="cnCharacterFaction" maxlength="180" placeholder="z. B. Armee, Haus, Orden"></label><label class="cn-field"><span>Rolle</span><input id="cnCharacterRole" maxlength="220" placeholder="z. B. Protagonist, Mentor, Antagonist"></label><label class="cn-field"><span>Status</span><select id="cnCharacterStatus"><option value="unknown">Unbekannt</option><option value="alive">Lebt</option><option value="dead">Tot</option><option value="missing">Vermisst</option><option value="other">Anders / unklar</option></select></label><label class="cn-field"><span>Wichtigkeit</span><select id="cnCharacterImportance"><option value="normal">Normal</option><option value="important">Wichtig</option><option value="legendary">Legendär</option></select></label><label class="cn-field cn-full"><span>Notizen</span><textarea id="cnCharacterNotes" rows="5" maxlength="12000" placeholder="Was willst du über die Figur behalten?"></textarea></label><label class="cn-field cn-full"><span>Tags</span><input id="cnCharacterTags" maxlength="500" placeholder="Krieger, Magie, Spoiler, Lieblingsfigur …"></label><label class="cn-check cn-full"><input id="cnCharacterSpoiler" type="checkbox"><span>Spoiler markieren</span></label></div><div class="cn-actions"><button class="btn danger" id="cnCharacterDelete" type="button">Figur löschen</button><div><button class="btn secondary" id="cnCharacterCancel" type="button">Abbrechen</button><button class="btn primary" type="submit">Figur speichern</button></div></div><div class="cn-status" id="cnCharacterStatusText" role="status"></div></form></div></dialog>
      <dialog id="cnRelationshipDialog" class="cn-entry-dialog" aria-labelledby="cnRelationshipHeading"><div class="modal-head cn-topbar"><h2 id="cnRelationshipHeading">Beziehung</h2><button type="button" class="icon-btn" id="cnRelationshipClose" aria-label="Beziehung schliessen">×</button></div><div class="modal-body cn-entry-body"><form id="cnRelationshipForm"><div id="cnRelWarning"></div><div class="cn-form-grid"><label class="cn-field cn-full"><span>Reihe</span><select id="cnRelationshipSeries" required></select></label><label class="cn-field"><span>Von</span><select id="cnRelationshipFrom" required></select></label><label class="cn-field"><span>Zu</span><select id="cnRelationshipTo" required></select></label><label class="cn-field"><span>Typ</span><select id="cnRelationshipType">${REL_ORDER.map(t=>`<option value="${t}">${REL_TYPES[t].icon} ${REL_TYPES[t].label}</option>`).join('')}</select></label><label class="cn-field"><span>Stärke</span><select id="cnRelationshipStrength"><option value="1">1 · schwach</option><option value="2">2</option><option value="3">3 · mittel</option><option value="4">4</option><option value="5">5 · stark</option></select></label><label class="cn-field cn-full"><span>Label / Kurzbeschreibung</span><input id="cnRelationshipLabel" maxlength="160" placeholder="z. B. Mentor, Blutsfeind, geheimer Verbündeter"></label><label class="cn-field cn-full"><span>Notizen</span><textarea id="cnRelationshipNotes" rows="5" maxlength="12000" placeholder="Was macht diese Verbindung wichtig?"></textarea></label><label class="cn-check cn-full"><input id="cnRelationshipSpoiler" type="checkbox"><span>Spoiler markieren</span></label></div><div class="cn-actions"><button class="btn danger" id="cnRelationshipDelete" type="button">Beziehung löschen</button><div><button class="btn secondary" id="cnRelationshipCancel" type="button">Abbrechen</button><button class="btn primary" type="submit">Beziehung speichern</button></div></div><div class="cn-status" id="cnRelationshipStatusText" role="status"></div></form></div></dialog>`);
    el('cnClose').addEventListener('click',close);el('cnDialog').addEventListener('cancel',e=>{e.preventDefault();close()});
    el('cnSeriesSelect').addEventListener('change',()=>{activeSeries=el('cnSeriesSelect').value;graphView.selected='';graphView.selectedRelation='';graphView.neighborhood=false;el('cnNeighborhood').checked=false;graphView.autoFit=true;graphView.atlasGroup='all';graphView.atlasQuery='';graphView.atlasLimit=120;if(el('cnAtlasSearch'))el('cnAtlasSearch').value='';render()});
    el('cnNewCharacter').addEventListener('click',()=>openCharacter());el('cnNewRelation').addEventListener('click',()=>openRelationship());el('cnImportChronik').addEventListener('click',importFromWorldbuilding);
    initGraphControls();
    el('cnModeAtlas').addEventListener('click',()=>setGraphMode('atlas'));
    el('cnModeNetwork').addEventListener('click',()=>setGraphMode('network'));
    el('cnAtlasSearch').addEventListener('input',e=>{graphView.atlasQuery=e.target.value;graphView.atlasLimit=120;renderAtlas(charactersFor(activeSeries),relationshipsFor(activeSeries))});
    el('cnAtlasGroup').addEventListener('change',e=>{graphView.atlasGroup=e.target.value;graphView.atlasLimit=120;renderAtlas(charactersFor(activeSeries),relationshipsFor(activeSeries))});
    el('cnAtlasClear').addEventListener('click',()=>{graphView.atlasQuery='';graphView.atlasGroup='all';graphView.atlasLimit=120;el('cnAtlasSearch').value='';renderAtlas(charactersFor(activeSeries),relationshipsFor(activeSeries))});
    el('cnAtlasGrid').addEventListener('click',e=>{const edit=e.target.closest('[data-cn-atlas-edit]');if(edit){openCharacter(edit.dataset.cnAtlasEdit);return}const focus=e.target.closest('[data-cn-atlas-focus]');if(focus)openNetworkFor(focus.dataset.cnAtlasFocus)});
    el('cnAtlasMore').addEventListener('click',e=>{if(e.target.closest('[data-cn-atlas-more]')){graphView.atlasLimit+=120;renderAtlas(charactersFor(activeSeries),relationshipsFor(activeSeries))}});
    el('cnCharacters').addEventListener('click',e=>{const b=e.target.closest('[data-cn-edit-character]');if(b)openCharacter(b.dataset.cnEditCharacter);const f=e.target.closest('[data-cn-focus-character]');if(f)selectGraphCharacter(f.dataset.cnFocusCharacter,true)});
    el('cnRelationships').addEventListener('click',e=>{const b=e.target.closest('[data-cn-edit-relationship]');if(b)openRelationship(b.dataset.cnEditRelationship);const f=e.target.closest('[data-cn-focus-relationship]');if(f)selectGraphRelationship(f.dataset.cnFocusRelationship,true)});
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
    if(graphView.series!==activeSeries){graphView.series=activeSeries;graphView.selected='';graphView.selectedRelation='';graphView.neighborhood=false;graphView.layoutKey='';graphView.autoFit=true;if(el('cnNeighborhood'))el('cnNeighborhood').checked=false}
    graphView.data={allChars:chars,allRels:rels,chars,rels};
    renderAtlas(chars,rels);
    if(graphView.mode==='network')renderCanvas(chars,rels);
    renderCharacters(chars);renderRelationships(chars,rels);
    updateGraphMode();
  }
  function renderAtlas(chars,rels){
    const layout=window.CharacterGraphLayout;
    if(!layout?.groups)return;
    const counts=new Map(chars.map(c=>[c.id,0]));
    rels.forEach(r=>{counts.set(r.from,(counts.get(r.from)||0)+1);counts.set(r.to,(counts.get(r.to)||0)+1)});
    const allGroups=layout.groups(chars,rels);
    const selectedGroup=graphView.atlasGroup;
    const groupOptions='<option value="all">Alle Gruppen</option>'+allGroups.map(g=>`<option value="${safeEsc(g.name)}">${safeEsc(g.name)} (${g.characters.length})</option>`).join('');
    if(el('cnAtlasGroup')){el('cnAtlasGroup').innerHTML=groupOptions;el('cnAtlasGroup').value=selectedGroup;}
    const q=graphView.atlasQuery.trim().toLocaleLowerCase('de');
    const groups=allGroups.map(g=>({...g,characters:g.characters.filter(c=>(selectedGroup==='all'||g.name===selectedGroup)&&(!q||[c.name,c.role,c.faction].join(' ').toLocaleLowerCase('de').includes(q)))})).filter(g=>g.characters.length);
    const total=groups.reduce((n,g)=>n+g.characters.length,0);
    let remaining=graphView.atlasLimit,shown=0;
    const html=groups.map((g,i)=>{
      if(remaining<=0)return '';
      const people=g.characters.slice(0,remaining);remaining-=people.length;shown+=people.length;
      return `<section class="cn-atlas-group"><header class="cn-atlas-group-head"><div class="cn-atlas-group-symbol" aria-hidden="true">${safeEsc(String(i+1).padStart(2,'0'))}</div><div class="cn-atlas-group-title"><span>FRAKTION / ROLLE</span><h4>${safeEsc(g.name)}</h4></div><span class="cn-atlas-group-count">${g.characters.length} ${g.characters.length===1?'Figur':'Figuren'}</span></header><div class="cn-atlas-people">${people.map(c=>{
        const connections=counts.get(c.id)||0;
        return `<article class="cn-atlas-person"><button type="button" class="cn-atlas-person-open" data-cn-atlas-focus="${safeEsc(c.id)}" title="${safeEsc(c.name)} im Beziehungsnetz anzeigen"><span class="cn-atlas-avatar ${c.importance==='legendary'?'is-legendary':''}" aria-hidden="true">${c.importance==='legendary'?'♛':safeEsc((c.name||'?').trim().charAt(0).toLocaleUpperCase('de'))}</span><span class="cn-atlas-person-content"><strong>${safeEsc(c.name)}</strong><small>${safeEsc(c.role||c.faction||'Figur')}</small><span class="cn-atlas-person-meta">${connections} ${connections===1?'Verbindung':'Verbindungen'}${c.importance==='legendary'?' · ✦ Legendär':''}${c.spoiler?' · Spoiler':''}</span></span><span class="cn-atlas-person-arrow" aria-hidden="true">↗</span></button><button type="button" class="cn-atlas-edit" data-cn-atlas-edit="${safeEsc(c.id)}" aria-label="${safeEsc(c.name)} bearbeiten">Bearbeiten</button></article>`;
      }).join('')}</div></section>`;
    }).join('');
    el('cnAtlasGrid').innerHTML=html||'<div class="cn-empty">Keine passenden Figuren. Ändere den Filter oder lege eine neue Figur an.</div>';
    el('cnAtlasSummary').textContent=`${total} ${total===1?'Figur':'Figuren'} in ${groups.length} ${groups.length===1?'Gruppe':'Gruppen'}${shown<total?' · '+shown+' angezeigt':''}`;
    el('cnAtlasMore').innerHTML=shown<total?`<button type="button" class="cn-mini" data-cn-atlas-more>Weitere Figuren anzeigen (${total-shown})</button>`:'';
  }
  function updateGraphMode(){
    const g=graphView,network=g.mode==='network';
    el('cnAtlas').hidden=network;el('cnGraphArea').hidden=!network;el('cnViewTools').hidden=!network;
    el('cnModeAtlas').setAttribute('aria-pressed',String(!network));el('cnModeNetwork').setAttribute('aria-pressed',String(network));
    el('cnModeDescription').textContent=network?'Wähle eine Figur, um ihre Beziehungen zu entdecken. Alle Linien kannst du bei Bedarf einblenden.':'Deine Figuren, übersichtlich nach Fraktionen und Rollen sortiert.';
  }
  function setGraphMode(mode){
    if(mode!=='atlas'&&mode!=='network')return;
    graphView.mode=mode;if(mode==='atlas'&&graphView.expanded){graphView.expanded=false;el('cnDialog').classList.remove('cn-expanded');el('cnExpand').textContent='⛶ Grossansicht';el('cnExpand').setAttribute('aria-pressed','false')}updateGraphMode();
    if(mode==='network'){
      const chars=charactersFor(activeSeries),rels=relationshipsFor(activeSeries);
      renderCanvas(chars,rels);
      requestAnimationFrame(()=>{if(graphView.pendingInitial||graphView.autoFit)graphInitialFit();else graphApplyCamera()});
    }
  }
  function openNetworkFor(id){
    const g=graphView;g.selected=String(id);g.selectedRelation='';g.neighborhood=true;g.autoFit=true;
    el('cnNeighborhood').checked=true;
    setGraphMode('network');
    requestAnimationFrame(()=>graphCenter(id,.85));
  }
  function graphNodeOptions(){
    const sel=el('cnFocusSelect');if(!sel)return;
    const chars=charactersFor(activeSeries);
    sel.innerHTML='<option value="">Alle Figuren</option>'+chars.map(c=>`<option value="${safeEsc(c.id)}">${safeEsc(c.name)}${c.faction?' · '+safeEsc(c.faction):''}</option>`).join('');
    sel.value=chars.some(c=>c.id===graphView.selected)?graphView.selected:'';
  }
  function graphVisible(chars,rels){
    if(!graphView.neighborhood||!graphView.selected||!chars.some(c=>c.id===graphView.selected))return {chars,rels};
    const ids=new Set([graphView.selected]);
    rels.forEach(r=>{if(r.from===graphView.selected)ids.add(r.to);if(r.to===graphView.selected)ids.add(r.from)});
    return {chars:chars.filter(c=>ids.has(c.id)),rels:rels.filter(r=>ids.has(r.from)&&ids.has(r.to))};
  }
  function graphLayoutKey(chars,rels){
    return activeSeries+'|'+chars.map(c=>[c.id,c.name,c.faction,c.role,c.importance].join('\u0001')).sort().join('\u0002')+'|'+rels.map(r=>[r.id,r.from,r.to,r.type,r.strength].join('\u0001')).sort().join('\u0002');
  }

  function graphViewportSize(){const r=el('cnViewport')?.getBoundingClientRect();return {w:r?.width||0,h:r?.height||0}}
  function graphClampCamera(){
    const g=graphView,l=g.layout;if(!l)return;
    const {w,h}=graphViewportSize();if(w<1||h<1)return;
    const bound=(v,world,screen)=>{
      const length=world*g.scale;
      if(length<=screen)return graphClamp(v,(screen-length)/2-110,(screen-length)/2+110);
      return graphClamp(v,screen-length-110,110);
    };
    g.x=bound(g.x,l.width,w);g.y=bound(g.y,l.height,h);
  }
  function graphApplyCamera(){
    const g=graphView,world=el('cnWorld');if(!world||!g.layout)return;
    graphClampCamera();world.style.transform=`translate3d(${g.x}px,${g.y}px,0) scale(${g.scale})`;
    const pct=Math.round(g.scale*100);
    if(el('cnZoomRange'))el('cnZoomRange').value=String(graphClamp(pct,1,300));
    if(el('cnZoomReadout'))el('cnZoomReadout').textContent=pct+' %';
  }
  function graphFit(){
    const g=graphView,l=g.layout;if(!l||!l.width)return;
    const {w,h}=graphViewportSize();if(w<1||h<1){g.autoFit=true;return}
    g.scale=graphClamp(Math.min((w-52)/l.width,(h-52)/l.height,1.15),GRAPH_MIN,GRAPH_MAX);
    g.x=(w-l.width*g.scale)/2;g.y=(h-l.height*g.scale)/2;g.autoFit=true;graphApplyCamera();
  }
  function graphInitialFit(){
    const g=graphView,{w,h}=graphViewportSize();
    if(!w||!h){g.pendingInitial=true;return}
    g.pendingInitial=false;graphFit();
    // Smaller networks start at a readable scale; Einpassen remains a true overview.
    if(g.data?.chars.length<=18&&g.scale<.68)graphZoom(.68);
  }
  function graphZoom(next,px,py){
    const g=graphView,l=g.layout;if(!l)return;
    const {w,h}=graphViewportSize();if(!w||!h)return;
    px=Number.isFinite(px)?px:w/2;py=Number.isFinite(py)?py:h/2;
    const wx=(px-g.x)/g.scale,wy=(py-g.y)/g.scale;
    g.scale=graphClamp(next,GRAPH_MIN,GRAPH_MAX);g.x=px-wx*g.scale;g.y=py-wy*g.scale;g.autoFit=false;graphApplyCamera();
  }
  function graphPan(dx,dy){graphView.x+=dx;graphView.y+=dy;graphView.autoFit=false;graphApplyCamera()}
  function graphCenter(id,minimumScale=1){
    const p=graphView.layout?.nodes.find(n=>n.id===id);if(!p)return;
    const {w,h}=graphViewportSize();if(!w||!h)return;
    graphView.scale=graphClamp(Math.max(graphView.scale,minimumScale),GRAPH_MIN,GRAPH_MAX);
    graphView.x=w/2-p.x*graphView.scale;graphView.y=h/2-p.y*graphView.scale;graphView.autoFit=false;graphApplyCamera();
  }
  function graphEdgeGeometry(a,b,offset){
    const dx=b.x-a.x,dy=b.y-a.y,d=Math.max(1,Math.hypot(dx,dy));
    const w=CharacterGraphLayout.NODE_W/2+3,h=CharacterGraphLayout.NODE_H/2+3;
    const t=Math.min(w/Math.max(.0001,Math.abs(dx)),h/Math.max(.0001,Math.abs(dy)),.43);
    const x1=a.x+dx*t,y1=a.y+dy*t,x2=b.x-dx*t,y2=b.y-dy*t;
    const mx=(x1+x2)/2-dy/d*offset,my=(y1+y2)/2+dx/d*offset;
    return {path:`M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`,x:mx,y:my};
  }

  function graphDraw(chars,rels){
    const g=graphView,l=g.layout,byId=new Map(chars.map(c=>[c.id,c])),pos=new Map(l.nodes.map(p=>[p.id,p]));
    const groups=new Map();rels.forEach(r=>{const k=[r.from,r.to].sort().join('\u0000');if(!groups.has(k))groups.set(k,[]);groups.get(k).push(r)});
    const offsets=new Map();groups.forEach(group=>group.forEach((r,i)=>offsets.set(r.id,(i-(group.length-1)/2)*42)));
    const clusters=(l.groups||[]).map(group=>`<div class="cn-cluster" style="left:${group.x}px;top:${group.y}px;width:${group.width}px;height:${group.height}px"><div class="cn-cluster-title"><span class="cn-cluster-kicker">FRAKTION / ROLLE</span><strong>${safeEsc(group.label)}</strong><span class="cn-cluster-count">${safeEsc(group.count)} Figur${Number(group.count)===1?'':'en'}</span></div></div>`).join('');
    const edges=rels.map(r=>{
      const a=pos.get(r.from),b=pos.get(r.to);if(!a||!b)return '';
      const geom=graphEdgeGeometry(a,b,offsets.get(r.id)||0),label=r.label||REL_TYPES[r.type]?.label||'';
      return `<g class="cn-link" data-cn-edge="${safeEsc(r.id)}" data-cn-from="${safeEsc(r.from)}" data-cn-to="${safeEsc(r.to)}"><path class="cn-edge ${safeEsc(r.type)}" d="${geom.path}" style="stroke-width:${1.25+Number(r.strength||3)*.46}"/><path class="cn-edge-hit" d="${geom.path}" data-cn-relation="${safeEsc(r.id)}"/><text class="cn-edge-label" x="${geom.x}" y="${geom.y-7}" text-anchor="middle">${safeEsc(label.length>28?label.slice(0,27)+'…':label)}</text></g>`;
    }).join('');
    const nodes=chars.map(c=>{
      const p=pos.get(c.id),caption=c.faction||c.role||'Figur';
      return `<button type="button" class="cn-node ${c.importance==='legendary'?'legendary':''}" data-cn-character="${safeEsc(c.id)}" style="left:${p.x}px;top:${p.y}px" title="${safeEsc(c.name+' · '+caption)}"><span class="cn-avatar">${c.importance==='legendary'?'♛':safeEsc((c.name||'?').charAt(0).toLocaleUpperCase('de'))}</span><strong>${safeEsc(c.name)}</strong><small>${safeEsc(caption)}</small></button>`;
    }).join('');
    const world=el('cnWorld');world.style.width=l.width+'px';world.style.height=l.height+'px';
    world.innerHTML=`${clusters}<svg class="cn-canvas-svg" viewBox="0 0 ${l.width} ${l.height}" width="${l.width}" height="${l.height}" aria-hidden="true">${edges}</svg>${nodes}`;
    graphRefreshSelection();
  }
  function graphRefreshSelection(){
    const g=graphView,d=g.data;if(!d)return;
    const selected=g.selected,relId=g.selectedRelation;
    const incident=new Set(),related=new Set();
    if(selected)d.rels.forEach(r=>{if(r.from===selected){incident.add(r.id);related.add(r.to)}if(r.to===selected){incident.add(r.id);related.add(r.from)}});
    if(relId){const r=d.rels.find(r=>r.id===relId);if(r){related.add(r.from);related.add(r.to);incident.add(r.id)}}
    const world=el('cnWorld');if(!world)return;
    el('cnNeighborhood').disabled=!selected;
    world.classList.toggle('cn-show-labels',g.showLabels);
    const dense=d.rels.length>16&&!selected&&!relId;
    world.classList.toggle('is-dense',dense);
    if(el('cnDensityHint'))el('cnDensityHint').hidden=!(dense&&g.showLabels);
    world.querySelectorAll('.cn-node').forEach(n=>{
      const id=n.dataset.cnCharacter;n.classList.toggle('is-selected',id===selected);
      n.classList.toggle('is-related',related.has(id));
      n.classList.toggle('is-dimmed',!!(selected||relId)&&id!==selected&&!related.has(id));
      n.setAttribute('aria-pressed',String(id===selected));
    });
    world.querySelectorAll('.cn-link').forEach(link=>{
      const id=link.dataset.cnEdge,on=incident.has(id);
      link.classList.toggle('cn-line-hidden',g.lineMode==='focus'&&!on);
      link.classList.toggle('is-highlighted',on);link.classList.toggle('is-selected',id===relId);
      link.classList.toggle('is-dimmed',!!(selected||relId)&&!on);
    });
    if(el('cnFocusSelect'))el('cnFocusSelect').value=selected||'';
    graphRenderInspector();
  }
  function graphRenderInspector(){
    const g=graphView,d=g.data,box=el('cnInspector');if(!box||!d)return;
    const byId=new Map(d.allChars.map(c=>[c.id,c]));
    const r=d.allRels.find(r=>r.id===g.selectedRelation);
    if(r){
      box.innerHTML=`<div class="cn-inspector-main"><div class="cn-kicker">AUSGEWÄHLTE VERBINDUNG</div><h4>${safeEsc(byId.get(r.from)?.name||'Figur')} ↔ ${safeEsc(byId.get(r.to)?.name||'Figur')}</h4><p>${safeEsc(REL_TYPES[r.type]?.label||'Beziehung')}${r.label?' · '+safeEsc(r.label):''} · Stärke ${safeEsc(r.strength)}</p></div><button type="button" class="cn-mini" data-cn-edit-relation="${safeEsc(r.id)}">Beziehung bearbeiten</button>`;
      return;
    }
    const c=byId.get(g.selected);
    if(!c){box.innerHTML='<div class="cn-inspector-main"><div class="cn-kicker">NETZANSICHT</div><p>Wähle eine Figur. Ihre direkten Verbindungen werden hervorgehoben. Über „Alle Linien“ kannst du das vollständige Netz einblenden.</p></div>';return}
    const rels=d.allRels.filter(r=>r.from===c.id||r.to===c.id);
    box.innerHTML=`<div class="cn-inspector-main"><div class="cn-kicker">AUSGEWÄHLTE FIGUR</div><h4>${safeEsc(c.name)}</h4><p>${safeEsc([c.role,c.faction,statusLabel(c.status)].filter(Boolean).join(' · ')||'Figur')} · ${rels.length} Verbindung${rels.length===1?'':'en'}</p>${c.spoiler?'<span class="cn-relation-chip">Spoiler markiert</span>':''}${rels.length?`<div class="cn-inspector-relations">${rels.map(r=>{const other=byId.get(r.from===c.id?r.to:r.from);return `<button type="button" data-cn-inspect-focus="${safeEsc(other?.id||'')}" class="cn-inspector-relation"><span class="cn-inspector-relation-type">${safeEsc(REL_TYPES[r.type]?.label||'Beziehung')}</span><strong>${safeEsc(other?.name||'Unbekannt')}</strong><span>${safeEsc(r.label||'↗')}</span></button>`}).join('')}</div>`:''}</div><button type="button" class="cn-mini" data-cn-edit-selected="${safeEsc(c.id)}">Figur bearbeiten</button>`;
  }

  function graphPaint(chars,rels,reset=false){
    const g=graphView,visible=graphVisible(chars,rels),key=graphLayoutKey(visible.chars,visible.rels);
    const changed=g.layoutKey!==key||!g.layout;
    if(changed){
      g.layout=CharacterGraphLayout.layout(visible.chars,visible.rels);g.layoutKey=key;g.autoFit=true;
    }
    g.data={allChars:chars,allRels:rels,chars:visible.chars,rels:visible.rels};
    if(!visible.chars.length){
      el('cnWorld').innerHTML='<div class="cn-empty cn-world-empty">Noch keine Figuren in dieser Reihe. Erstelle zuerst eine Figur oder übernimm Charaktere aus der Reihen-Chronik.</div>';
      el('cnWorld').style.width='100%';el('cnWorld').style.height='100%';
      g.layout=null;g.layoutKey='';graphRenderInspector();return;
    }
    graphDraw(visible.chars,visible.rels);
    if(reset||changed)graphInitialFit();else if(g.autoFit)graphFit();else graphApplyCamera();
  }
  function renderCanvas(chars,rels){
    if(!window.CharacterGraphLayout){el('cnWorld').innerHTML='<div class="cn-empty">Die Netz-Anordnung konnte nicht geladen werden. Bitte lade die App erneut.</div>';return}
    const g=graphView;
    if(g.selected&&!chars.some(c=>c.id===g.selected)){g.selected='';g.selectedRelation='';g.neighborhood=false;el('cnNeighborhood').checked=false}
    if(g.selectedRelation&&!rels.some(r=>r.id===g.selectedRelation))g.selectedRelation='';
    graphNodeOptions();graphPaint(chars,rels);
  }

  function selectGraphCharacter(id,center=false){
    const g=graphView;id=graphSafeId(id);
    if(id&&!g.data?.allChars.some(c=>c.id===id))return;
    if(g.mode==='atlas'){openNetworkFor(id);return}
    const changed=g.selected!==id;g.selected=id;g.selectedRelation='';
    if(g.neighborhood&&changed)graphPaint(g.data.allChars,g.data.allRels);
    else graphRefreshSelection();
    if(center&&id)graphCenter(id,1);
  }
  function selectGraphRelationship(id,center=false){
    const g=graphView,r=g.data?.allRels.find(r=>r.id===id);if(!r)return;
    g.selectedRelation=r.id;g.selected='';
    if(g.neighborhood){g.neighborhood=false;el('cnNeighborhood').checked=false;graphPaint(g.data.allChars,g.data.allRels)}
    else graphRefreshSelection();
    if(center){const a=g.layout?.nodes.find(n=>n.id===r.from),b=g.layout?.nodes.find(n=>n.id===r.to);if(a&&b){const {w,h}=graphViewportSize();g.scale=Math.max(g.scale,.9);g.x=w/2-(a.x+b.x)/2*g.scale;g.y=h/2-(a.y+b.y)/2*g.scale;g.autoFit=false;graphApplyCamera()}}
  }
  function graphToggleExpanded(){
    const g=graphView;g.expanded=!g.expanded;el('cnDialog').classList.toggle('cn-expanded',g.expanded);
    el('cnExpand').textContent=g.expanded?'⛶ Normalansicht':'⛶ Grossansicht';el('cnExpand').setAttribute('aria-pressed',String(g.expanded));
    requestAnimationFrame(()=>graphFit());
  }
  function initGraphControls(){
    const viewport=el('cnViewport');
    el('cnZoomIn').addEventListener('click',()=>graphZoom(graphView.scale*1.25));
    el('cnZoomOut').addEventListener('click',()=>graphZoom(graphView.scale/1.25));
    el('cnZoomRange').addEventListener('input',e=>graphZoom(Number(e.target.value)/100));
    el('cnFit').addEventListener('click',graphFit);
    el('cnOneToOne').addEventListener('click',()=>graphZoom(1));
    el('cnExpand').addEventListener('click',graphToggleExpanded);
    el('cnShowWhole').addEventListener('click',()=>{const g=graphView;g.selected='';g.selectedRelation='';g.neighborhood=false;g.lineMode='all';g.autoFit=true;el('cnNeighborhood').checked=false;el('cnAllLines').checked=true;graphPaint(g.data.allChars,g.data.allRels,true);graphFit()});
    el('cnAllLines').addEventListener('change',e=>{graphView.lineMode=e.target.checked?'all':'focus';graphRefreshSelection()});
    el('cnLabels').addEventListener('change',e=>{graphView.showLabels=e.target.checked;graphRefreshSelection()});
    el('cnNeighborhood').addEventListener('change',e=>{graphView.neighborhood=e.target.checked;graphPaint(graphView.data.allChars,graphView.data.allRels)});
    el('cnFocusSelect').addEventListener('change',e=>selectGraphCharacter(e.target.value,true));
    el('cnCanvas').addEventListener('click',e=>{
      if(Date.now()<graphView.suppressClickUntil)return
      const n=e.target.closest('[data-cn-character]');if(n){selectGraphCharacter(n.dataset.cnCharacter);return}
      const r=e.target.closest('[data-cn-relation]');if(r){selectGraphRelationship(r.dataset.cnRelation);return}
    });
    el('cnInspector').addEventListener('click',e=>{
      const focus=e.target.closest('[data-cn-inspect-focus]');if(focus){selectGraphCharacter(focus.dataset.cnInspectFocus,true);return}
      const c=e.target.closest('[data-cn-edit-selected]');if(c){openCharacter(c.dataset.cnEditSelected);return}
      const r=e.target.closest('[data-cn-edit-relation]');if(r)openRelationship(r.dataset.cnEditRelation);
    });
    el('cnCanvas').querySelectorAll('[data-cn-pan]').forEach(b=>b.addEventListener('click',()=>{
      const delta={up:[0,120],down:[0,-120],left:[120,0],right:[-120,0]}[b.dataset.cnPan];graphPan(...delta);
    }));
    viewport.addEventListener('wheel',e=>{
      if(!graphView.layout)return;e.preventDefault();const r=viewport.getBoundingClientRect();
      graphZoom(graphView.scale*Math.exp(-graphClamp(e.deltaY,-300,300)*.0012),e.clientX-r.left,e.clientY-r.top);
    },{passive:false});
    viewport.addEventListener('keydown',e=>{
      if(e.target.closest('button,input,select,textarea'))return;
      const pan={ArrowUp:[0,100],ArrowDown:[0,-100],ArrowLeft:[100,0],ArrowRight:[-100,0]}[e.key];
      if(pan){e.preventDefault();graphPan(...pan)}
      else if(e.key==='+'||e.key==='='){e.preventDefault();graphZoom(graphView.scale*1.25)}
      else if(e.key==='-'){e.preventDefault();graphZoom(graphView.scale/1.25)}
      else if(e.key==='0'){e.preventDefault();graphFit()}
    });
    const local=e=>{const r=viewport.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top}};
    const makePinch=()=>{
      const pts=[...graphView.pointers.values()];if(pts.length<2)return null;
      const mid={x:(pts[0].x+pts[1].x)/2,y:(pts[0].y+pts[1].y)/2};
      return {distance:Math.max(1,Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y)),scale:graphView.scale,worldX:(mid.x-graphView.x)/graphView.scale,worldY:(mid.y-graphView.y)/graphView.scale};
    };
    viewport.addEventListener('pointerdown',e=>{
      if(e.pointerType==='mouse'&&e.button!==0)return;
      if(e.target.closest('button,input,select,textarea')&&graphView.pointers.size===0)return;
      if(!graphView.layout)return;
      graphView.dragged=false;graphView.dragDistance=0;const p=local(e);graphView.pointers.set(e.pointerId,p);
      viewport.setPointerCapture(e.pointerId);
      graphView.gesture=graphView.pointers.size>=2?makePinch():{last:p,scale:graphView.scale};
    });
    viewport.addEventListener('pointermove',e=>{
      if(!graphView.pointers.has(e.pointerId))return;
      const p=local(e),old=graphView.pointers.get(e.pointerId);graphView.pointers.set(e.pointerId,p);
      if(graphView.pointers.size>=2){
        const start=graphView.gesture;if(!start?.distance){graphView.gesture=makePinch();return}
        const pts=[...graphView.pointers.values()],mid={x:(pts[0].x+pts[1].x)/2,y:(pts[0].y+pts[1].y)/2};
        const distance=Math.max(1,Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y));
        graphView.scale=graphClamp(start.scale*distance/start.distance,GRAPH_MIN,GRAPH_MAX);
        graphView.x=mid.x-start.worldX*graphView.scale;graphView.y=mid.y-start.worldY*graphView.scale;graphView.autoFit=false;graphView.dragged=true;graphApplyCamera();
      }else{
        const dx=p.x-old.x,dy=p.y-old.y;if(dx||dy){graphView.dragDistance+=Math.hypot(dx,dy);if(graphView.dragDistance>5)graphView.dragged=true;graphPan(dx,dy)}
      }
    });
    const endPointer=e=>{
      if(!graphView.pointers.has(e.pointerId))return;
      graphView.pointers.delete(e.pointerId);
      if(viewport.hasPointerCapture(e.pointerId))viewport.releasePointerCapture(e.pointerId);
      if(graphView.pointers.size>=2)graphView.gesture=makePinch();
      else if(graphView.pointers.size===1)graphView.gesture={last:[...graphView.pointers.values()][0]};
      else{graphView.gesture=null;if(graphView.dragged)graphView.suppressClickUntil=Date.now()+180;graphView.dragged=false;}
    };
    viewport.addEventListener('pointerup',endPointer);viewport.addEventListener('pointercancel',endPointer);
    if(typeof ResizeObserver!=='undefined'){
      graphView.resizeObserver=new ResizeObserver(()=>{if(graphView.pendingInitial)graphInitialFit();else if(graphView.autoFit)graphFit();else graphApplyCamera()});graphView.resizeObserver.observe(viewport);
    }
  }
  function renderCharacters(chars){
    el('cnCharacters').innerHTML=chars.length?chars.map(c=>`<article class="cn-card"><div class="cn-card-head"><div><div class="cn-card-title">${safeEsc(c.name)}</div><div class="cn-card-meta">${safeEsc([c.role,c.faction,statusLabel(c.status),c.importance==='legendary'?'Legendär':c.importance==='important'?'Wichtig':''].filter(Boolean).join(' · '))}</div></div><div class="cn-card-buttons"><button class="cn-mini" type="button" data-cn-focus-character="${safeEsc(c.id)}">Im Netz</button><button class="cn-mini" type="button" data-cn-edit-character="${safeEsc(c.id)}">Bearbeiten</button></div></div>${c.notes?`<div class="cn-card-notes">${safeEsc(c.notes)}</div>`:''}</article>`).join(''):'<div class="cn-empty">Noch keine Figuren. Tipp: Übernimm zuerst Charaktere aus der Reihen-Chronik oder lege manuell Figuren an.</div>';
  }
  function renderRelationships(chars,rels){
    const byId=new Map(chars.map(c=>[c.id,c]));
    el('cnRelationships').innerHTML=rels.length?rels.map(r=>`<article class="cn-card"><div class="cn-card-head"><div><div class="cn-card-title">${safeEsc(byId.get(r.from)?.name||'Unbekannt')} ↔ ${safeEsc(byId.get(r.to)?.name||'Unbekannt')}</div><div class="cn-card-meta"><span class="cn-relation-chip">${safeEsc(REL_TYPES[r.type]?.icon||'')} ${safeEsc(REL_TYPES[r.type]?.label||'Beziehung')}</span>${r.label?` · ${safeEsc(r.label)}`:''} · Stärke ${safeEsc(r.strength)}</div></div><div class="cn-card-buttons"><button class="cn-mini" type="button" data-cn-focus-relationship="${safeEsc(r.id)}">Anzeigen</button><button class="cn-mini" type="button" data-cn-edit-relationship="${safeEsc(r.id)}">Bearbeiten</button></div></div>${r.notes?`<div class="cn-card-notes">${safeEsc(r.notes)}</div>`:''}</article>`).join(''):'<div class="cn-empty">Noch keine Beziehungen. Lege mindestens zwei Figuren an und verbinde sie dann miteinander.</div>';
  }
  function statusLabel(s){return {alive:'Lebt',dead:'Tot',unknown:'Unbekannt',missing:'Vermisst',other:'Anders / unklar'}[s]||'Unbekannt'}
  function open(input=''){
    ensureUi();const s=seriesFromInput(input);if(s)activeSeries=s;ensureSelection();render();if(!el('cnDialog').open)el('cnDialog').showModal();requestAnimationFrame(()=>{if(graphView.pendingInitial)graphInitialFit();else if(graphView.autoFit)graphFit();else graphApplyCamera()});el('cnSeriesSelect').focus({preventScroll:true});
  }
  function close(){if(el('cnDialog')?.open)el('cnDialog').close();if(graphView.expanded){graphView.expanded=false;el('cnDialog')?.classList.remove('cn-expanded');if(el('cnExpand')){el('cnExpand').textContent='⛶ Grossansicht';el('cnExpand').setAttribute('aria-pressed','false')}}graphView.pointers.clear();graphView.gesture=null;graphView.dragged=false;graphView.dragDistance=0;graphView.suppressClickUntil=0}
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
