/* Mein Bücherregal V15.8 — Zitate, Charaktere & Worldbuilding */
(function(){
  'use strict';
  const KEY='my_bookshelf_worldbuilding_v1';
  const MAX=50000;
  const TYPES={quote:{label:'Zitat',icon:'❝'},character:{label:'Charakter',icon:'♞'},place:{label:'Ort',icon:'⌂'},faction:{label:'Fraktion',icon:'⚑'},lore:{label:'Lore',icon:'✦'}};
  const TYPE_ORDER=['quote','character','place','faction','lore'];
  let entries=load();
  let activeBookId='all';
  let activeType='all';
  let editingId='';

  const el=id=>document.getElementById(id);
  const clone=x=>JSON.parse(JSON.stringify(x));
  const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const safeEsc=s=>typeof esc==='function'?esc(s):escapeHtml(s);
  const iso=()=>new Date().toISOString();
  const newId=()=>crypto.randomUUID?crypto.randomUUID():String(Date.now())+Math.random().toString(16).slice(2);
  const nowText=d=>{try{return new Date(d).toLocaleDateString('de-CH')}catch{return 'unbekannt'}};
  function findBook(id){return (books||[]).find(b=>String(b.id)===String(id))||null}
  function bookLabel(b){return b?`${b.title||'Ohne Titel'}${b.author?' · '+b.author:''}`:'Unbekanntes Buch'}
  function typeLabel(t){return TYPES[t]?.label||'Eintrag'}
  function typeIcon(t){return TYPES[t]?.icon||'✦'}
  function tagsFromText(s){return String(s||'').split(',').map(x=>x.trim()).filter(Boolean).slice(0,12)}

  function normalizeEntry(raw){
    if(!raw||typeof raw!=='object'||Array.isArray(raw))return null;
    const bookId=String(raw.bookId||'').trim();
    if(!bookId)return null;
    const type=TYPE_ORDER.includes(raw.type)?raw.type:'lore';
    const title=String(raw.title||raw.name||'').trim().slice(0,240);
    const body=String(raw.body||raw.text||raw.quote||'').trim().slice(0,12000);
    const notes=String(raw.notes||'').trim().slice(0,12000);
    const tags=Array.isArray(raw.tags)?raw.tags.map(x=>String(x).trim()).filter(Boolean).slice(0,12):tagsFromText(raw.tags);
    const importance=['normal','important','legendary'].includes(raw.importance)?raw.importance:'normal';
    const spoiler=!!raw.spoiler;
    if(!title&&!body&&!notes&&!tags.length)return null;
    return {id:String(raw.id||newId()),bookId,type,title,body,notes,tags,importance,spoiler,createdAt:String(raw.createdAt||iso()),updatedAt:String(raw.updatedAt||iso())};
  }
  function normalizeEntries(value){
    const arr=Array.isArray(value)?value:(value&&Array.isArray(value.entries)?value.entries:[]);
    if(arr.length>MAX)throw new Error('Zu viele Worldbuilding-Einträge im Backup.');
    const out=[];const ids=new Set();
    arr.forEach(raw=>{const e=normalizeEntry(raw);if(!e)return;while(ids.has(e.id))e.id=newId();ids.add(e.id);out.push(e)});
    return out;
  }
  function load(){try{return normalizeEntries(JSON.parse(localStorage.getItem(KEY)||'[]'))}catch(e){console.warn('Worldbuilding konnte nicht geladen werden.',e);return []}}
  function save(){
    try{localStorage.setItem(KEY,JSON.stringify(entries))}
    catch(e){alert('Worldbuilding konnte nicht gespeichert werden. Bitte erstelle ein Backup und prüfe den Speicher.');throw e}
    if(typeof markLibraryChanged==='function')markLibraryChanged();
    render();
  }
  function backup(){return {entries:clone(entries)}}
  function memorySnapshot(){return {entries:clone(entries)}}
  function normalizeBackup(value){return {entries:normalizeEntries(value)}}
  function remapForPlan(id,plan){return String(plan.idMap?.get(id)||id)}
  function planImport(data,mode,plan){
    const validIds=new Set((plan.books||[]).map(b=>String(b.id)));
    const oldBooks=new Map((books||[]).map(b=>[String(b.id),b]));
    const identityMap=new Map();
    for(const b of plan.books||[]){const key=typeof collectionBookKey==='function'?collectionBookKey(b):`${b.isbn||''}|${b.title||''}|${b.author||''}`;if(key&&!identityMap.has(key))identityMap.set(key,String(b.id))}
    const remapExisting=id=>{id=String(id);if(validIds.has(id))return id;const old=oldBooks.get(id);const key=old&&(typeof collectionBookKey==='function'?collectionBookKey(old):`${old.isbn||''}|${old.title||''}|${old.author||''}`);return key&&identityMap.has(key)?identityMap.get(key):id};
    const filterValid=list=>list.map(e=>({...e,bookId:String(e.bookId)})).filter(e=>validIds.has(String(e.bookId)));
    if(!data.hasWorldbuilding){
      const kept=mode==='replace'?entries.map(e=>({...e,bookId:remapExisting(e.bookId)})):clone(entries);
      return {entries:filterValid(kept)};
    }
    const incoming=(data.worldbuilding?.entries||[]).map(e=>({...e,bookId:remapForPlan(e.bookId,plan)}));
    if(mode==='replace')return {entries:filterValid(incoming)};
    const result=clone(entries);const byId=new Map(result.map(e=>[e.id,e]));
    for(let e of incoming){if(!validIds.has(String(e.bookId)))continue;const existing=byId.get(e.id);if(existing){if(JSON.stringify(existing)===JSON.stringify(e))continue;e={...e,id:newId()}}result.push(e);byId.set(e.id,e)}
    if(result.length>MAX)throw new Error('Zu viele Worldbuilding-Einträge nach dem Zusammenführen.');
    return {entries:result};
  }
  function applyImported(snapshot){entries=normalizeEntries(snapshot?.entries||[]);render()}
  function restoreMemory(snapshot){entries=normalizeEntries(snapshot?.entries||[]);render()}

  function ensureUi(){
    if(el('wbDialog'))return;
    document.body.insertAdjacentHTML('beforeend', `
      <dialog id="wbDialog" class="wb-dialog" aria-labelledby="wbHeading">
        <div class="modal-head wb-topbar"><h2 id="wbHeading">🜁 Welt & Zitate</h2><button type="button" class="icon-btn" id="wbClose" aria-label="Worldbuilding schliessen">×</button></div>
        <div class="modal-body wb-body">
          <div class="wb-hero"><div><div class="wb-kicker">DEIN PRIVATES FANTASY-WIKI</div><h3>Zitate, Charaktere & Lore</h3><p>Speichere alles, was du behalten willst: starke Zitate, Figuren, Orte, Fraktionen und eigene Gedanken. Keine externe Spoiler-Datenbank — nur deine Notizen.</p></div><span class="wb-hero-rune" aria-hidden="true">🜁</span></div>
          <div class="wb-toolbar"><label class="wb-field"><span>Buch</span><select id="wbBookFilter"></select></label><label class="wb-field"><span>Typ</span><select id="wbTypeFilter"></select></label><label class="wb-field wb-search"><span>Suchen</span><input id="wbSearch" type="search" placeholder="Name, Zitat, Tag …"></label><button class="btn primary" type="button" id="wbNew">＋ Neuer Eintrag</button></div>
          <div class="wb-stats" id="wbStats"></div>
          <div class="wb-list" id="wbList"></div>
        </div>
      </dialog>
      <dialog id="wbEntryDialog" class="wb-entry-dialog" aria-labelledby="wbEntryHeading">
        <div class="modal-head wb-topbar"><h2 id="wbEntryHeading">Eintrag</h2><button type="button" class="icon-btn" id="wbEntryClose" aria-label="Eintrag schliessen">×</button></div>
        <div class="modal-body wb-entry-body">
          <form id="wbForm" class="wb-form">
            <div class="wb-form-grid">
              <label class="wb-field wb-full"><span>Buch</span><select id="wbEntryBook"></select></label>
              <label class="wb-field"><span>Typ</span><select id="wbEntryType"></select></label>
              <label class="wb-field"><span>Wichtigkeit</span><select id="wbImportance"><option value="normal">Normal</option><option value="important">Wichtig</option><option value="legendary">Legendär</option></select></label>
              <label class="wb-field wb-full"><span>Name / Titel</span><input id="wbTitle" maxlength="240" placeholder="z. B. Arlen, Camorr, Lieblingszitat Kapitel 12"></label>
              <label class="wb-field wb-full"><span>Zitat / Beschreibung</span><textarea id="wbBody" rows="5" maxlength="12000" placeholder="Zitat, Charakterbeschreibung, Ort, Fraktion oder Lore-Info …"></textarea></label>
              <label class="wb-field wb-full"><span>Eigene Notizen</span><textarea id="wbNotes" rows="4" maxlength="12000" placeholder="Was bedeutet das? Was willst du dir merken? Theorie, Verbindung, Verdacht …"></textarea></label>
              <label class="wb-field wb-full"><span>Tags</span><input id="wbTags" maxlength="400" placeholder="Magie, Königreich, Spoiler, Lieblingsfigur …"></label>
              <label class="wb-check wb-full"><input id="wbSpoiler" type="checkbox"><span>Spoiler markieren</span></label>
            </div>
            <div class="wb-actions"><button class="btn danger" id="wbDelete" type="button">Eintrag löschen</button><div><button class="btn secondary" id="wbCancel" type="button">Abbrechen</button><button class="btn primary" type="submit">Speichern</button></div></div>
            <div id="wbStatus" class="wb-status" role="status"></div>
          </form>
        </div>
      </dialog>`);

    el('wbClose').addEventListener('click',close);
    el('wbDialog').addEventListener('cancel',e=>{e.preventDefault();close()});
    el('wbNew').addEventListener('click',()=>openEntry());
    el('wbBookFilter').addEventListener('change',()=>{activeBookId=el('wbBookFilter').value;render()});
    el('wbTypeFilter').addEventListener('change',()=>{activeType=el('wbTypeFilter').value;render()});
    el('wbSearch').addEventListener('input',render);
    el('wbEntryClose').addEventListener('click',closeEntry);
    el('wbCancel').addEventListener('click',closeEntry);
    el('wbEntryDialog').addEventListener('cancel',e=>{e.preventDefault();closeEntry()});
    el('wbDelete').addEventListener('click',deleteEntry);
    el('wbForm').addEventListener('submit',saveEntry);
    document.addEventListener('click',e=>{const edit=e.target.closest('[data-wb-edit]');if(edit)openEntry(edit.dataset.wbEdit);const book=e.target.closest('[data-wb-open-book]');if(book){close();if(typeof openDetails==='function')openDetails(book.dataset.wbOpenBook)}});
    const top=el('worldbuildingBtn');if(top)top.addEventListener('click',()=>open());
  }

  function fillSelects(){
    ensureUi();
    const bookOptions=['<option value="all">Alle Bücher</option>'].concat((books||[]).slice().sort((a,b)=>String(a.title||'').localeCompare(String(b.title||''),'de')).map(b=>`<option value="${safeEsc(b.id)}">${safeEsc(bookLabel(b))}</option>`)).join('');
    el('wbBookFilter').innerHTML=bookOptions;
    el('wbBookFilter').value=(activeBookId==='all'||findBook(activeBookId))?activeBookId:'all';
    el('wbEntryBook').innerHTML=(books||[]).slice().sort((a,b)=>String(a.title||'').localeCompare(String(b.title||''),'de')).map(b=>`<option value="${safeEsc(b.id)}">${safeEsc(bookLabel(b))}</option>`).join('');
    el('wbTypeFilter').innerHTML='<option value="all">Alle Typen</option>'+TYPE_ORDER.map(t=>`<option value="${t}">${TYPES[t].icon} ${TYPES[t].label}</option>`).join('');
    el('wbEntryType').innerHTML=TYPE_ORDER.map(t=>`<option value="${t}">${TYPES[t].icon} ${TYPES[t].label}</option>`).join('');
    el('wbTypeFilter').value=activeType;
  }

  function filtered(){
    const q=String(el('wbSearch')?.value||'').trim().toLowerCase();
    return entries.filter(e=>{
      if(activeBookId!=='all'&&String(e.bookId)!==String(activeBookId))return false;
      if(activeType!=='all'&&e.type!==activeType)return false;
      if(!q)return true;
      const hay=[e.title,e.body,e.notes,e.tags.join(' '),bookLabel(findBook(e.bookId)),typeLabel(e.type)].join(' ').toLowerCase();
      return hay.includes(q);
    }).sort((a,b)=>{
      const bi=String(bookLabel(findBook(a.bookId))).localeCompare(String(bookLabel(findBook(b.bookId))),'de');
      if(activeBookId==='all'&&bi!==0)return bi;
      const ti=TYPE_ORDER.indexOf(a.type)-TYPE_ORDER.indexOf(b.type);if(ti!==0)return ti;
      const imp={legendary:0,important:1,normal:2};const ii=(imp[a.importance]??2)-(imp[b.importance]??2);if(ii!==0)return ii;
      return String(b.updatedAt).localeCompare(String(a.updatedAt));
    });
  }
  function renderStats(){
    const byType=Object.fromEntries(TYPE_ORDER.map(t=>[t,0]));entries.forEach(e=>{byType[e.type]=(byType[e.type]||0)+1});
    const booksWith=new Set(entries.map(e=>e.bookId)).size;
    const spoilers=entries.filter(e=>e.spoiler).length;
    el('wbStats').innerHTML=`<div><strong>${entries.length}</strong><span>Einträge</span></div><div><strong>${booksWith}</strong><span>Bücher mit Lore</span></div><div><strong>${byType.quote||0}</strong><span>Zitate</span></div><div><strong>${byType.character||0}</strong><span>Charaktere</span></div><div><strong>${spoilers}</strong><span>Spoiler markiert</span></div>`;
  }
  function render(){
    if(!el('wbDialog'))return;
    fillSelects();renderStats();
    const arr=filtered();
    if(!arr.length){el('wbList').innerHTML='<div class="wb-empty">Noch keine passenden Einträge. Fang klein an: ein starkes Zitat, ein wichtiger Charakter oder eine Lore-Notiz.</div>';return}
    el('wbList').innerHTML=arr.map(e=>{
      const b=findBook(e.bookId);const tagHtml=e.tags.map(t=>`<span>${safeEsc(t)}</span>`).join('');
      return `<article class="wb-card is-${safeEsc(e.type)} importance-${safeEsc(e.importance)} ${e.spoiler?'has-spoiler':''}"><div class="wb-card-rune">${typeIcon(e.type)}</div><div class="wb-card-main"><div class="wb-card-head"><div><div class="wb-type">${safeEsc(typeLabel(e.type))}${e.spoiler?' · Spoiler':''}${e.importance==='legendary'?' · Legendär':e.importance==='important'?' · Wichtig':''}</div><h4>${safeEsc(e.title||typeLabel(e.type))}</h4><button type="button" class="wb-book-link" data-wb-open-book="${safeEsc(e.bookId)}">${safeEsc(bookLabel(b))}</button></div><button class="wb-edit" type="button" data-wb-edit="${safeEsc(e.id)}">Bearbeiten</button></div>${e.body?`<div class="wb-body-text">${safeEsc(e.body)}</div>`:''}${e.notes?`<div class="wb-notes"><strong>Notiz</strong>${safeEsc(e.notes)}</div>`:''}${tagHtml?`<div class="wb-tags">${tagHtml}</div>`:''}<div class="wb-updated">Aktualisiert: ${safeEsc(nowText(e.updatedAt))}</div></div></article>`;
    }).join('');
  }

  function open(bookId='all'){
    ensureUi();activeBookId=bookId&&findBook(bookId)?String(bookId):'all';activeType='all';fillSelects();el('wbSearch').value='';render();if(!el('wbDialog').open)el('wbDialog').showModal();el('wbSearch').focus({preventScroll:true});
  }
  function close(){if(el('wbDialog')?.open)el('wbDialog').close()}
  function openEntry(id=''){
    ensureUi();editingId=String(id||'');const e=entries.find(x=>x.id===editingId);
    const targetBook=e?.bookId||(activeBookId!=='all'?activeBookId:(currentDetailBookId&&findBook(currentDetailBookId)?currentDetailBookId:(books[0]?.id||'')));
    fillSelects();el('wbEntryHeading').textContent=e?'Eintrag bearbeiten':'Neuer Worldbuilding-Eintrag';
    el('wbEntryBook').value=targetBook;el('wbEntryType').value=e?.type||'quote';el('wbImportance').value=e?.importance||'normal';el('wbTitle').value=e?.title||'';el('wbBody').value=e?.body||'';el('wbNotes').value=e?.notes||'';el('wbTags').value=(e?.tags||[]).join(', ');el('wbSpoiler').checked=!!e?.spoiler;el('wbDelete').hidden=!e;el('wbStatus').textContent='';el('wbEntryDialog').showModal();el('wbTitle').focus({preventScroll:true});
  }
  function closeEntry(){if(el('wbEntryDialog')?.open)el('wbEntryDialog').close();editingId=''}
  function saveEntry(ev){
    ev.preventDefault();const bookId=el('wbEntryBook').value;if(!findBook(bookId)){el('wbStatus').textContent='Bitte wähle ein gültiges Buch.';return}
    const draft={id:editingId||newId(),bookId,type:el('wbEntryType').value,title:el('wbTitle').value,body:el('wbBody').value,notes:el('wbNotes').value,tags:tagsFromText(el('wbTags').value),importance:el('wbImportance').value,spoiler:el('wbSpoiler').checked,createdAt:editingId?(entries.find(x=>x.id===editingId)?.createdAt||iso()):iso(),updatedAt:iso()};
    const e=normalizeEntry(draft);if(!e){el('wbStatus').textContent='Bitte fülle mindestens Name/Titel, Beschreibung, Notiz oder Tags aus.';return}
    const ix=entries.findIndex(x=>x.id===e.id);if(ix>=0)entries[ix]=e;else entries.push(e);save();closeEntry();open(e.bookId);
  }
  function deleteEntry(){
    if(!editingId)return;if(!confirm('Diesen Worldbuilding-Eintrag löschen? Das Buch bleibt erhalten.'))return;
    entries=entries.filter(e=>e.id!==editingId);save();closeEntry();
  }
  function count(){return entries.length}
  function countForBook(bookId){return entries.filter(e=>String(e.bookId)===String(bookId)).length}

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ensureUi);else ensureUi();
  window.Worldbuilding={open,backup,normalizeBackup,planImport,applyImported,restoreMemory,memorySnapshot,count,countForBook};
})();
