/**
 * Mein Bücherregal – kostenlose externe Buchdaten-API
 *
 * Datenquellen:
 * 1) K10plus SRU (Bibliothekskatalog)
 * 2) Google Books
 * 3) Open Library
 *
 * Keine Bücher sind fest im Code hinterlegt.
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept",
  "Cache-Control": "public, max-age=300"
};

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {headers: CORS});
    }

    if (url.pathname === "/health") {
      return json({ok: true, service: "mein-buecherregal-api", version: 1});
    }

    if (url.pathname !== "/lookup") {
      return json({ok: false, error: "Not found"}, 404);
    }

    const isbn = cleanIsbn(url.searchParams.get("isbn") || "");
    const title = (url.searchParams.get("title") || "").trim();
    const author = (url.searchParams.get("author") || "").trim();

    if (!isbn && !title) {
      return json({ok: false, error: "isbn oder title erforderlich"}, 400);
    }

    try {
      let book = null;
      let source = "";

      // 1) K10plus: particularly useful for German printed editions.
      if (isbn) {
        book = await k10plusByIsbn(isbn);
      } else {
        book = await k10plusByTitle(title, author);
      }

      if (book) {
        source = "K10plus";
        book = await enrichCover(book, isbn || book.isbn);
        return json({ok: true, source, book});
      }

      // 2) Google Books
      if (isbn) {
        book = await googleBooks(`isbn:${isbn}`, "", "");
      } else {
        book = await googleBooks(`${title} ${author}`.trim(), title, author);
      }

      if (book) {
        source = "Google Books";
        return json({ok: true, source, book});
      }

      // 3) Open Library
      if (isbn) {
        book = await openLibraryByIsbn(isbn);
      } else {
        book = await openLibraryByTitle(title, author);
      }

      if (book) {
        source = "Open Library";
        return json({ok: true, source, book});
      }

      return json({ok: false, error: "Kein Treffer"});
    } catch (err) {
      return json({ok: false, error: String(err?.message || err)}, 500);
    }
  }
};

function json(obj, status=200){
  return new Response(JSON.stringify(obj), {
    status,
    headers: {...CORS, "Content-Type":"application/json; charset=utf-8"}
  });
}

function cleanIsbn(v=""){
  return String(v).replace(/[^0-9Xx]/g,"");
}

function decodeXml(s=""){
  return String(s)
    .replace(/&amp;/g,"&")
    .replace(/&lt;/g,"<")
    .replace(/&gt;/g,">")
    .replace(/&quot;/g,'"')
    .replace(/&#39;|&apos;/g,"'")
    .replace(/&#(\d+);/g, (_,n)=>String.fromCharCode(Number(n)));
}

function xmlValues(xml, tag){
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "gi");
  const out = [];
  let m;
  while((m = re.exec(xml))){
    out.push(decodeXml(m[1].replace(/<[^>]+>/g,"").trim()));
  }
  return out.filter(Boolean);
}

function normalizeAuthor(a=""){
  a = a
    .replace(/\s*\([^)]*(?:Verfasser|Autor|creator)[^)]*\)\s*/gi,"")
    .replace(/\s*,?\s*\d{4}\s*-\s*\d{0,4}\s*$/,"")
    .trim();
  if(a.includes(",")){
    const parts = a.split(",").map(x=>x.trim()).filter(Boolean);
    if(parts.length >= 2) return `${parts.slice(1).join(" ")} ${parts[0]}`.trim();
  }
  return a;
}

function parseSeriesAndVolume(title="", relations=[]){
  let series = relations.find(x => /reihe|serie|trilog/i.test(x)) || "";
  let volume = "";

  const all = [title, ...relations].join(" | ");
  const vm = all.match(/\bBand\s*([0-9]+(?:\.[0-9]+)?)/i);
  if(vm) volume = vm[1];

  if(series){
    series = series
      .replace(/\s*[,;:]?\s*Band\s*[0-9]+(?:\.[0-9]+)?.*$/i,"")
      .replace(/[()]/g,"")
      .trim();
  } else {
    const sm = all.match(/\(([^()]{2,80}?)(?:,\s*)?Band\s*[0-9]+(?:\.[0-9]+)?\)/i);
    if(sm) series = sm[1].trim();
  }

  return {series, volume};
}

async function k10plusRequest(query){
  const base = "https://sru.k10plus.de/opac-de-627";
  const qs = new URLSearchParams({
    version: "1.1",
    operation: "searchRetrieve",
    query,
    maximumRecords: "10",
    recordSchema: "dc"
  });
  const res = await fetch(`${base}?${qs.toString()}`, {
    headers: {"Accept":"application/xml,text/xml;q=0.9,*/*;q=0.1"}
  });
  if(!res.ok) return null;
  const xml = await res.text();

  const count = Number((xml.match(/<[^>]*numberOfRecords[^>]*>(\d+)<\/[^>]*numberOfRecords>/i)||[])[1] || 0);
  if(!count) return null;

  // Keep only first record to avoid mixing fields from multiple hits.
  const rec = (xml.match(/<[^>]*recordData[^>]*>([\s\S]*?)<\/[^>]*recordData>/i)||[])[1] || xml;

  const titles = xmlValues(rec, "dc:title");
  const creators = [
    ...xmlValues(rec, "dc:creator"),
    ...xmlValues(rec, "dc:contributor")
  ];
  const subjects = xmlValues(rec, "dc:subject");
  const identifiers = xmlValues(rec, "dc:identifier");
  const relations = xmlValues(rec, "dc:relation");

  const title = titles[0] || "";
  if(!title) return null;

  const isbn = identifiers
    .map(cleanIsbn)
    .find(x => x.length === 10 || x.length === 13) || "";

  const {series, volume} = parseSeriesAndVolume(title, relations);

  return {
    isbn,
    title,
    author: creators.map(normalizeAuthor).filter(Boolean)[0] || "",
    series,
    volume,
    genre: subjects[0] || "",
    cover: ""
  };
}

