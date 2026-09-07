/* Mein Bücherregal V15.8.2 — Private Reihen-Chronik */
(function(){
  'use strict';
  const KEY='my_bookshelf_worldbuilding_v1';
  const ALL='__wb_all__', UNASSIGNED='__wb_unassigned__';
  const TYPES={quote:{label:'Zitate',singular:'Zitat',icon:'❝'},character:{label:'Charaktere',singular:'Charakter',icon:'♞'},place:{label:'Orte',singular:'Ort',icon:'⌂'},faction:{label:'Fraktionen',singular:'Fraktion',icon:'⚑'},lore:{label:'Lore',singular:'Lore',icon:'✦'}};
  const ORDER=Object.keys(TYPES);
  const el=id=>document.getElementById(id);
  const clone=x=>JSON.parse(JSON.stringify(x));
  const escHtml=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const now=()=>new Date().toISOString();
  const id=()=>typeof crypto!=='undefined'&&typeof crypto.randomUUID==='function'?crypto.randomUUID():'wb-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
  const clean=s=>String(s??'').trim();
  const sid=s=>typeof seriesKey==='function'?seriesKey(clean(s)):clean(s).toLocaleLowerCase('de');
  const bookList=()=>typeof books!=='undefined'&&Array.isArray(books)?books:[];
  const findBook=(bid,list=bookList())=>list.find(b=>String(b.id)===String(bid))||null;
  const sourceLabel=b=>b?`${b.title||'Ohne Titel'}${b.volume?' · Band '+b.volume:''}`:'Unbekannter Band';
  const dateLabel=s=>{const d=new Date(s);return Number.isNaN(d.getTime())?'Unbekannt':d.toLocaleDateString('de-CH')};
  function tagsFromText(s){return String(s||'').split(',').map(clean).filter(Boolean)}
  function normalizeEntry(raw,contextBooks=bookList()){
    if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('Ein Worldbuilding-Eintrag ist ungültig.');
    const bookId=clean(raw.bookId||raw.sourceBookId);
    const source=findBook(bookId,contextBooks);
    // Only legacy records without an explicit series are assigned from their source book.
    const explicit=Object.prototype.hasOwnProperty.call(raw,'series');
    const series=clean(explicit?raw.series:(source?.series||''));
    return {
      id:clean(raw.id)||id(),series,bookId,
      sourceKey:String(raw.sourceKey??(source?bookIdentity(source):'')),
      sourceTitle:String(raw.sourceTitle??(source?source.title:(bookId?'Unbekanntes Buch ('+bookId+')':''))),
      sourceReference:String(raw.sourceReference??''),
      type:ORDER.includes(raw.type)?raw.type:'lore',
      title:String(raw.title??raw.name??''),body:String(raw.body??raw.text??raw.quote??''),notes:String(raw.notes??''),
      tags:Array.isArray(raw.tags)?raw.tags.map(x=>String(x)):tagsFromText(raw.tags),
      importance:['normal','important','legendary'].includes(raw.importance)?raw.importance:'normal',
      spoiler:!!raw.spoiler,createdAt:String(raw.createdAt||now()),updatedAt:String(raw.updatedAt||raw.createdAt||now())
    };
  }
  function normalizeEntries(value,contextBooks=bookList(),strict=false){
    const arr=Array.isArray(value)?value:(value&&Array.isArray(value.entries)?value.entries:null);
    if(!arr)throw new Error('Die Worldbuilding-Daten müssen eine Liste von Einträgen enthalten.');
    const result=[],seen=new Set();
    for(const raw of arr){
      const e=normalizeEntry(raw,contextBooks);
      if(seen.has(e.id)){
        if(strict)throw new Error('Doppelte Worldbuilding-ID im Backup.');
        do{e.id=id()}while(seen.has(e.id));
      }
      seen.add(e.id);result.push(e);
    }
    return result;
  }
  function load(){
    try{const raw=localStorage.getItem(KEY);return raw===null?[]:normalizeEntries(JSON.parse(raw))}
    catch(e){console.error('Worldbuilding konnte nicht geladen werden.',e);return []}
  }
  let entries=load(),activeSeries='',activeType=ALL,editingId='',formBaseline='',visibleCount=40;
  let revealed=new Set(),notice='',lastFocused=null;
  function commit(next){
    const normalized=normalizeEntries(next,bookList(),true);
    // Never replace the in-memory data before the durable write succeeds.
    localStorage.setItem(KEY,JSON.stringify(normalized));
    entries=normalized;
    if(typeof markLibraryChanged==='function'){try{markLibraryChanged()}catch(err){console.warn('Backup-Erinnerung konnte nicht aktualisiert werden.',err)}}
    render();
  }
  function backup(){return {version:2,entries:clone(entries)}}
  function memorySnapshot(){return {entries:clone(entries)}}
  function normalizeBackup(value,contextBooks=bookList()){return {version:2,entries:normalizeEntries(value,contextBooks,true)}}
  function bookIdentity(b){return typeof collectionBookKey==='function'?collectionBookKey(b):`${b.isbn||''}|${b.title||''}|${b.author||''}`}
  function planImport(data,mode,plan){
    const target=plan.books||[],targetIds=new Set(target.map(b=>String(b.id)));
    const byIdentity=new Map();
    for(const b of target){const key=bookIdentity(b);if(key&&!byIdentity.has(key))byIdentity.set(key,String(b.id))}
    function remap(e,fromBooks){
      const out={...e,tags:[...e.tags]};
      if(!out.bookId)return out;
      const original=out.bookId;
      const old=findBook(original,fromBooks);
      const key=out.sourceKey||(old?bookIdentity(old):'');
      const mapped=String(plan.idMap?.get(original)||original);
      const candidate=findBook(mapped,target);
      if(candidate&&(!key||bookIdentity(candidate)===key)){
        // Without an identity, only an explicit import remapping is trusted.
        if(key||plan.idMap?.has(original)){out.bookId=mapped;return out}
      }
      const found=key?byIdentity.get(key):'';
      if(found){out.bookId=found;return out}
      // A missing or ambiguous source is retained as historical provenance.
      // Never attach it to an unrelated book that happens to reuse its ID.
      out.bookId='';
      out.sourceTitle=out.sourceTitle||old?.title||'Unbekannter Quellband';
      return out;
    }
    const incoming=data.hasWorldbuilding?data.worldbuilding.entries:[];
    const importedBooks=data.books||[];
    const existing=entries.map(e=>remap(e,bookList()));
    if(!data.hasWorldbuilding)return {entries:existing};
    const mapped=incoming.map(e=>remap(e,importedBooks));
    if(mode==='replace')return {entries:normalizeEntries(mapped,target,true)};
    const result=clone(existing),byId=new Map(result.map(e=>[e.id,e]));
    for(let e of mapped){
      const match=byId.get(e.id);
      if(match){
        if(JSON.stringify(match)===JSON.stringify(e))continue;
        e={...e,id:id()};
        while(byId.has(e.id))e.id=id();
      }
      result.push(e);byId.set(e.id,e);
    }
    return {entries:normalizeEntries(result,target,true)};
  }
  function applyImported(snapshot){entries=normalizeEntries(snapshot.entries,bookList(),true);activeSeries='';render()}
  function restoreMemory(snapshot){entries=normalizeEntries(snapshot.entries,bookList(),true);render()}
  function count(){return entries.length}
  function countForBook(bookId){return entries.filter(e=>e.bookId&&String(e.bookId)===String(bookId)).length}
  function countForSeries(series){return entries.filter(e=>sid(e.series)===sid(series)).length}
  function seriesOptions(){
    const names=new Map();
    for(const b of bookList())if(clean(b.series)&&!names.has(sid(b.series)))names.set(sid(b.series),clean(b.series));
    const activeKeys=new Set(names.keys());
    for(const e of entries)if(e.series&&!names.has(sid(e.series)))names.set(sid(e.series),e.series);
    return [...names].map(([key,name])=>({key,name,archived:!activeKeys.has(key)})).sort((a,b)=>a.name.localeCompare(b.name,'de'));
  }
  function matchingSeries(name){return seriesOptions().find(s=>s.key===sid(name))||null}
  function seriesBooks(name){return bookList().filter(b=>clean(b.series)&&sid(b.series)===sid(name)).sort((a,b)=>{
    return String(a.title||'').localeCompare(String(b.title||''),'de');
  })}
  function selectedSeries(){return seriesOptions().find(s=>s.key===activeSeries)||null}
  function ensureSelection(preferred=''){
    const options=seriesOptions();
    if(preferred&&options.some(x=>x.key===sid(preferred)))activeSeries=sid(preferred);
    if(activeSeries===UNASSIGNED&&entries.some(e=>!e.series))return;
    if(options.some(x=>x.key===activeSeries))return;
    const reading=bookList().find(b=>b.status==='reading'&&clean(b.series));
    activeSeries=reading&&options.some(x=>x.key===sid(reading.series))?sid(reading.series):(options[0]?.key||(entries.some(e=>!e.series)?UNASSIGNED:''));
  }
  function typeName(t){return TYPES[t]?.singular||'Eintrag'}
  function visibleEntries(){
    const query=clean(el('wbSearch')?.value).toLocaleLowerCase('de');
    return entries.filter(e=>{
      if(!activeSeries)return false;
      if(activeSeries===UNASSIGNED){if(e.series)return false}
      else if(sid(e.series)!==activeSeries)return false;
      if(activeType!==ALL&&e.type!==activeType)return false;
      if(!query)return true;
      const b=findBook(e.bookId);
      return [e.title,e.body,e.notes,e.tags.join(' '),e.sourceTitle,e.sourceReference,b?.title||''].join(' ').toLocaleLowerCase('de').includes(query);
    }).sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt))||String(b.updatedAt).localeCompare(String(a.updatedAt)));
  }
  function statsForSelection(){return entries.filter(e=>activeSeries===UNASSIGNED?!e.series:sid(e.series)===activeSeries)}
  function seriesSelectHtml(selected,allowUnassigned=false){
    let options=seriesOptions().map(s=>`<option value="${escHtml(s.key)}">${escHtml(s.name)}${s.archived?' · Gespeicherte Reihe':''}</option>`).join('');
    if(allowUnassigned&&entries.some(e=>!e.series))options+=`<option value="${UNASSIGNED}">Noch zuordnen</option>`;
    return options;
  }
  function ensureUi(){
    if(el('wbDialog'))return;
    document.body.insertAdjacentHTML('beforeend', `
      <dialog id="wbDialog" class="wb-dialog" aria-labelledby="wbHeading">
        <div class="modal-head wb-topbar"><h2 id="wbHeading">🜁 Reihen-Chronik</h2><button type="button" class="icon-btn" id="wbClose" aria-label="Chronik schliessen">×</button></div>
        <div class="modal-body wb-body">
          <div class="wb-hero"><div><div class="wb-kicker">DEIN PRIVATES FANTASY-WIKI</div><h3>Die Chronik deiner Reihen</h3><p>Alle Zitate, Charaktere, Orte, Fraktionen und Welt-Notizen gehören zu einer Reihe. Du bestimmst selbst, was du einträgst — ohne externe Spoiler.</p></div><span class="wb-hero-rune" aria-hidden="true">🜁</span></div>
          <div id="wbNotice" class="wb-notice" role="status" hidden></div>
          <div class="wb-toolbar"><label class="wb-field"><span>Reihe auswählen</span><select id="wbSeriesFilter"></select></label><label class="wb-field wb-search"><span>In dieser Reihe suchen</span><input id="wbSearch" type="search" placeholder="Zitat, Charakter, Ort, Tag …"></label><button class="btn primary" type="button" id="wbNew">＋ Neuer Eintrag</button></div>
          <div class="wb-series-context" id="wbSeriesContext"></div>
          <div class="wb-type-tabs" id="wbTypeTabs" role="group" aria-label="Eintragstyp filtern"></div>
          <div class="wb-stats" id="wbStats"></div><div class="wb-list" id="wbList"></div><div class="wb-more" id="wbMore"></div>
        </div>
      </dialog>
      <dialog id="wbEntryDialog" class="wb-entry-dialog" aria-labelledby="wbEntryHeading">
        <div class="modal-head wb-topbar"><h2 id="wbEntryHeading">Neuer Eintrag</h2><button type="button" class="icon-btn" id="wbEntryClose" aria-label="Eintrag schliessen">×</button></div>
        <div class="modal-body wb-entry-body"><form id="wbForm" class="wb-form"><div class="wb-form-grid">
          <label class="wb-field wb-full"><span>Reihe *</span><select id="wbEntrySeries" required></select></label>
          <label class="wb-field"><span>Typ</span><select id="wbEntryType" name="type" required><option value="quote">Zitat</option><option value="character">Charakter</option><option value="place">Ort</option><option value="faction">Fraktion</option><option value="lore">Lore / Worldbuilding</option></select></label>
          <label class="wb-field"><span>Wichtigkeit</span><select id="wbImportance"><option value="normal">Normal</option><option value="important">Wichtig</option><option value="legendary">Legendär</option></select></label>
          <label class="wb-field wb-full"><span>Aus welchem Band? (optional)</span><select id="wbEntrySource"></select></label>
          <label class="wb-field wb-full"><span>Kapitel / Seite / Quelle (optional)</span><input id="wbSourceReference" placeholder="z. B. Band 3 · Kapitel 12 · Seite 184"></label>
          <label class="wb-field wb-full"><span>Name / Titel</span><input id="wbTitle" maxlength="240" placeholder="z. B. Lieblingszitat, Charaktername oder Ort"></label>
          <label class="wb-field wb-full"><span>Zitat / Beschreibung</span><textarea id="wbBody" rows="6" placeholder="Dein Zitat, eine Charakterbeschreibung oder alles, was du über die Welt festhalten möchtest …"></textarea></label>
          <label class="wb-field wb-full"><span>Eigene Notizen</span><textarea id="wbNotes" rows="4" placeholder="Eigene Gedanken, Theorien, Verbindungen, Erinnerungen …"></textarea></label>
          <label class="wb-field wb-full"><span>Tags (optional)</span><input id="wbTags" placeholder="Magie, Königreich, Lieblingsfigur …"></label>
          <label class="wb-check wb-full"><input id="wbSpoiler" type="checkbox"><span>Spoiler markieren (Inhalt zunächst verdecken)</span></label>
        </div><div class="wb-actions"><button class="btn danger" id="wbDelete" type="button">Eintrag löschen</button><div><button class="btn secondary" id="wbCancel" type="button">Abbrechen</button><button class="btn secondary" id="wbSaveNext" type="submit" data-wb-next="1">Speichern &amp; weiterer Eintrag</button><button class="btn primary" type="submit">Speichern</button></div></div><div id="wbStatus" class="wb-status" role="status"></div></form></div>
      </dialog>`);
    el('wbClose').addEventListener('click',close);
    el('wbDialog').addEventListener('cancel',e=>{e.preventDefault();close()});
    el('wbNew').addEventListener('click',()=>openEntry());
    el('wbSeriesFilter').addEventListener('change',()=>{activeSeries=el('wbSeriesFilter').value;activeType=ALL;visibleCount=40;revealed.clear();el('wbSearch').value='';render()});
    el('wbSearch').addEventListener('input',()=>{visibleCount=40;render()});
    el('wbTypeTabs').addEventListener('click',e=>{const b=e.target.closest('[data-wb-type]');if(!b)return;activeType=b.dataset.wbType;visibleCount=40;render()});
    el('wbMore').addEventListener('click',e=>{if(e.target.closest('[data-wb-more]')){visibleCount+=40;render()}});
    el('wbList').addEventListener('click',e=>{
      const edit=e.target.closest('[data-wb-edit]');if(edit){openEntry(edit.dataset.wbEdit);return}
      const show=e.target.closest('[data-wb-reveal]');if(show){revealed.add(show.dataset.wbReveal);render();return}
      const source=e.target.closest('[data-wb-open-book]');if(source){close();if(typeof openDetails==='function')openDetails(source.dataset.wbOpenBook)}
    });
    el('wbEntryClose').addEventListener('click',()=>closeEntry());
    el('wbCancel').addEventListener('click',()=>closeEntry());
    el('wbEntryDialog').addEventListener('cancel',e=>{e.preventDefault();closeEntry()});
    el('wbDelete').addEventListener('click',deleteEntry);
    el('wbForm').addEventListener('submit',saveEntry);
    el('wbEntrySeries').addEventListener('change',()=>fillSourceSelect('',false));
    const top=el('worldbuildingBtn');if(top)top.addEventListener('click',()=>open());
  }
  function render(){
    if(!el('wbDialog'))return;
    ensureSelection();
    const options=seriesOptions(),unassigned=entries.filter(e=>!e.series).length;
    el('wbSeriesFilter').innerHTML=seriesSelectHtml(activeSeries,true)||'<option value="">Noch keine Reihen vorhanden</option>';
    el('wbSeriesFilter').value=activeSeries;
    el('wbNew').disabled=!selectedSeries();
    const msg=notice||(unassigned&&activeSeries!==UNASSIGNED?`${unassigned} ältere Einträge brauchen noch eine Reihenzuordnung. Wähle „Noch zuordnen“, um sie zuzuweisen.`:'');
    el('wbNotice').hidden=!msg;el('wbNotice').textContent=msg;
    const s=selectedSeries(),all=statsForSelection(),counts=Object.fromEntries(ORDER.map(t=>[t,all.filter(e=>e.type===t).length]));
    const sourceCount=s?seriesBooks(s.name).length:0;
    el('wbSeriesContext').innerHTML=s?`<div><span class="wb-context-kicker">REIHEN-CHRONIK</span><h3>${escHtml(s.name)}</h3><p>${sourceCount} ${sourceCount===1?'Buch':'Bücher'} in deiner Bibliothek · ${all.length} persönliche Einträge</p></div><span class="wb-context-rune" aria-hidden="true">✦</span>`:'<p>Wähle eine Reihe, um ihre Chronik zu öffnen.</p>';
    el('wbTypeTabs').innerHTML=[{id:ALL,label:'Alle',count:all.length},...ORDER.map(t=>({id:t,label:TYPES[t].label,count:counts[t]}))].map(t=>`<button type="button" class="wb-tab ${activeType===t.id?'is-active':''}" data-wb-type="${t.id}" aria-pressed="${activeType===t.id}">${escHtml(t.label)} <span>${t.count}</span></button>`).join('');
    el('wbStats').innerHTML=`<div><strong>${all.length}</strong><span>Einträge</span></div><div><strong>${counts.quote}</strong><span>Zitate</span></div><div><strong>${counts.character}</strong><span>Charaktere</span></div><div><strong>${counts.place+counts.faction}</strong><span>Orte & Fraktionen</span></div><div><strong>${counts.lore}</strong><span>Lore</span></div>`;
    const arr=visibleEntries();
    if(!arr.length){el('wbList').innerHTML=`<div class="wb-empty">${!options.length&&!unassigned?'Noch keine Reihen vorhanden. Trage zuerst bei einem Buch den gewünschten Reihennamen ein.':activeSeries===UNASSIGNED?'Wähle einen alten Eintrag und ordne ihn einer Reihe zu.':'Noch keine passenden Einträge. Du kannst beliebig viele Zitate, Charaktere und Welt-Notizen zu dieser Reihe hinzufügen.'}</div>`;el('wbMore').innerHTML='';return}
    el('wbList').innerHTML=arr.slice(0,visibleCount).map(e=>{
      const b=findBook(e.bookId),source=e.sourceTitle||(b?b.title:'');
      const provenance=e.bookId||source?`<div class="wb-source">${b?`<button type="button" class="wb-book-link" data-wb-open-book="${escHtml(b.id)}">${escHtml(sourceLabel(b))}</button>`:escHtml(source||'Unbekannter Band')}${e.sourceReference?' · '+escHtml(e.sourceReference):''}</div>`:(e.sourceReference?`<div class="wb-source">${escHtml(e.sourceReference)}</div>`:'');
      const body=e.body?`<div class="wb-body-text">${escHtml(e.body)}</div>`:'';
      const notes=e.notes?`<div class="wb-notes"><strong>Eigene Notizen</strong>${escHtml(e.notes)}</div>`:'';
      const hidden=e.spoiler&&!revealed.has(e.id);
      const tagHtml=e.tags.map(t=>`<span>${escHtml(t)}</span>`).join('');
      return `<article class="wb-card is-${e.type} importance-${e.importance} ${e.spoiler?'has-spoiler':''}"><div class="wb-card-rune" aria-hidden="true">${TYPES[e.type].icon}</div><div class="wb-card-main"><div class="wb-card-head"><div><div class="wb-type">${escHtml(typeName(e.type))}${e.spoiler?' · Spoiler':''}${e.importance==='legendary'?' · Legendär':e.importance==='important'?' · Wichtig':''}</div><h4>${escHtml(e.title||typeName(e.type))}</h4>${provenance}</div><button class="wb-edit" type="button" data-wb-edit="${escHtml(e.id)}">Bearbeiten</button></div>${hidden?`<div class="wb-spoiler"><span>Dieser Eintrag enthält Spoiler.</span><button type="button" class="wb-edit" data-wb-reveal="${escHtml(e.id)}">Inhalt anzeigen</button></div>`:body+notes}${tagHtml?`<div class="wb-tags">${tagHtml}</div>`:''}<div class="wb-updated">Aktualisiert: ${escHtml(dateLabel(e.updatedAt))}</div></div></article>`;
    }).join('');
    el('wbMore').innerHTML=arr.length>visibleCount?`<button type="button" class="btn secondary" data-wb-more="1">Weitere laden (${arr.length-visibleCount} übrig)</button>`:'';
  }
  function resolveSeries(target){
    if(target&&typeof target==='object'&&typeof target.series==='string')return target.series;
    if(typeof target==='string'){
      const b=findBook(target);if(b)return clean(b.series);
      return target;
    }
    return '';
  }
  function open(target){
    ensureUi();lastFocused=document.activeElement;
    const preferred=resolveSeries(target);
    ensureSelection(preferred);
    if(target&&typeof target==='string'&&findBook(target)&&!preferred){activeSeries=UNASSIGNED;notice='Dieses Buch hat noch keinen Reihennamen. Trage ihn in den Buchdetails ein, um eine Reihen-Chronik anzulegen.'}
    else notice='';
    activeType=ALL;visibleCount=40;revealed.clear();el('wbSearch').value='';render();
    if(!el('wbDialog').open)el('wbDialog').showModal();
    el('wbSeriesFilter').focus({preventScroll:true});
  }
  function close(){
    if(el('wbEntryDialog')?.open&&!closeEntry())return;
    if(el('wbDialog')?.open)el('wbDialog').close();
    if(lastFocused?.isConnected)lastFocused.focus({preventScroll:true});
  }
  function fillEntrySeries(selected){
    el('wbEntrySeries').innerHTML='<option value="">Reihe auswählen …</option>'+seriesSelectHtml(selected,false);
    el('wbEntrySeries').value=selected&&seriesOptions().some(s=>s.key===selected)?selected:'';
  }
  function fillSourceSelect(selected='',preserveMissing=false){
    const key=el('wbEntrySeries').value,s=seriesOptions().find(x=>x.key===key);
    const bs=s?seriesBooks(s.name):[];
    const old=entries.find(e=>e.id===editingId);
    let options='<option value="">Kein bestimmter Band</option>'+bs.map(b=>`<option value="${escHtml(b.id)}">${escHtml(sourceLabel(b))}</option>`).join('');
    if(preserveMissing&&selected&&!bs.some(b=>String(b.id)===String(selected))){
      options+=`<option value="${escHtml(selected)}">${escHtml(old?.sourceTitle||'Früherer Quellband')} · nicht in dieser Reihe</option>`;
    }
    el('wbEntrySource').innerHTML=options;
    el('wbEntrySource').value=selected&&[...el('wbEntrySource').options].some(o=>o.value===String(selected))?String(selected):'';
  }
  function formValue(){return {series:el('wbEntrySeries').value,type:el('wbEntryType').value,importance:el('wbImportance').value,bookId:el('wbEntrySource').value,sourceReference:el('wbSourceReference').value,title:el('wbTitle').value,body:el('wbBody').value,notes:el('wbNotes').value,tags:el('wbTags').value,spoiler:el('wbSpoiler').checked}}
  function setBaseline(){formBaseline=JSON.stringify(formValue())}
  function isDirty(){return formBaseline!==JSON.stringify(formValue())}
  function openEntry(entryId=''){
    ensureUi();
    if(el('wbEntryDialog').open&&!closeEntry())return;
    editingId=String(entryId||'');
    const e=entries.find(x=>x.id===editingId);
    const selected=e?.series?sid(e.series):activeSeries;
    fillEntrySeries(selected);
    el('wbEntryHeading').textContent=e?'Eintrag bearbeiten':'Neuer Eintrag';
    el('wbEntryType').value=e?.type|| (activeType!==ALL?activeType:'quote');
    el('wbImportance').value=e?.importance||'normal';
    fillSourceSelect(e?.bookId||'',!!e);
    el('wbSourceReference').value=e?.sourceReference||'';
    el('wbTitle').value=e?.title||'';el('wbBody').value=e?.body||'';el('wbNotes').value=e?.notes||'';
    el('wbTags').value=(e?.tags||[]).join(', ');el('wbSpoiler').checked=!!e?.spoiler;
    el('wbDelete').hidden=!e;el('wbStatus').textContent='';
    setBaseline();el('wbEntryDialog').showModal();el('wbTitle').focus({preventScroll:true});
  }
  function closeEntry(force=false){
    if(!el('wbEntryDialog')?.open)return true;
    if(!force&&isDirty()&&!confirm('Ungespeicherte Änderungen verwerfen?'))return false;
    el('wbEntryDialog').close();editingId='';return true;
  }
  function saveEntry(ev){
    ev.preventDefault();
    const selected=seriesOptions().find(s=>s.key===el('wbEntrySeries').value);
    if(!selected){el('wbStatus').textContent='Bitte wähle eine gültige Reihe.';return}
    const values=formValue();
    if(!clean(values.title)&&!clean(values.body)&&!clean(values.notes)&&!tagsFromText(values.tags).length){el('wbStatus').textContent='Bitte fülle mindestens Titel, Zitat/Beschreibung oder Notiz aus.';return}
    const old=entries.find(e=>e.id===editingId),source=findBook(values.bookId);
    const historical=!!old?.sourceTitle&&!values.bookId&&(!findBook(old.bookId)||sid(old.series)!==selected.key);
    const sourceId=values.bookId||(historical?old.bookId:'');
    const draft={...old,id:old?.id||id(),series:selected.name,bookId:sourceId,sourceKey:source?bookIdentity(source):(historical||old?.bookId===values.bookId?old?.sourceKey||'':''),sourceTitle:source?.title||(historical||old?.bookId===values.bookId?old?.sourceTitle||'':''),sourceReference:values.sourceReference,type:values.type,title:values.title,body:values.body,notes:values.notes,tags:tagsFromText(values.tags),importance:values.importance,spoiler:values.spoiler,createdAt:old?.createdAt||now(),updatedAt:now()};
    const e=normalizeEntry(draft),next=entries.filter(x=>x.id!==e.id).concat(e);
    try{commit(next)}catch(err){console.error(err);el('wbStatus').textContent='Speichern fehlgeschlagen. Deine bisherigen Einträge bleiben erhalten. Bitte erstelle ein Backup und prüfe den Gerätespeicher.';return}
    activeSeries=sid(e.series);activeType=ALL;visibleCount=40;notice='Eintrag gespeichert ✓';
    if(ev.submitter?.dataset.wbNext==='1'){
      editingId='';el('wbTitle').value='';el('wbBody').value='';el('wbNotes').value='';el('wbTags').value='';el('wbImportance').value='normal';el('wbSpoiler').checked=false;
      el('wbDelete').hidden=true;el('wbEntryHeading').textContent='Weiterer Eintrag';
      el('wbStatus').textContent='Gespeichert ✓ Du kannst direkt den nächsten Eintrag hinzufügen.';setBaseline();el('wbTitle').focus({preventScroll:true});
    }else{closeEntry(true);render()}
  }
  function deleteEntry(){
    if(!editingId)return;
    if(!confirm('Diesen Eintrag endgültig löschen? Die Bücher und alle anderen Chronik-Einträge bleiben erhalten.'))return;
    try{commit(entries.filter(e=>e.id!==editingId))}catch(err){console.error(err);el('wbStatus').textContent='Löschen konnte nicht gespeichert werden. Der Eintrag bleibt erhalten.';return}
    closeEntry(true);notice='Eintrag gelöscht.';render();
  }
  function refresh(){render()}
  const api={open,openEntry,refresh,backup,normalizeBackup,planImport,applyImported,restoreMemory,memorySnapshot,count,countForBook,countForSeries};
  window.Worldbuilding=api;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ensureUi);else ensureUi();
})();
