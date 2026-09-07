/* Mein Bücherregal V16 — private, manually ordered series history. */
(function(){
  'use strict';
  const C=window.WorldTimelineCore;
  const KEY='my_bookshelf_world_timeline_v1';
  const ALL='__wt_all__';
  const el=id=>document.getElementById(id);
  const clean=x=>String(x??'').trim();
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const copy=x=>JSON.parse(JSON.stringify(x));
  const bookList=()=>typeof books!=='undefined'&&Array.isArray(books)?books:[];
  const bookById=id=>bookList().find(b=>String(b.id)===String(id))||null;
  const network=()=>window.CharacterNetwork?.backup?.()||{characters:[],relationships:[]};
  const lore=()=>window.Worldbuilding?.backup?.().entries||[];
  const status=(text,error=false)=>{const e=el('wtFormStatus');if(e){e.textContent=text;e.className='wt-form-status '+(error?'error':'success')}};
  let data={version:1,entries:[]},loadError='',notice='',activeSeries='',activeType=ALL,activeCharacter='',query='',visibleCount=40;
  let editingId='',baseline='',selectedRefs=new Map(),formReady=false;
  const revealed=new Set();
  try{const raw=localStorage.getItem(KEY);if(raw!==null)data=C.normalize(JSON.parse(raw))}
  catch(err){loadError=err.message;console.error('Die Ereignis-Chronik konnte nicht gelesen werden.',err)}
  function save(next){
    if(loadError)throw new Error('Die gespeicherte Chronik konnte nicht gelesen werden. Bitte sichere deine Daten und stelle ein gültiges Backup wieder her, bevor du sie veränderst.');
    const normalized=C.normalize({entries:next});
    // The durable write must succeed before changing the in-memory state.
    localStorage.setItem(KEY,JSON.stringify(normalized));
    data=normalized;
    if(typeof markLibraryChanged==='function')try{markLibraryChanged()}catch(err){console.warn('Backup-Erinnerung:',err)}
    render();
  }
  function backup(){return copy(data)}
  function memorySnapshot(){return copy(data)}
  function normalizeBackup(value){return C.normalize(value)}
  function applyImported(snapshot){data=C.normalize(snapshot);loadError='';render()}
  function restoreMemory(snapshot){data=C.normalize(snapshot);render()}
  function planImport(incoming,mode,plan,networkPlan){if(loadError&&!incoming.hasWorldTimeline)throw new Error('Die vorhandene Ereignis-Chronik ist nicht lesbar. Ein älteres Backup ohne Ereignisse darf sie nicht überschreiben. Bitte zuerst die Chronik sichern und ein gültiges Backup wiederherstellen.');return C.planImport(data,incoming,mode,plan,networkPlan,{books:bookList(),network:network()})}
  function count(){return data.entries.length}
  function countForSeries(series){return C.sorted(data.entries,series).length}
  function seriesOptions(){
    const map=new Map();
    const add=s=>{s=clean(s);if(s&&!map.has(C.key(s)))map.set(C.key(s),s)};
    bookList().forEach(b=>add(b.series));
    data.entries.forEach(e=>add(e.series));
    network().characters.forEach(c=>{if(c.series!=='__unassigned__')add(c.series)});
    lore().forEach(e=>add(e.series));
    return [...map.values()].sort((a,b)=>a.localeCompare(b,'de'));
  }
  function canonicalSeries(s){return seriesOptions().find(x=>C.key(x)===C.key(s))||''}
  function resolveSeries(input){
    if(input&&typeof input==='object'){
      if(input.series)return canonicalSeries(input.series);
      if(input.bookId)return canonicalSeries(bookById(input.bookId)?.series);
    }
    if(typeof input==='string')return canonicalSeries(bookById(input)?.series||input);
    return '';
  }
  function ensureSeries(){const options=seriesOptions();if(!options.length){activeSeries='';return}if(!options.some(s=>C.key(s)===C.key(activeSeries)))activeSeries=options[0];else activeSeries=options.find(s=>C.key(s)===C.key(activeSeries))}
  function sortedBooks(series){const list=bookList().filter(b=>C.key(b.series)===C.key(series));return typeof sortBooksSmart==='function'?sortBooksSmart(list):list.sort((a,b)=>String(a.volume||a.title).localeCompare(String(b.volume||b.title),'de'))}
  function bookLabel(b){return b?`${b.volume?'Band '+b.volume+' · ':''}${b.title||'Ohne Titel'}`:'Unbekannter Band'}
  function sourceText(e){const b=bookById(e.sourceBookId);return b?bookLabel(b):e.sourceTitle||''}
  function charactersFor(series){return network().characters.filter(c=>C.key(c.series)===C.key(series)).sort((a,b)=>a.name.localeCompare(b.name,'de'))}
  function resolveCharacter(ref){const c=network().characters.find(x=>x.id===ref.id);return c&&C.key(c.series)===C.key(ref.series)?c:null}
  function refsFor(e){return e.characterRefs.map(ref=>{const c=resolveCharacter(ref);return {...ref,name:c?.name||ref.name||'Unbekannte Figur',missing:!c}})}
  function seriesSelect(selected=activeSeries){return seriesOptions().map(s=>`<option value="${esc(s)}" ${C.key(s)===C.key(selected)?'selected':''}>${esc(s)}</option>`).join('')}
  function typeSelect(selected='event'){return C.ORDER.map(t=>`<option value="${t}" ${t===selected?'selected':''}>${esc(C.TYPES[t])}</option>`).join('')}
  function typeLabel(t){return C.TYPES[t]||C.TYPES.event}
  function dateText(s){return clean(s)}
  function ensureUi(){
    if(el('wtDialog'))return;
    document.body.insertAdjacentHTML('beforeend',`
      <dialog id="wtDialog" class="wt-dialog" aria-labelledby="wtHeading">
        <div class="wt-topbar"><h2 id="wtHeading">✦ Chronik der Welten</h2><button class="wt-close" type="button" id="wtClose" aria-label="Chronik schliessen">×</button></div>
        <div class="wt-body">
          <div class="wt-hero"><div class="wt-hero-mark" aria-hidden="true">⌛</div><div><div class="wt-kicker">DEINE EIGENE GESCHICHTE</div><h3>Die Chronik der Welten</h3><p>Schlachten, Reisen, Begegnungen und Wendepunkte — in der Reihenfolge, die du selbst festlegst. Nur deine Notizen, keine automatisch eingefügten Spoiler.</p></div></div>
          <div id="wtNotice" class="wt-notice" role="status" hidden></div>
          <div class="wt-toolbar"><label class="wt-field"><span>Reihe auswählen</span><select id="wtSeries"></select></label><label class="wt-field"><span>Figur filtern</span><select id="wtCharacterFilter"><option value="">Alle Figuren</option></select></label><label class="wt-field"><span>In dieser Reihe suchen</span><input id="wtSearch" type="search" placeholder="Ereignis, Ort, Tag …"></label><button class="wt-btn primary wt-primary-action" type="button" id="wtNew">＋ Ereignis</button></div>
          <div class="wt-stats" id="wtStats"></div><div class="wt-tabs" id="wtTabs" role="group" aria-label="Ereignistyp filtern"></div>
          <p class="wt-order-note">Die Reihenfolge legst du selbst fest. Mit ↑ und ↓ verschiebst du Ereignisse; Band- oder Jahreszahlen werden nicht automatisch geraten.</p>
          <div id="wtList" class="wt-list"></div><div class="wt-more" id="wtMore"></div>
        </div>
      </dialog>
      <dialog id="wtEntryDialog" class="wt-entry-dialog" aria-labelledby="wtEntryHeading">
        <div class="wt-topbar"><h2 id="wtEntryHeading">Neues Ereignis</h2><button class="wt-close" type="button" id="wtEntryClose" aria-label="Editor schliessen">×</button></div>
        <div class="wt-entry-body"><form id="wtForm"><div class="wt-form-grid">
          <label class="wt-field wt-full"><span>Reihe *</span><select id="wtEntrySeries" required></select></label>
          <label class="wt-field"><span>Typ</span><select id="wtEntryType">${typeSelect()}</select></label>
          <label class="wt-field"><span>Position in der Chronik</span><input type="number" id="wtPosition" min="1" step="1" required><span class="wt-form-help">1 = Anfang. Du kannst die Reihenfolge später jederzeit ändern.</span></label>
          <label class="wt-field wt-full"><span>Titel *</span><input id="wtTitle" required maxlength="500" placeholder="z. B. Die Ankunft in der Hauptstadt"></label>
          <label class="wt-field wt-full"><span>Was ist passiert?</span><textarea id="wtBody" rows="6" placeholder="Beschreibe das Ereignis in deinen eigenen Worten …"></textarea></label>
          <label class="wt-field"><span>Quellband (optional)</span><select id="wtSourceBook"></select></label>
          <label class="wt-field"><span>Kapitel / Seite (optional)</span><input id="wtSourceReference" maxlength="1000" placeholder="z. B. Kapitel 12 · S. 184"></label>
          <label class="wt-field wt-full"><span>Zeit innerhalb der Geschichte (optional)</span><input id="wtStoryDate" maxlength="500" placeholder="z. B. 3. Zeitalter, Tag 14, vor der Schlacht …"><span class="wt-form-help">Freier Text — du brauchst kein genaues Datum.</span></label>
          <label class="wt-field"><span>Ort (optional)</span><input id="wtPlace" maxlength="500" list="wtPlaces" placeholder="Stadt, Reich, Schauplatz …"><datalist id="wtPlaces"></datalist></label>
          <label class="wt-field"><span>Fraktion (optional)</span><input id="wtFaction" maxlength="500" list="wtFactions" placeholder="Haus, Orden, Armee …"><datalist id="wtFactions"></datalist></label>
          <div class="wt-field wt-full"><span>Beteiligte Figuren (optional)</span><div class="wt-participant-box"><input id="wtPersonSearch" type="search" placeholder="Figuren aus deinem Atlas suchen …" aria-label="Beteiligte Figuren suchen"><div class="wt-participant-summary" id="wtPersonSummary"></div><div class="wt-participant-list" id="wtPeople"></div></div></div>
          <label class="wt-field wt-full"><span>Eigene Notizen / Theorien</span><textarea id="wtNotes" rows="4" placeholder="Was möchtest du dir dazu merken?"></textarea></label>
          <label class="wt-field wt-full"><span>Tags (durch Kommas getrennt)</span><input id="wtTags" placeholder="Krieg, Prophezeiung, Lieblingsmoment …"></label>
          <label class="wt-field"><span>Wichtigkeit</span><select id="wtImportance"><option value="normal">Normal</option><option value="important">Wichtig</option><option value="legendary">Legendär</option></select></label>
          <label class="wt-check"><input id="wtSpoiler" type="checkbox"><span>Spoiler markieren<br><small>Inhalt und Titel in der Übersicht verdecken</small></span></label>
        </div><div class="wt-form-actions"><button class="wt-btn danger" id="wtDelete" type="button">Ereignis löschen</button><div><button class="wt-btn" id="wtCancel" type="button">Abbrechen</button><button class="wt-btn" id="wtSaveNext" type="submit">Speichern &amp; weiteres Ereignis</button><button class="wt-btn primary" type="submit" id="wtSave">Speichern</button></div></div><div class="wt-form-status" id="wtFormStatus" role="status"></div></form></div>
      </dialog>`);
    el('wtClose').addEventListener('click',close);
    el('wtDialog').addEventListener('cancel',e=>{e.preventDefault();close()});
    el('wtNew').addEventListener('click',()=>openEntry());
    el('wtSeries').addEventListener('change',()=>{activeSeries=el('wtSeries').value;activeType=ALL;activeCharacter='';query='';visibleCount=40;revealed.clear();el('wtSearch').value='';render()});
    el('wtCharacterFilter').addEventListener('change',()=>{activeCharacter=el('wtCharacterFilter').value;visibleCount=40;render()});
    el('wtSearch').addEventListener('input',()=>{query=el('wtSearch').value;visibleCount=40;render()});
    el('wtTabs').addEventListener('click',e=>{const b=e.target.closest('[data-wt-type]');if(b){activeType=b.dataset.wtType;visibleCount=40;render()}});
    el('wtList').addEventListener('click',handleListClick);
    el('wtMore').addEventListener('click',e=>{if(e.target.closest('[data-wt-more]')){visibleCount+=40;render()}});
    el('wtEntryClose').addEventListener('click',closeEntry);
    el('wtCancel').addEventListener('click',closeEntry);
    el('wtEntryDialog').addEventListener('cancel',e=>{e.preventDefault();closeEntry()});
    el('wtForm').addEventListener('submit',saveEntry);
    el('wtDelete').addEventListener('click',deleteEntry);
    el('wtEntrySeries').addEventListener('change',()=>{if(!formReady)return;selectedRefs.clear();fillSourceOptions();fillSuggestions();renderPeople();el('wtPosition').value=String(C.sorted(data.entries,el('wtEntrySeries').value).length+1)});
    el('wtPersonSearch').addEventListener('input',renderPeople);
    el('wtPeople').addEventListener('change',e=>{const b=e.target.closest('[data-wt-person]');if(!b)return;const c=charactersFor(el('wtEntrySeries').value).find(c=>c.id===b.dataset.wtPerson)||selectedRefs.get(b.dataset.wtPerson);if(!c)return;if(b.checked)selectedRefs.set(c.id,{id:c.id,name:c.name,series:c.series});else selectedRefs.delete(c.id);renderPeople()});
    const top=el('worldTimelineBtn');if(top)top.addEventListener('click',()=>open());
  }
  function filtered(){
    const q=C.key(query);
    return C.sorted(data.entries,activeSeries).filter(e=>{
      if(activeType!==ALL&&e.type!==activeType)return false;
      if(activeCharacter&&!e.characterRefs.some(r=>r.id===activeCharacter))return false;
      if(!q)return true;
      return C.key([e.title,e.body,e.notes,e.storyDate,e.sourceTitle,sourceText(e),e.sourceReference,e.place,e.faction,e.tags.join(' '),...refsFor(e).map(r=>r.name)].join(' ')).includes(q);
    });
  }
  function render(){
    if(!el('wtDialog'))return;
    ensureSeries();
    el('wtSeries').innerHTML=seriesSelect(activeSeries)||'<option value="">Noch keine Reihen vorhanden</option>';
    el('wtSeries').value=activeSeries;
    const all=C.sorted(data.entries,activeSeries),count=all.length;
    const byType=Object.fromEntries(C.ORDER.map(t=>[t,all.filter(e=>e.type===t).length]));
    const charCount=new Set(all.flatMap(e=>e.characterRefs.map(r=>r.id))).size;
    el('wtStats').innerHTML=`<div class="wt-stat"><strong>${count}</strong><span>Ereignisse in dieser Reihe</span></div><div class="wt-stat"><strong>${charCount}</strong><span>Verknüpfte Figuren</span></div><div class="wt-stat"><strong>${all.filter(e=>e.spoiler).length}</strong><span>Spoiler markiert</span></div>`;
    const filterOptions=[...charactersFor(activeSeries).map(c=>({id:c.id,name:c.name})),...all.flatMap(e=>refsFor(e).filter(r=>r.missing).map(r=>({id:r.id,name:r.name+' (frühere Verknüpfung)'})))];
    const byId=new Map(filterOptions.map(c=>[c.id,c]));
    el('wtCharacterFilter').innerHTML='<option value="">Alle Figuren</option>'+[...byId.values()].sort((a,b)=>a.name.localeCompare(b.name,'de')).map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');
    if(activeCharacter&&!byId.has(activeCharacter))activeCharacter='';el('wtCharacterFilter').value=activeCharacter;
    el('wtTabs').innerHTML=`<button type="button" class="wt-tab ${activeType===ALL?'active':''}" data-wt-type="${ALL}" aria-pressed="${activeType===ALL}">Alle <span>${count}</span></button>`+C.ORDER.filter(t=>byType[t]).map(t=>`<button type="button" class="wt-tab ${activeType===t?'active':''}" data-wt-type="${t}" aria-pressed="${activeType===t}">${esc(typeLabel(t))} <span>${byType[t]}</span></button>`).join('');
    const note=el('wtNotice');const warning=loadError?'Die bisherigen Ereignisdaten konnten nicht gelesen werden. Es wird nichts überschrieben. Bitte sichere deine Website-Daten und verwende ein gültiges Backup.':'';
    note.textContent=warning||notice;note.hidden=!(warning||notice);
    el('wtNew').disabled=!!loadError||!activeSeries;
    const list=filtered(),visible=list.slice(0,visibleCount);
    if(!list.length){el('wtList').innerHTML=`<div class="wt-empty">${count?'Keine Ereignisse passen zu diesen Filtern.':'Noch keine Ereignisse in dieser Reihe. Beginne mit einer Reise, Schlacht oder einem wichtigen Wendepunkt.'}</div>`;el('wtMore').innerHTML='';return}
    el('wtList').innerHTML=visible.map((e,i)=>renderCard(e,i)).join('');
    el('wtMore').innerHTML=list.length>visible.length?`<button class="wt-btn" data-wt-more type="button">Weitere Ereignisse anzeigen (${list.length-visible.length})</button>`:'';
  }
  function renderCard(e){
    const hidden=e.spoiler&&!revealed.has(e.id),refs=refsFor(e),all=C.sorted(data.entries,e.series),index=all.findIndex(x=>x.id===e.id);
    const meta=[e.storyDate?`<span>◷ ${esc(dateText(e.storyDate))}</span>`:'',sourceText(e)?`<span><strong>Quelle:</strong> ${esc(sourceText(e))}${e.sourceReference?' · '+esc(e.sourceReference):''}</span>`:e.sourceReference?`<span>${esc(e.sourceReference)}</span>`:'',e.place?`<span>⌖ ${esc(e.place)}</span>`:'',e.faction?`<span>⚑ ${esc(e.faction)}</span>`:''].filter(Boolean).join('');
    const chips=refs.map(ref=>`<button type="button" class="wt-chip character ${ref.missing?'missing':''}" data-wt-character="${esc(ref.id)}" title="${ref.missing?'Historische Verknüpfung':'Im Charakter-Netz öffnen'}">♞ ${esc(ref.name)}${ref.missing?' · nicht im Atlas':''}</button>`).join('');
    const details=hidden?`<div class="wt-spoiler-lock">Der Inhalt dieses Ereignisses ist als Spoiler markiert.<div style="margin-top:10px"><button type="button" class="wt-btn small" data-wt-reveal="${esc(e.id)}">Spoiler anzeigen</button></div></div>`:`<div class="wt-meta">${meta}</div>${e.body?`<div class="wt-card-text">${esc(e.body)}</div>`:''}${e.notes?`<div class="wt-note"><strong>Eigene Notizen</strong><br>${esc(e.notes)}</div>`:''}${chips?`<div class="wt-tags">${chips}</div>`:''}${e.tags.length?`<div class="wt-tags">${e.tags.map(t=>`<span class="wt-chip">${esc(t)}</span>`).join('')}</div>`:''}`;
    return `<article class="wt-event" id="wt-event-${esc(e.id)}"><div class="wt-marker"><span>${e.position}</span></div><div class="wt-card type-${esc(e.type)} ${e.importance==='legendary'?'legendary':''}"><div class="wt-card-head"><div class="wt-card-title"><div class="wt-type">${esc(typeLabel(e.type))}${e.importance==='legendary'?' · ✦ Legendär':e.importance==='important'?' · Wichtig':''}${e.spoiler?' · Spoiler':''}</div><h4>${hidden?'Verdecktes Ereignis':esc(e.title)}</h4></div></div>${details}<div class="wt-card-actions"><button class="wt-btn small" type="button" data-wt-edit="${esc(e.id)}">Bearbeiten</button><span class="wt-spacer"></span><button class="wt-btn icon" type="button" data-wt-move="${esc(e.id)}" data-delta="-1" aria-label="Ereignis nach oben verschieben" title="Nach oben" ${index===0?'disabled':''}>↑</button><button class="wt-btn icon" type="button" data-wt-move="${esc(e.id)}" data-delta="1" aria-label="Ereignis nach unten verschieben" title="Nach unten" ${index===all.length-1?'disabled':''}>↓</button></div></div></article>`;
  }
  function handleListClick(e){
    const btn=e.target.closest('[data-wt-edit],[data-wt-move],[data-wt-reveal],[data-wt-character]');if(!btn)return;
    if(btn.dataset.wtEdit){openEntry(btn.dataset.wtEdit);return}
    if(btn.dataset.wtReveal){revealed.add(btn.dataset.wtReveal);render();return}
    if(btn.dataset.wtMove){if(loadError)return;const id=btn.dataset.wtMove;try{save(C.move(data.entries,id,Number(btn.dataset.delta)));requestAnimationFrame(()=>el('wt-event-'+id)?.scrollIntoView({block:'nearest'}))}catch(err){notice='Die Reihenfolge konnte nicht gespeichert werden: '+err.message;render()}return}
    if(btn.dataset.wtCharacter){const ref=data.entries.flatMap(x=>x.characterRefs).find(r=>r.id===btn.dataset.wtCharacter);const c=network().characters.find(x=>x.id===btn.dataset.wtCharacter);const series=c?.series||ref?.series||activeSeries;if(c){close();window.CharacterNetwork?.open?.({series})}else{notice='Diese Figur ist nicht mehr im Atlas vorhanden. Die historische Verknüpfung bleibt erhalten.';render()}}
  }
  function open(input={}){
    ensureUi();const series=resolveSeries(input);if(series)activeSeries=series;ensureSeries();
    if(input&&typeof input==='object'&&input.characterId)activeCharacter=String(input.characterId);else activeCharacter='';
    activeType=ALL;query='';visibleCount=40;revealed.clear();el('wtSearch').value='';notice='';render();
    if(!el('wtDialog').open)el('wtDialog').showModal();
    el('wtSeries').focus({preventScroll:true});
  }
  function close(){if(el('wtDialog')?.open)el('wtDialog').close()}
  function fillSourceOptions(preferred=''){
    const series=el('wtEntrySeries').value,list=sortedBooks(series);
    const previous=preferred||'';
    el('wtSourceBook').innerHTML='<option value="">Ohne Quellband</option>'+list.map(b=>`<option value="${esc(b.id)}">${esc(bookLabel(b))}</option>`).join('');
    if(previous&&!list.some(b=>String(b.id)===previous)){
      const old=editingId?data.entries.find(e=>e.id===editingId):null;
      if(old?.sourceBookId===previous)el('wtSourceBook').insertAdjacentHTML('beforeend',`<option value="${esc(previous)}">${esc(old.sourceTitle||'Früherer Quellband')} · nicht mehr zugeordnet</option>`);
    }
    el('wtSourceBook').value=previous;
  }
  function fillSuggestions(){
    const series=el('wtEntrySeries').value,entries=lore().filter(e=>C.key(e.series)===C.key(series));
    const places=new Set(entries.filter(e=>e.type==='place').map(e=>clean(e.title)).filter(Boolean));
    const factions=new Set(entries.filter(e=>e.type==='faction').map(e=>clean(e.title)).filter(Boolean));
    data.entries.filter(e=>C.key(e.series)===C.key(series)).forEach(e=>{if(e.place)places.add(e.place);if(e.faction)factions.add(e.faction)});
    charactersFor(series).forEach(c=>{if(c.faction)factions.add(c.faction)});
    el('wtPlaces').innerHTML=[...places].sort().map(x=>`<option value="${esc(x)}"></option>`).join('');
    el('wtFactions').innerHTML=[...factions].sort().map(x=>`<option value="${esc(x)}"></option>`).join('');
  }
  function renderPeople(){
    const series=el('wtEntrySeries').value,q=C.key(el('wtPersonSearch').value),characters=charactersFor(series),byId=new Map(characters.map(c=>[c.id,c]));
    const existing=[...selectedRefs.values()].filter(ref=>!byId.has(ref.id));
    const all=[...characters,...existing.map(ref=>({...ref,missing:true}))];
    const matches=all.filter(c=>!q||C.key([c.name,c.faction,c.role].join(' ')).includes(q));
    const shown=matches.slice(0,100);
    el('wtPeople').innerHTML=shown.map(c=>`<label class="wt-person"><input type="checkbox" data-wt-person="${esc(c.id)}" ${selectedRefs.has(c.id)?'checked':''}><span>${esc(c.name)}${c.faction?`<small>${esc(c.faction)}</small>`:''}${c.missing?'<small>Frühere Verknüpfung</small>':''}</span></label>`).join('')||'<div class="wt-form-help">Keine passenden Figuren.</div>';
    el('wtPersonSummary').textContent=`${selectedRefs.size} ausgewählt · ${characters.length} Figuren im Atlas${matches.length>100?' · erste 100 Treffer angezeigt':''}`;
  }
  function formValue(){
    const series=el('wtEntrySeries').value,sourceBookId=el('wtSourceBook').value,source=bookById(sourceBookId),old=editingId?data.entries.find(e=>e.id===editingId):null;
    return {id:editingId||C.makeId(),originId:old?.originId||editingId||'',series,position:Number(el('wtPosition').value),type:el('wtEntryType').value,title:el('wtTitle').value,body:el('wtBody').value,notes:el('wtNotes').value,storyDate:el('wtStoryDate').value,sourceBookId,sourceIdentity:source?C.ident(source):sourceBookId===old?.sourceBookId?old?.sourceIdentity||'':'',sourceTitle:source?.title||sourceBookId===old?.sourceBookId?old?.sourceTitle||'':'',sourceReference:el('wtSourceReference').value,place:el('wtPlace').value,faction:el('wtFaction').value,characterRefs:[...selectedRefs.values()],tags:el('wtTags').value.split(',').map(clean).filter(Boolean),importance:el('wtImportance').value,spoiler:el('wtSpoiler').checked,createdAt:old?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
  }
  function formFingerprint(){const v=formValue();delete v.id;delete v.originId;delete v.createdAt;delete v.updatedAt;return JSON.stringify(v)}
  function openEntry(id='',defaults={}){
    if(loadError){notice='Die Chronik ist zur Sicherheit schreibgeschützt, bis ein gültiges Backup wiederhergestellt wurde.';render();return}
    ensureUi();editingId=String(id||'');const e=data.entries.find(x=>x.id===editingId);formReady=false;selectedRefs=new Map();
    const series=e?.series||resolveSeries(defaults)||activeSeries;
    el('wtEntryHeading').textContent=e?'Ereignis bearbeiten':'Neues Ereignis';
    el('wtEntrySeries').innerHTML=seriesSelect(series);el('wtEntrySeries').value=series;
    el('wtEntryType').value=e?.type||defaults.type||'event';
    el('wtPosition').value=String(e?.position||C.sorted(data.entries,series).length+1);
    el('wtTitle').value=e?.title||'';el('wtBody').value=e?.body||'';el('wtNotes').value=e?.notes||'';
    el('wtStoryDate').value=e?.storyDate||'';el('wtSourceReference').value=e?.sourceReference||'';
    el('wtPlace').value=e?.place||'';el('wtFaction').value=e?.faction||'';el('wtTags').value=(e?.tags||[]).join(', ');
    el('wtImportance').value=e?.importance||'normal';el('wtSpoiler').checked=!!e?.spoiler;
    fillSourceOptions(e?.sourceBookId||defaults.bookId||'');fillSuggestions();
    (e?.characterRefs||[]).forEach(ref=>selectedRefs.set(ref.id,copy(ref)));
    el('wtPersonSearch').value='';renderPeople();
    el('wtDelete').hidden=!e;status('');formReady=true;baseline=formFingerprint();
    if(!el('wtEntryDialog').open)el('wtEntryDialog').showModal();
    el('wtTitle').focus({preventScroll:true});
  }
  function closeEntry(){
    const d=el('wtEntryDialog');if(!d?.open)return;
    if(formReady&&baseline!==formFingerprint()&&!confirm('Ungespeicherte Änderungen verwerfen?'))return;
    d.close();editingId='';formReady=false;selectedRefs.clear();
  }
  function saveEntry(ev){
    ev.preventDefault();if(loadError)return;
    const next=ev.submitter?.id==='wtSaveNext';
    try{
      const raw=formValue();if(!canonicalSeries(raw.series))throw new Error('Bitte wähle eine gültige Reihe.');
      const event=C.normalizeEntry(raw,{allowNewId:true});const id=event.id;
      const updated=C.upsert(data.entries,event,event.position);
      save(updated);activeSeries=event.series;activeType=ALL;activeCharacter='';query='';visibleCount=40;el('wtSearch').value='';
      if(next){editingId='';const defaults={series:event.series,type:event.type,bookId:event.sourceBookId};openEntry('',defaults);status('Ereignis gespeichert. Du kannst direkt das nächste erfassen.');return}
      formReady=false;el('wtEntryDialog').close();editingId='';selectedRefs.clear();notice='Ereignis gespeichert.';render();requestAnimationFrame(()=>el('wt-event-'+id)?.scrollIntoView({block:'nearest'}));
    }catch(err){status('Speichern fehlgeschlagen: '+err.message,true)}
  }
  function deleteEntry(){
    if(!editingId||loadError)return;
    if(!confirm('Dieses Ereignis wirklich löschen? Bücher, Figuren und andere Chronik-Einträge bleiben erhalten.'))return;
    try{save(C.remove(data.entries,editingId));formReady=false;el('wtEntryDialog').close();editingId='';selectedRefs.clear();notice='Ereignis gelöscht.';render()}catch(err){status('Löschen fehlgeschlagen: '+err.message,true)}
  }
  // Loading and import APIs are synchronous so that the existing backup transaction can use them.
  window.WorldTimeline={open,openEntry,backup,memorySnapshot,normalizeBackup,planImport,applyImported,restoreMemory,count,countForSeries};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ensureUi);else ensureUi();
})();
