/* Mein Bücherregal V15.7.1 — isolated reading-session module.
   No book, series, collection or journal data is modified on module startup. */
(function(){
  'use strict';
  const KEY='my_bookshelf_reading_sessions_v1';
  const ACTIVE_KEY='my_bookshelf_active_reading_session_v1';
  const MAX_ENTRIES=100000,MAX_MS=86400000;
  const DIALOG=document.getElementById('readingSessionsDialog');
  if(!DIALOG)return;
  const el=id=>document.getElementById(id);
  const escapeText=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clone=value=>JSON.parse(JSON.stringify(value));
  const iso=()=>new Date().toISOString();
  const findBook=id=>books.find(b=>String(b.id)===String(id));
  const bookName=(id,fallback='')=>findBook(id)?.title||fallback||'Buch nicht vorhanden';
  const bookAuthor=(id,fallback='')=>findBook(id)?.author||fallback||'';
  const validTime=value=>{const n=Date.parse(value);return Number.isFinite(n)?n:NaN};
  const validPages=value=>value===null||value===undefined||value===''?null:(Number.isSafeInteger(Number(value))&&Number(value)>=0&&Number(value)<=1000000?Number(value):NaN);
  const dateKey=value=>{const d=new Date(value);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
  const localInput=value=>{const d=new Date(value);if(!Number.isFinite(d.getTime()))return '';return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}T${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`};
  const formatDate=value=>new Date(value).toLocaleString('de-CH',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
  const formatClock=ms=>{const n=Math.floor(Math.max(0,ms)/1000);return `${String(Math.floor(n/3600)).padStart(2,'0')}:${String(Math.floor(n%3600/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`};
  const formatDuration=ms=>{if(ms>0&&ms<30000)return '<1 Min.';const min=Math.round(ms/60000);return min>=60?`${Math.floor(min/60)} Std. ${min%60} Min.`:`${min} Min.`};
  const newId=()=>typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():'rs-'+Date.now()+'-'+Math.random().toString(36).slice(2);
  const totalPages=b=>{const n=Number(b?.pages);return Number.isSafeInteger(n)&&n>0?n:0};
  const storedPage=b=>{const n=Number(b?.currentPage);return Number.isSafeInteger(n)&&n>=0?n:0};
  const bookProgressText=b=>{const page=storedPage(b),total=totalPages(b);if(total)return `${page} / ${total} Seiten · ${Math.min(100,Math.round(page/total*100))}%`;return b.status==='read'?(page?`${page} Seiten · abgeschlossen`:'Abgeschlossen'):`${page} Seiten`};
  // Read the canonical book store when committing progress. A second tab may
  // have changed a book while a timer was running; never overwrite that copy
  // with the potentially stale book array captured when the session began.
  function currentBookStore(){
    const raw=localStorage.getItem(STORAGE_KEY);
    if(raw===null)throw new Error('Die Bücher konnten nicht geladen werden. Bitte prüfe dein Backup und lade die App neu.');
    let list;
    try{list=JSON.parse(raw)}catch(err){throw new Error('Die gespeicherte Bücherliste ist nicht lesbar. Es wurde nichts überschrieben. Bitte prüfe dein Backup.')}
    if(!Array.isArray(list))throw new Error('Die gespeicherte Bücherliste ist ungültig. Es wurde nichts überschrieben.');
    return list;
  }
  function planProgress(record,finishBook){
    const latest=currentBookStore();
    const b=latest.find(x=>String(x.id)===String(record.bookId));
    if(!b)throw new Error('Das Buch ist nicht mehr in der Bibliothek vorhanden. Die Session bleibt erhalten.');
    if(b.status==='wishlist')throw new Error('Der Fortschritt kann nur für ein Buch aus deiner Bibliothek übernommen werden.');
    const total=totalPages(b),end=record.pagesTo;
    if(end===null&&!finishBook)throw new Error('Bitte gib eine Endseite ein, damit der Lesefortschritt aktualisiert werden kann. Alternativ kannst du das Häkchen entfernen und nur die Lesezeit speichern.');
    if(end!==null&&total&&end>total)throw new Error(`Die Endseite liegt über den ${total} Gesamtseiten des Buches.`);
    const updated={...b};
    if(end!==null)updated.currentPage=Math.max(storedPage(b),end);
    if(finishBook){updated.status='read';if(total)updated.currentPage=total}
    else if(b.status==='unread')updated.status='reading';
    updated.updatedAt=iso();
    const nextBooks=latest.map(x=>String(x.id)===String(b.id)?updated:x);
    const nextJournal={...readingJournal},old=nextJournal[String(b.id)]||{};
    nextJournal[String(b.id)]={...old,startedAt:old.startedAt||dateKey(record.startedAt),finishedAt:finishBook?(old.finishedAt||dateKey(record.endedAt)):(old.finishedAt||''),updatedAt:iso()};
    return {book:updated,books:nextBooks,journal:nextJournal};
  }

  function normalizeEntry(raw){
    if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('Ungültiger Session-Datensatz.');
    const id=String(raw.id||'').trim(),bookId=String(raw.bookId||'').trim();
    const start=validTime(raw.startedAt),end=validTime(raw.endedAt),duration=Number(raw.durationMs);
    if(!id||!bookId||!Number.isFinite(start)||!Number.isFinite(end)||end<start||end>Date.now()+300000||!Number.isFinite(duration)||duration<=0||duration>MAX_MS)throw new Error('Eine Session enthält ungültige Zeitangaben.');
    const from=validPages(raw.pagesFrom),to=validPages(raw.pagesTo);
    if(Number.isNaN(from)||Number.isNaN(to)||(from!==null&&to!==null&&to<from))throw new Error('Eine Session enthält ungültige Seitenangaben.');
    return {id,bookId,bookTitle:String(raw.bookTitle||'').slice(0,500),bookAuthor:String(raw.bookAuthor||'').slice(0,500),startedAt:new Date(start).toISOString(),endedAt:new Date(end).toISOString(),durationMs:Math.round(duration),pagesFrom:from,pagesTo:to,note:String(raw.note||'').slice(0,2000),source:raw.source==='manual'?'manual':'timer',createdAt:String(raw.createdAt||raw.startedAt),updatedAt:String(raw.updatedAt||raw.endedAt)};
  }
  function normalizeEntries(value){
    if(!Array.isArray(value)||value.length>MAX_ENTRIES)throw new Error('Die Session-Liste ist ungültig oder zu gross.');
    const seen=new Set();return value.map(raw=>{const entry=normalizeEntry(raw);if(seen.has(entry.id))throw new Error('Doppelte Session-ID im Backup.');seen.add(entry.id);return entry});
  }
  function normalizeActive(raw){
    if(raw===null||raw===undefined)return null;
    if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('Ungültiger aktiver Session-Entwurf.');
    const id=String(raw.id||'').trim(),bookId=String(raw.bookId||'').trim(),start=validTime(raw.startedAt),elapsed=Number(raw.elapsedMs||0),segment=raw.segmentStartedAt===null||raw.segmentStartedAt===undefined?null:Number(raw.segmentStartedAt);
    if(!id||!bookId||!Number.isFinite(start)||start>Date.now()+300000||!Number.isFinite(elapsed)||elapsed<0||!Number.isFinite(segment??0)||segment!==null&&(segment<start-1000||segment>Date.now()+300000))throw new Error('Ungültige aktive Session.');
    const from=validPages(raw.pagesFrom);if(Number.isNaN(from))throw new Error('Ungültige Startseite.');
    const stopped=raw.stoppedAt?validTime(raw.stoppedAt):null;if(stopped!==null&&(!Number.isFinite(stopped)||stopped<start||stopped>Date.now()+300000))throw new Error('Ungültige Session-Endzeit.');return {id,bookId,bookTitle:String(raw.bookTitle||'').slice(0,500),bookAuthor:String(raw.bookAuthor||'').slice(0,500),startedAt:new Date(start).toISOString(),elapsedMs:elapsed,segmentStartedAt:raw.paused?null:segment,paused:!!raw.paused||segment===null,stoppedAt:stopped===null?null:new Date(stopped).toISOString(),pagesFrom:from,note:String(raw.note||'').slice(0,2000)};
  }
  function readStore(key,fallback,normalizer){const raw=localStorage.getItem(key);return raw===null?fallback:normalizer(JSON.parse(raw))}
  let records=[],active=null,storeError='',selectedBookId='',historyFilter='all',editorMode='',editingId='',editorDirty=false,refreshing=false;
  try{records=readStore(KEY,[],normalizeEntries);active=readStore(ACTIVE_KEY,null,normalizeActive)}catch(err){storeError='Gespeicherte Session-Daten konnten nicht gelesen werden. Sie wurden nicht gelöscht. Bitte erstelle ein JSON-Backup und prüfe die Daten, bevor du neue Sessions speicherst.';console.error(err)}
  function fail(message){const node=el('rsAlert');node.hidden=false;node.textContent=message}
  function clearError(){el('rsAlert').hidden=true;el('rsAlert').textContent=''}
  function guard(){if(storeError)throw new Error(storeError)}
  function elapsed(now=Date.now(),draft=active){if(!draft)return 0;return draft.elapsedMs+(draft.paused||draft.segmentStartedAt===null?0:Math.max(0,now-draft.segmentStartedAt))}
  function frozen(draft=active,now=Date.now()){if(!draft)return null;return {...draft,elapsedMs:elapsed(now,draft),segmentStartedAt:null,paused:true}}
  // Each operation writes all affected stores before changing in-memory state.
  // On failure the old raw values and old in-memory objects remain available.
  function transaction(nextRecords,nextActive,nextBooks=null,nextJournal=null){
    guard();const writes=[[KEY,JSON.stringify(nextRecords)],[ACTIVE_KEY,nextActive?JSON.stringify(nextActive):null]];
    if(nextBooks!==null)writes.push([STORAGE_KEY,JSON.stringify(nextBooks)]);
    if(nextJournal!==null)writes.push([READING_JOURNAL_KEY,JSON.stringify(nextJournal)]);
    const previous=writes.map(([key])=>[key,localStorage.getItem(key)]);
    try{
      for(const [key,value] of writes){if(value===null)localStorage.removeItem(key);else localStorage.setItem(key,value)}
      for(const [key,value] of writes){if(localStorage.getItem(key)!==value)throw new Error('Gespeicherte Daten konnten nicht bestätigt werden.')}
    }
    catch(err){for(const [key,value] of previous){try{if(value===null)localStorage.removeItem(key);else localStorage.setItem(key,value)}catch(rollbackErr){console.error('Session rollback:',key,rollbackErr)}}throw new Error('Die Session konnte nicht vollständig gespeichert werden. Die bisherigen Daten wurden nach Möglichkeit wiederhergestellt. Bitte prüfe den Speicher und behalte dein Backup.');}
    records=nextRecords;active=nextActive;
    if(nextBooks!==null)books=nextBooks;
    if(nextJournal!==null)readingJournal=nextJournal;
  }
  function changed(){try{markLibraryChanged()}catch(err){console.warn('Backup-Erinnerung konnte nicht aktualisiert werden',err)}try{render()}catch(err){console.error(err)}const b=findBook(currentDetailBookId);if(b&&el('detailsDialog')?.open&&folioMotion.phase==='open'){try{folioRefreshDetails(b)}catch(err){console.warn(err)}}if(el('journalDialog')?.open){try{renderJournalDashboard()}catch(err){console.warn(err)}}refreshAll()}
  function bookCover(b,klass='rs-cover'){return b?.cover?`<img class="${klass}" src="${escapeText(b.cover)}" alt="" loading="lazy" onerror="this.hidden=true">`:`<div class="${klass} rs-cover-fallback" aria-hidden="true">✦</div>`}
  function bookChoices(){return books.filter(b=>b.status!=='wishlist').slice().sort((a,b)=>String(a.title||'').localeCompare(String(b.title||''),'de'))}
  function fillBookSelect(){const select=el('rsBook'),old=selectedBookId||select.value;const items=bookChoices();select.replaceChildren(new Option(items.length?'Buch auswählen …':'Noch keine Bücher vorhanden',''),...items.map(b=>new Option(`${b.title||'Ohne Titel'} — ${b.author||'Autor unbekannt'}`,String(b.id))));selectedBookId=items.some(b=>String(b.id)===old)?old:'';if(active&&items.some(b=>String(b.id)===active.bookId))selectedBookId=active.bookId;select.value=selectedBookId;fillHistoryFilter()}
  function fillHistoryFilter(){const select=el('rsHistoryFilter'),old=historyFilter;const ids=[...new Set(records.map(r=>r.bookId))];select.replaceChildren(new Option('Alle Bücher','all'),...ids.map(id=>new Option(bookName(id,records.find(r=>r.bookId===id)?.bookTitle),id)));historyFilter=ids.includes(old)?old:'all';select.value=historyFilter}
  function statusText(){return active?(active.paused?'Pausiert':'Läuft'):'Bereit'}
  function paintTimer(){const ms=elapsed();el('rsTimer').textContent=formatClock(ms);el('rsStatus').textContent=statusText();el('rsStatus').dataset.state=active?(active.paused?'paused':'running'):'idle';el('rsTimerCaption').textContent=active?(active.paused?'Deine Pause wird nicht mitgezählt.':'Der Timer läuft. Du kannst das Fenster schliessen und später zurückkommen.'):'Wähle ein Buch und starte deine Lesezeit.';el('readingSessionsBtn').textContent=active?`⏱ Lese-Session · ${active.paused?'Pause':'läuft'}`:'⏱ Lese-Session';el('rsStart').hidden=!!active;el('rsPause').hidden=!active||active.paused;el('rsResume').hidden=!active||!active.paused;el('rsFinish').hidden=!active;el('rsDiscard').hidden=!active;el('rsBook').disabled=!!active;el('rsManual').disabled=!!active;
    if(active){const b=findBook(active.bookId);el('rsActiveBook').innerHTML=`${bookCover(b)}<div><strong>${escapeText(bookName(active.bookId,active.bookTitle))}</strong><span>${escapeText(bookAuthor(active.bookId,active.bookAuthor))}</span></div>`}else{el('rsActiveBook').innerHTML=''}
  }
  function stats(){const now=new Date(),today=dateKey(now),week=new Date(now.getFullYear(),now.getMonth(),now.getDate());week.setDate(week.getDate()-(week.getDay()+6)%7);const month=new Date(now.getFullYear(),now.getMonth(),1);const totals={today:0,week:0,month:0,total:0,pages:0};for(const r of records){totals.total+=r.durationMs;totals.pages+=r.pagesFrom!==null&&r.pagesTo!==null?Math.max(0,r.pagesTo-r.pagesFrom):0;const end=new Date(r.endedAt);if(dateKey(end)===today)totals.today+=r.durationMs;if(end>=week)totals.week+=r.durationMs;if(end>=month)totals.month+=r.durationMs}return totals}
  function renderStats(){const s=stats();el('rsStats').innerHTML=[['Heute',formatDuration(s.today),'Lesezeit'],['Diese Woche',formatDuration(s.week),'Seit Montag'],['Dieser Monat',formatDuration(s.month),'Lesezeit'],['Insgesamt',formatDuration(s.total),`${records.length} Sessions · ${s.pages} Seiten`]].map(([label,value,sub])=>`<div class="rs-stat"><span>${label}</span><strong>${value}</strong><small>${sub}</small></div>`).join('')}
  function renderWeek(){const days=[];const now=new Date();for(let i=6;i>=0;i--){const d=new Date(now.getFullYear(),now.getMonth(),now.getDate()-i);const key=dateKey(d);const ms=records.filter(r=>dateKey(r.endedAt)===key).reduce((n,r)=>n+r.durationMs,0);days.push({d,key,ms})}const max=Math.max(1,...days.map(d=>d.ms));el('rsWeek').innerHTML=days.map(d=>`<div class="rs-day" title="${escapeText(d.d.toLocaleDateString('de-CH'))}: ${formatDuration(d.ms)}"><span>${d.ms?Math.round(d.ms/60000)+'m':'–'}</span><div class="rs-day-bar"><i style="height:${Math.max(4,d.ms/max*100)}%;opacity:${d.ms?1:.18}"></i></div><small>${d.d.toLocaleDateString('de-CH',{weekday:'short'})}</small></div>`).join('')}
  function renderHistory(){
    const filtered=records.filter(r=>historyFilter==='all'||r.bookId===historyFilter).slice().sort((a,b)=>b.endedAt.localeCompare(a.endedAt));
    el('rsHistory').innerHTML=filtered.length?filtered.map(r=>{
      const b=findBook(r.bookId),pages=r.pagesFrom!==null&&r.pagesTo!==null?`${r.pagesFrom}–${r.pagesTo} · ${r.pagesTo-r.pagesFrom} Seiten`:'Keine Seiten erfasst';
      const canSync=!!b&&b.status!=='wishlist'&&r.pagesTo!==null;
      return `<article class="rs-history-row">${bookCover(b)}<div class="rs-history-main"><strong>${escapeText(bookName(r.bookId,r.bookTitle))}</strong><span>${escapeText(formatDate(r.endedAt))} · ${escapeText(formatDuration(r.durationMs))}</span><small>${escapeText(pages)}</small>${r.note?`<p>${escapeText(r.note)}</p>`:''}</div><div class="rs-history-actions">${canSync?`<button class="rs-small rs-small-progress" type="button" data-rs-sync="${escapeText(r.id)}" title="Endseite aus dieser Session ins Buch übernehmen">Fortschritt übernehmen</button>`:''}<button class="rs-small" type="button" data-rs-edit="${escapeText(r.id)}">Bearbeiten</button><button class="rs-small" type="button" data-rs-delete="${escapeText(r.id)}">Löschen</button></div></article>`;
    }).join(''):'<div class="rs-empty">Noch keine gespeicherten Sessions. Deine nächste Lesestunde wartet bereits.</div>';
  }

  function refreshAll(){if(refreshing)return;refreshing=true;try{paintTimer();renderStats();fillHistoryFilter();renderHistory()}finally{refreshing=false}}
  function open(bookId=''){clearError();if(bookId&&findBook(bookId))selectedBookId=String(bookId);fillBookSelect();refreshAll();if(!DIALOG.open)DIALOG.showModal();if(storeError)fail(storeError);el('rsBook').focus({preventScroll:true})}
  function close(){DIALOG.close()}
  function start(){try{guard();clearProgressResult();if(active)throw new Error('Es läuft bereits eine Session. Bitte beende oder verwerfe sie zuerst.');const b=findBook(el('rsBook').value);if(!b||b.status==='wishlist')throw new Error('Bitte wähle ein Buch aus deiner Bibliothek.');const now=Date.now();const draft={id:newId(),bookId:String(b.id),bookTitle:b.title||'',bookAuthor:b.author||'',startedAt:new Date(now).toISOString(),elapsedMs:0,segmentStartedAt:now,paused:false,stoppedAt:null,pagesFrom:storedPage(b),note:''};transaction(records,draft);editorMode='';el('rsEditorSection').hidden=true;selectedBookId=String(b.id);refreshAll();clearError()}catch(err){fail(err.message)}}
  function pause(){try{if(!active||active.paused)return;transaction(records,frozen());refreshAll()}catch(err){fail(err.message)}}
  function resume(){try{guard();if(!active||!active.paused)return;transaction(records,{...active,paused:false,segmentStartedAt:Date.now(),stoppedAt:null});refreshAll()}catch(err){fail(err.message)}}
  function discard(){if(!active)return;if(!confirm('Diese laufende Session wirklich verwerfen? Sie wird nicht im Verlauf gespeichert.'))return;try{transaction(records,null);editorMode='';el('rsEditorSection').hidden=true;refreshAll();clearError()}catch(err){fail(err.message)}}
  function showProgressResult(message){
    el('rsSaveResult').textContent=message;
    el('rsSaveResult').hidden=false;
  }
  function clearProgressResult(){el('rsSaveResult').hidden=true;el('rsSaveResult').textContent=''}
  function editorBook(){return findBook(editorMode==='edit'?records.find(r=>r.id===editingId)?.bookId:active&&editorMode==='timer'?active.bookId:el('rsBook').value)}
  function updateProgressPreview(){
    const node=el('rsProgressPreview');
    if(!editorMode||editorMode==='edit'){node.hidden=true;return}
    node.hidden=false;
    const b=editorBook(),sync=el('rsSyncProgress').checked,finishBook=el('rsFinishedBook').checked;
    if(!b){node.textContent='Wähle ein Buch aus.';return}
    const end=validPages(el('rsPageTo').value),total=totalPages(b);
    if(!sync){node.textContent=`${b.title}: Nur die Session speichern. Der Buchfortschritt bleibt unverändert.`;return}
    if(finishBook){node.textContent=`${b.title}: Als gelesen abschliessen${total?' · '+total+' / '+total+' Seiten':''}.`;return}
    if(end===null||Number.isNaN(end)){node.textContent=`${b.title}: Gib eine Endseite ein, damit der Fortschritt übernommen werden kann.`;return}
    const next=Math.max(storedPage(b),end);
    node.textContent=`${b.title}: ${bookProgressText(b)} → ${next}${total?' / '+total:''} Seiten${total?' · '+Math.min(100,Math.round(next/total*100))+'%':''}.`;
  }
  function fillEditor(mode,record=null){clearProgressResult();editorMode=mode;editingId=mode==='edit'?record.id:'';editorDirty=false;const b=findBook(record?.bookId||active?.bookId||selectedBookId);const startAt=record?.startedAt||(mode==='timer'?active?.startedAt:new Date(Date.now()-1800000).toISOString());const duration=record?.durationMs??(mode==='timer'?elapsed():1800000);el('rsEditorHeading').textContent=mode==='manual'?'Session nachtragen':mode==='edit'?'Session bearbeiten':'Session abschliessen';el('rsStartedAt').value=localInput(startAt);el('rsDuration').value=(Math.max(600,duration)/60000).toFixed(2).replace(/\.00$/,'');el('rsPageFrom').value=record?.pagesFrom??active?.pagesFrom??(b?storedPage(b):'');el('rsPageTo').value=record?.pagesTo??'';el('rsNote').value=record?.note??active?.note??'';el('rsFinishedBook').checked=false;el('rsSyncProgress').checked=mode!=='edit';el('rsSyncRow').hidden=mode==='edit';el('rsEditorHint').textContent=mode==='edit'?'Änderungen an einer alten Session verändern den Buchfortschritt nicht rückwirkend.':mode==='timer'?'Die gestoppte Lesezeit ist eingetragen. Korrigiere sie bei Bedarf, bevor du speicherst.':'Trage eine frühere Session ein. Die Zeiten im Kalender werden dem Enddatum zugeordnet.';el('rsCancelEdit').textContent=mode==='timer'?'Zurück zum Timer':'Abbrechen';el('rsFinishedBook').closest('label').hidden=mode==='edit';el('rsEditorSection').hidden=false;el('rsEditorSection').scrollIntoView({block:'nearest',behavior:'smooth'});el('rsDuration').focus({preventScroll:true});updateProgressPreview()}
  function finish(){try{if(!active)return;transaction(records,{...frozen(),stoppedAt:iso()});fillEditor('timer');refreshAll()}catch(err){fail(err.message)}}
  function manual(){if(active){fail('Bitte beende oder verwerfe zuerst die laufende Session, bevor du eine weitere manuell nachträgst.');return}if(editorDirty&&!confirm('Ungespeicherte Änderungen verwerfen?'))return;fillEditor('manual')}
  function edit(id){const record=records.find(r=>r.id===id);if(!record)return;if(editorMode&&editorDirty&&!confirm('Ungespeicherte Änderungen verwerfen?'))return;selectedBookId=record.bookId;if(!findBook(record.bookId))throw new Error('Das Buch dieser Session ist nicht mehr vorhanden. Der Verlauf bleibt erhalten.');if(!active){fillBookSelect();el('rsBook').value=record.bookId}fillEditor('edit',record)}
  function cancelEdit(){if(editorDirty&&!confirm('Ungespeicherte Änderungen verwerfen?'))return;if(editorMode==='timer'&&active){el('rsEditorSection').hidden=true;editorMode='';refreshAll();return}editorMode='';editingId='';editorDirty=false;el('rsEditorSection').hidden=true;if(active)selectedBookId=active.bookId;fillBookSelect();refreshAll()}
  function makeRecord(){const b=findBook(editorMode==='edit'?records.find(r=>r.id===editingId)?.bookId:active&&editorMode==='timer'?active.bookId:el('rsBook').value);if(!b)throw new Error('Bitte wähle ein gültiges Buch.');const start=new Date(el('rsStartedAt').value).getTime();const minutes=Number(el('rsDuration').value);if(!Number.isFinite(start)||start>Date.now()+300000)throw new Error('Bitte gib ein gültiges Startdatum ein, das nicht in der Zukunft liegt.');if(!Number.isFinite(minutes)||minutes<.01||minutes>1440)throw new Error('Die Lesezeit muss zwischen 0,01 und 1.440 Minuten liegen.');const duration=Math.round(minutes*60000);const existing=editorMode==='edit'?records.find(r=>r.id===editingId):null;let end;if(editorMode==='timer')end=validTime(active?.stoppedAt||iso());else if(editorMode==='edit'&&existing)end=validTime(existing.endedAt)+(start-validTime(existing.startedAt));else end=start+duration;if(!Number.isFinite(end)||end<start||end>Date.now()+300000)throw new Error('Die Session-Endzeit ist ungültig oder liegt in der Zukunft. Bitte korrigiere die Zeit.');const from=validPages(el('rsPageFrom').value),to=validPages(el('rsPageTo').value);if(Number.isNaN(from)||Number.isNaN(to)||(from!==null&&to!==null&&to<from))throw new Error('Bitte prüfe die Seiten. Die Endseite darf nicht vor der Startseite liegen.');const record={id:existing?.id||(active&&editorMode==='timer'?active.id:newId()),bookId:String(b.id),bookTitle:b.title||'',bookAuthor:b.author||'',startedAt:new Date(start).toISOString(),endedAt:new Date(end).toISOString(),durationMs:duration,pagesFrom:from,pagesTo:to,note:el('rsNote').value.trim().slice(0,2000),source:existing?.source||(editorMode==='manual'?'manual':'timer'),createdAt:existing?.createdAt||iso(),updatedAt:iso()};record.source=existing?.source||(editorMode==='manual'?'manual':'timer');return {record,b}}
  function save(event){
    event.preventDefault();
    try{
      guard();if(!editorMode)return;
      const {record}=makeRecord();
      const finishBook=el('rsFinishedBook').checked;
      const syncProgress=editorMode!=='edit'&&el('rsSyncProgress').checked;
      const plan=syncProgress?planProgress(record,finishBook):null;
      const nextRecords=editorMode==='edit'?records.map(r=>r.id===record.id?record:r):[...records,record];
      if(nextRecords.length>MAX_ENTRIES)throw new Error('Der Session-Verlauf ist zu gross.');
      transaction(nextRecords,editorMode==='timer'?null:active,plan?.books??null,plan?.journal??null);
      editorMode='';editingId='';editorDirty=false;el('rsEditorSection').hidden=true;
      selectedBookId=record.bookId;fillBookSelect();changed();clearError();
      showProgressResult(plan?`Session gespeichert. ${plan.book.title}: ${bookProgressText(plan.book)}. Der Buchfortschritt wurde aktualisiert.`:'Session gespeichert. Der Buchfortschritt wurde nicht verändert.');
    }catch(err){fail(err.message)}
  }
  function syncFromHistory(id){
    guard();const record=records.find(r=>r.id===id);
    if(!record)throw new Error('Die Session wurde nicht gefunden.');
    const b=findBook(record.bookId);
    if(!b)throw new Error('Das Buch dieser Session ist nicht mehr vorhanden.');
    if(record.pagesTo===null)throw new Error('Diese Session hat keine Endseite. Bitte bearbeite sie zuerst und trage die Endseite ein.');
    const total=totalPages(b);
    const label=`${b.title}: Endseite ${record.pagesTo}${total?' von '+total:''} übernehmen? Ein bereits höherer Fortschritt wird nicht zurückgesetzt. Der Session-Verlauf bleibt unverändert.`;
    if(!confirm(label))return;
    const plan=planProgress(record,false);
    transaction(records,active,plan.books,plan.journal);
    changed();clearError();
    showProgressResult(`${plan.book.title}: ${bookProgressText(plan.book)}. Fortschritt aus der gespeicherten Session übernommen.`);
  }

  function remove(id){const record=records.find(r=>r.id===id);if(!record)return;if(!confirm(`Session vom ${formatDate(record.endedAt)} löschen? Das Buch und sein Lesefortschritt bleiben unverändert.`))return;try{transaction(records.filter(r=>r.id!==id),active);if(editingId===id){editorMode='';editingId='';el('rsEditorSection').hidden=true}changed();clearError()}catch(err){fail(err.message)}}
  // Backup snapshots never restart a timer in the future. Running drafts are
  // frozen at export time and restored paused, including their elapsed time.
  function backup(){guard();return {entries:clone(records),active:frozen()}}
  function memorySnapshot(){return {entries:clone(records),active:active?clone(active):null}}
  function normalizeBackup(value){if(value===null||value===undefined)throw new Error('Ungültiger Session-Backupbereich.');const object=Array.isArray(value)?{entries:value,active:null}:value;if(!object||typeof object!=='object'||Array.isArray(object))throw new Error('Ungültiger Session-Backupbereich.');const entries=normalizeEntries(object.entries);const draft=normalizeActive(object.active??null);if(draft){return {entries,active:{...draft,segmentStartedAt:null,paused:true}}}return {entries,active:null}}
  function planImport(data,mode,plan){guard();const has=!!data.hasReadingSessions;if(mode==='replace'&&active)throw new Error('Bitte speichere oder verwerfe zuerst die aktuelle Lese-Session, bevor du ein Backup ersetzt. So kann kein ungespeicherter Entwurf verloren gehen.');const validIds=new Set(plan.books.map(b=>String(b.id)));const oldBooks=new Map(books.map(b=>[String(b.id),b]));const identityMap=new Map();for(const b of plan.books){const key=collectionBookKey(b);if(key&&!identityMap.has(key))identityMap.set(key,String(b.id))}const remapExisting=id=>{if(validIds.has(id))return id;const b=oldBooks.get(id),key=b?collectionBookKey(b):'';return key&&identityMap.has(key)?identityMap.get(key):id};const remapIncoming=id=>String(plan.idMap?.get(id)||id);const remap=(r,mapper)=>({...r,bookId:mapper(r.bookId)});if(!has)return {entries:records.map(r=>remap(r,mode==='replace'?remapExisting:x=>x)),active:active?remap(active,mode==='replace'?remapExisting:x=>x):null};const incoming=data.readingSessions;if(mode==='merge'&&active&&incoming.active&&active.id!==incoming.active.id)throw new Error('Das Backup enthält ebenfalls eine aktive Session. Bitte speichere oder verwerfe zuerst deinen aktuellen Entwurf, bevor du die Backups zusammenführst.');const result=mode==='replace'?[]:records.map(r=>clone(r));const byId=new Map(result.map(r=>[r.id,r]));for(const raw of incoming.entries){let r=remap(raw,remapIncoming);const existing=byId.get(r.id);if(existing){if(JSON.stringify(existing)===JSON.stringify(r))continue;if(mode==='merge'){r={...r,id:newId()}}else throw new Error('Doppelte Session-ID im Backup.')}result.push(r);byId.set(r.id,r)}if(result.length>MAX_ENTRIES)throw new Error('Zu viele Sessions im zusammengeführten Backup.');const nextActive=mode==='replace'?incoming.active?remap(incoming.active,remapIncoming):null:active?clone(active):incoming.active?remap(incoming.active,remapIncoming):null;return {entries:result,active:nextActive}}
  function applyImported(snapshot){records=clone(snapshot.entries);active=snapshot.active?clone(snapshot.active):null;editorMode='';editingId='';editorDirty=false;el('rsEditorSection').hidden=true;fillBookSelect();refreshAll()}
  function restoreMemory(snapshot){records=clone(snapshot.entries);active=snapshot.active?clone(snapshot.active):null;editorMode='';editingId='';fillBookSelect();refreshAll()}
  window.ReadingSessions={open,backup,normalizeBackup,planImport,applyImported,restoreMemory,memorySnapshot,count:()=>records.length,activeSnapshot:()=>active?clone(active):null};
  el('readingSessionsBtn').addEventListener('click',()=>open());
  el('journalSessionsBtn').addEventListener('click',()=>open());
  el('rsClose').addEventListener('click',close);
  DIALOG.addEventListener('cancel',event=>{event.preventDefault();close()});
  el('rsBook').addEventListener('change',event=>{selectedBookId=event.target.value;refreshAll();updateProgressPreview()});
  el('rsStart').addEventListener('click',start);el('rsPause').addEventListener('click',pause);el('rsResume').addEventListener('click',resume);el('rsFinish').addEventListener('click',finish);el('rsDiscard').addEventListener('click',discard);
  el('rsManual').addEventListener('click',manual);el('rsCancelEdit').addEventListener('click',cancelEdit);el('rsForm').addEventListener('submit',save);
  el('rsForm').addEventListener('input',()=>{editorDirty=true;updateProgressPreview()});
  el('rsForm').addEventListener('change',updateProgressPreview);
  el('rsHistoryFilter').addEventListener('change',event=>{historyFilter=event.target.value;renderHistory()});
  el('rsHistory').addEventListener('click',event=>{const syncButton=event.target.closest('[data-rs-sync]'),editButton=event.target.closest('[data-rs-edit]'),deleteButton=event.target.closest('[data-rs-delete]');try{if(syncButton)syncFromHistory(syncButton.dataset.rsSync);else if(editButton)edit(editButton.dataset.rsEdit);else if(deleteButton)remove(deleteButton.dataset.rsDelete)}catch(err){fail(err.message)}});
  fillBookSelect();refreshAll();
  // The interval only paints the clock: timestamps, never interval ticks, are
  // the source of truth. A paused session remains paused after reload.
  setInterval(()=>{if(active){paintTimer()}},1000);
  window.addEventListener('storage',event=>{if(event.key===KEY||event.key===ACTIVE_KEY){try{records=readStore(KEY,[],normalizeEntries);active=readStore(ACTIVE_KEY,null,normalizeActive);storeError='';fillBookSelect();refreshAll()}catch(err){console.error(err);fail('Die Session-Daten wurden in einem anderen Tab geändert und konnten nicht gelesen werden. Bitte erstelle ein Backup.')}}});
  // Every state transition is persisted; no unload write is needed.
})();