async function k10plusByIsbn(isbn){
  return await k10plusRequest(`pica.isb=${isbn}`);
}

async function k10plusByTitle(title, author=""){
  const safeTitle = title.replace(/[="()]/g," ").replace(/\s+/g," ").trim();
  const safeAuthor = author.replace(/[="()]/g," ").replace(/\s+/g," ").trim();

  const queries = [];
  if(safeAuthor) queries.push(`pica.tit=${safeTitle} and pica.per=${safeAuthor}`);
  queries.push(`pica.tit=${safeTitle}`);

  for(const q of queries){
    const b = await k10plusRequest(q);
    if(b) return b;
  }
  return null;
}

function norm(s=""){
  return String(s)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .replace(/[^a-z0-9]+/g," ")
    .trim();
}

function score(a="", b=""){
  const A = new Set(norm(a).split(/\s+/).filter(Boolean));
  const B = new Set(norm(b).split(/\s+/).filter(Boolean));
  if(!A.size || !B.size) return 0;
  let n=0; A.forEach(x=>{if(B.has(x)) n++});
  return n / Math.max(A.size,B.size);
}

async function googleBooks(query, wantedTitle="", wantedAuthor=""){
  try{
    const qs = new URLSearchParams({q:query, maxResults:"20", projection:"full"});
    const res = await fetch(`https://www.googleapis.com/books/v1/volumes?${qs.toString()}`);
    if(!res.ok) return null;
    const data = await res.json();
    const items = data.items || [];
    if(!items.length) return null;

    let best = items[0], bestScore = -1;
    for(const item of items){
      const v = item.volumeInfo || {};
      let s = 0;
      if(wantedTitle) s += score(wantedTitle, v.title || "") * 80;
      if(wantedAuthor) s += score(wantedAuthor, (v.authors||[]).join(" ")) * 20;
      if(v.imageLinks) s += 4;
      if(!wantedTitle && v.imageLinks) s += 5;
      if(s > bestScore){ bestScore=s; best=item; }
    }

    const v = best.volumeInfo || {};
    if(wantedTitle && score(wantedTitle, v.title || "") < 0.25) return null;

    const ids = v.industryIdentifiers || [];
    const isbn = ids.find(x=>x.type==="ISBN_13")?.identifier ||
                 ids.find(x=>x.type==="ISBN_10")?.identifier || "";

    let cover = v.imageLinks?.extraLarge || v.imageLinks?.large ||
                v.imageLinks?.medium || v.imageLinks?.thumbnail ||
                v.imageLinks?.smallThumbnail || "";
    cover = cover.replace(/^http:/,"https:").replace(/zoom=\d+/,"zoom=2");

    return {
      isbn,
      title: v.title || "",
      author: (v.authors || []).join(", "),
      series: "",
      volume: "",
      genre: (v.categories || [])[0] || "",
      cover
    };
  }catch{
    return null;
  }
}

async function openLibraryByIsbn(isbn){
  try{
    const qs = new URLSearchParams({
      bibkeys:`ISBN:${isbn}`,
      format:"json",
      jscmd:"data"
    });
    const res = await fetch(`https://openlibrary.org/api/books?${qs.toString()}`);
    if(!res.ok) return null;
    const data = await res.json();
    const b = data[`ISBN:${isbn}`];
    if(!b) return null;
    return {
      isbn,
      title: b.title || "",
      author: (b.authors||[]).map(x=>x.name).join(", "),
      series: "",
      volume: "",
      genre: (b.subjects||[])[0]?.name || "",
      cover: b.cover?.large || b.cover?.medium || b.cover?.small || ""
    };
  }catch{
    return null;
  }
}

async function openLibraryByTitle(title, author=""){
  try{
    const qs = new URLSearchParams({title, limit:"20"});
    if(author) qs.set("author",author);
    const res = await fetch(`https://openlibrary.org/search.json?${qs.toString()}`);
    if(!res.ok) return null;
    const data = await res.json();
    const docs = data.docs || [];
    if(!docs.length) return null;

    docs.sort((a,b)=>{
      const sa = score(title,a.title||"")*80 + score(author,(a.author_name||[]).join(" "))*20;
      const sb = score(title,b.title||"")*80 + score(author,(b.author_name||[]).join(" "))*20;
      return sb-sa;
    });

    const d = docs[0];
    if(score(title,d.title||"") < 0.25) return null;
    return {
      isbn: (d.isbn||[])[0] || "",
      title: d.title || "",
      author: (d.author_name||[]).join(", "),
      series: "",
      volume: "",
      genre: (d.subject||[])[0] || "",
      cover: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg` : ""
    };
  }catch{
    return null;
  }
}

async function enrichCover(book, isbn=""){
  if(book.cover) return book;

  // Google Books often has a usable cover even when the printed ISBN itself is
  // not indexed there.
  if(book.title){
    const g = await googleBooks(`${book.title} ${book.author||""}`.trim(), book.title, book.author||"");
    if(g?.cover) book.cover = g.cover;
  }

  // Final image-only fallback, still external and keyed by ISBN.
  if(!book.cover && isbn){
    book.cover = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`;
  }

  return book;
}
