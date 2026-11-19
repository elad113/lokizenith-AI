/* Lokizenith Places & Navigation — keyless (OpenStreetMap data). Made by Lokiz Studios.
   Location → nearby places (Overpass mirrors → Nominatim → Photon) → ranked cards → route map. */
(function(){
'use strict';
const A = window.App, {$, $$, el, esc} = A;
const S = () => A.settings();
const t = s => window.I18N ? I18N.t(s) : s;
const UA_EMAIL = '';   // Nominatim etiquette: low volume, one request per action, results cached
const langOf = s => /[\u0590-\u05FF]/.test(s) ? 'he' : /[\u0600-\u06FF]/.test(s) ? 'ar' : /[a-z]{3}/i.test(s) ? 'en' : (S().lang || 'en');
const LN = {en:'English', he:'Hebrew', ar:'Arabic'};

/* ================= LOCATION (permission flow) ================= */
const LS = 'lz.location';
const locStore = () => A.safeJSON(localStorage.getItem(LS)) || {};
const saveLoc = o => localStorage.setItem(LS, JSON.stringify(Object.assign(locStore(), o)));
function browserPos(timeout = 12000){
  return new Promise((res, rej) => {
    if (!navigator.geolocation) return rej(Object.assign(new Error('unsupported'), {code: 0}));
    navigator.geolocation.getCurrentPosition(p => res({lat: p.coords.latitude, lon: p.coords.longitude, acc: p.coords.accuracy, ts: Date.now()}), rej, {enableHighAccuracy: true, timeout, maximumAge: 120000});
  });
}
function prompt(){
  return new Promise(resolve => {
    const ov = el('div', 'geo-ask');
    ov.innerHTML = `<div class="geo-card" role="dialog" aria-modal="true" aria-labelledby="geoT">
      <div class="geo-anim"><span class="geo-ring"></span><span class="geo-ring"></span><span class="geo-ring"></span><div class="geo-pin"><svg viewBox="0 0 24 24"><path d="M12 2a7 7 0 00-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 00-7-7zm0 9.5A2.5 2.5 0 1112 6.5a2.5 2.5 0 010 5z"/></svg></div></div>
      <h3 id="geoT">${esc(t('Find great places near you'))}</h3>
      <p>${esc(t('Allow location so I can recommend restaurants, museums and more nearby, and show routes. Your location stays on this device and is only used when you ask.'))}</p>
      <div class="geo-acts"><button class="btn-ghost" data-a="no">${esc(t('Not now'))}</button><button class="btn-primary" data-a="yes">📍 ${esc(t('Allow location'))}</button></div>
      <small>${esc(t('You can change this anytime in Settings → Location.'))}</small></div>`;
    document.body.appendChild(ov);
    const done = v => { ov.classList.add('out'); setTimeout(() => ov.remove(), 300); resolve(v); };
    ov.addEventListener('click', e => { const b = e.target.closest('[data-a]'); if (b) done(b.dataset.a === 'yes'); else if (e.target === ov) done(false); });
    setTimeout(() => $('[data-a=yes]', ov).focus(), 50);
  });
}
async function enable(){
  try { const p = await browserPos(); saveLoc({choice:'allow', last: p}); A.toast(t('Location enabled')); return p; }
  catch(e){ saveLoc({choice: 'deny', blocked: e.code === 1}); A.toast(e.code === 1 ? t('Location is blocked in the browser — allow it in the site settings') : t('Could not get your location'), 'err'); return null; }
}
async function get({ask = true} = {}){
  const st = locStore();
  if (st.manual) return st.manual;
  if (st.choice === 'allow'){
    try { const p = await browserPos(8000); saveLoc({last: p}); return p; }
    catch(e){ if (st.last && Date.now() - st.last.ts < 6 * 3600e3) return st.last; if (e.code === 1) saveLoc({choice:'deny', blocked:true}); return null; }
  }
  if (!ask) return null;
  if (await prompt()) return enable();
  saveLoc({choice:'deny'}); return null;
}
// first visit: friendly in-app prompt before the browser asks
function firstVisit(){
  const st = locStore(); if (st.choice) return;
  setTimeout(async () => { if (locStore().choice || document.querySelector('.modal:not([hidden]),.geo-ask')) return; if (await prompt()) enable(); else saveLoc({choice:'deny'}); }, 4000);
}

/* ================= GEO HELPERS ================= */
function dist(a, b){ const R = 6371e3, r = Math.PI / 180, dLa = (b.lat - a.lat) * r, dLo = (b.lon - a.lon) * r; const x = Math.sin(dLa / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLo / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); }
const fmtDist = m => m < 950 ? Math.round(m / 10) * 10 + ' ' + t('m') : (m / 1000).toFixed(m < 9500 ? 1 : 0) + ' ' + t('km');
function fmtMin(s){ const m = Math.max(1, Math.round(s / 60)); return m < 60 ? m + ' ' + t('min') : Math.floor(m / 60) + ' ' + t('h') + ' ' + (m % 60) + ' ' + t('min'); }
function bbox(c, r){ const dLat = r / 111320, dLon = r / (111320 * Math.cos(c.lat * Math.PI / 180)); return {s: c.lat - dLat, n: c.lat + dLat, w: c.lon - dLon, e: c.lon + dLon}; }
const gmapsSearch = p => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(p.lat + ',' + p.lon) + (p.osmType ? '' : '');
const gmapsDir = (p, mode) => 'https://www.google.com/maps/dir/?api=1&destination=' + p.lat + ',' + p.lon + '&travelmode=' + (mode === 'foot' ? 'walking' : 'driving');

/* ================= CATEGORIES ================= */
const CATS = {
  restaurant:{e:'🍽', q:'restaurant', tags:[['amenity','restaurant']], rx:/restaurant|dinner|lunch|eat|food|sushi|pizza|burger|steak|ramen|hummus|falafel|vegan|italian|mexican|asian|מסעד|לאכול|ארוחה|סושי|פיצה|המבורגר|חומוס|פלאפל|مطعم|طعام/i, col:['#ff9f43','#ee5253']},
  cafe:{e:'☕', q:'cafe', tags:[['amenity','cafe']], rx:/caf[eé]|coffee|espresso|brunch|בית קפה|קפה|مقهى|قهوة/i, col:['#c8a27a','#7a4e2d']},
  bar:{e:'🍸', q:'bar', tags:[['amenity','bar'],['amenity','pub']], rx:/\bbars?\b|\bpubs?\b|cocktail|beer|wine bar|ברים|בר |פאב|קוקטייל|بار|حانة/i, col:['#a29bfe','#6c5ce7']},
  fast_food:{e:'🍔', q:'fast food', tags:[['amenity','fast_food']], rx:/fast.?food|shawarma|שווארמה|מזון מהיר|وجبات سريعة|شاورما/i, col:['#feca57','#ff9f43']},
  ice_cream:{e:'🍦', q:'ice cream', tags:[['amenity','ice_cream']], rx:/ice.?cream|gelato|גלידה|بوظة|آيس كريم/i, col:['#ffb8d1','#ff6b9d']},
  bakery:{e:'🥐', q:'bakery', tags:[['shop','bakery']], rx:/baker(y|ies)|pastry|מאפייה|קונדיטוריה|مخبز/i, col:['#f6d365','#fda085']},
  museum:{e:'🏛', q:'museum', tags:[['tourism','museum']], rx:/museum|מוזיאו|متحف/i, col:['#74b9ff','#0984e3']},
  gallery:{e:'🖼', q:'art gallery', tags:[['tourism','gallery']], rx:/galler(y|ies)|גלרי|معرض/i, col:['#fd79a8','#e84393']},
  attraction:{e:'📸', q:'tourist attraction', tags:[['tourism','attraction'],['tourism','viewpoint']], rx:/attraction|sight|landmark|things to do|tourist|אטרקצי|אתרים|מה לעשות|نقاط سياحية|معالم/i, col:['#55efc4','#00b894']},
  park:{e:'🌳', q:'park', tags:[['leisure','park']], rx:/\bparks?\b|garden|גינה|פארק|גן ציבורי|حديقة|منتزه/i, col:['#7bed9f','#2ed573']},
  beach:{e:'🏖', q:'beach', tags:[['natural','beach']], rx:/beach|חוף|شاطئ/i, col:['#81ecec','#00cec9']},
  playground:{e:'🛝', q:'playground', tags:[['leisure','playground']], rx:/playground|גן שעשועים|ملعب أطفال/i, col:['#ffeaa7','#fdcb6e']},
  hotel:{e:'🏨', q:'hotel', tags:[['tourism','hotel']], rx:/hotel|hostel|stay|מלון|אכסני|فندق/i, col:['#dfe6e9','#636e72']},
  pharmacy:{e:'💊', q:'pharmacy', tags:[['amenity','pharmacy']], rx:/pharmac|drugstore|בית מרקחת|סופר.?פארם|صيدلية/i, col:['#55efc4','#00b894']},
  hospital:{e:'🏥', q:'hospital', tags:[['amenity','hospital'],['amenity','clinic']], rx:/hospital|clinic|emergency|בית חולים|מרפאה|مستشفى|عيادة/i, col:['#ff7675','#d63031']},
  supermarket:{e:'🛒', q:'supermarket', tags:[['shop','supermarket'],['shop','convenience']], rx:/supermarket|grocery|groceries|סופר|מכולת|سوبرماركت|بقالة/i, col:['#a3cb38','#009432']},
  fuel:{e:'⛽', q:'fuel', tags:[['amenity','fuel']], rx:/gas station|petrol|fuel|תחנת דלק|דלק|محطة وقود/i, col:['#fab1a0','#e17055']},
  charging:{e:'🔌', q:'charging station', tags:[['amenity','charging_station']], rx:/charg(ing|er)|עמדת טעינה|شحن/i, col:['#81ecec','#0984e3']},
  atm:{e:'🏧', q:'atm', tags:[['amenity','atm'],['amenity','bank']], rx:/\batm\b|cash|bank|כספומט|בנק|صراف|بنك/i, col:['#b2bec3','#2d3436']},
  cinema:{e:'🎬', q:'cinema', tags:[['amenity','cinema']], rx:/cinema|movie theat|סרט|קולנוע|سينما/i, col:['#e17055','#d63031']},
  theatre:{e:'🎭', q:'theatre', tags:[['amenity','theatre']], rx:/theat(re|er)|תיאטרון|مسرح/i, col:['#a29bfe','#6c5ce7']},
  gym:{e:'🏋', q:'gym', tags:[['leisure','fitness_centre']], rx:/\bgym\b|fitness|חדר כושר|נאדי|صالة رياضية/i, col:['#ff7675','#e84393']},
  library:{e:'📚', q:'library', tags:[['amenity','library']], rx:/librar|ספרייה|ספריה|مكتبة/i, col:['#ffeaa7','#e17055']},
  parking:{e:'🅿️', q:'parking', tags:[['amenity','parking']], rx:/parking|חניה|חניון|موقف سيارات/i, col:['#74b9ff','#0984e3']},
  zoo:{e:'🦁', q:'zoo', tags:[['tourism','zoo']], rx:/\bzoo\b|ספארי|גן חיות|حديقة حيوانات/i, col:['#fdcb6e','#e17055']}
};
const NEAR_RX = /near me|nearby|near here|around (me|here)|close (to|by) me|closest|nearest|within\s*\d|walking distance|in my area|לידי|קרוב אליי|קרוב אלי|הכי קרוב|בקרבתי|בסביבה|בסביבתי|באזור שלי|באיזור שלי|ליד הבית|במרחק|قريب مني|بالقرب مني|حولي|الأقرب/i;
const ASK_RX = /\b(find|recommend|suggest|best|top|good|where|show me|any|list|nearest|closest|looking for)\b|מצא|תמצא|חפש|תחפש|תמליץ|המלץ|ממליץ|הכי טוב|הכי טובה|הכי טובים|איפה|יש |תראה לי|ابحث|اقترح|أفضل|أين|أوصي/i;
function catFor(text){ for (const [k, c] of Object.entries(CATS)) if (c.rx.test(text)) return k; return null; }
function isPlaces(text){
  if (/navigate|directions to|route to|נווט|ניווט|קח אותי ל|מסלול ל|خذني إلى|اتجاهات/i.test(text)) return false;
  const cat = catFor(text);
  if (NEAR_RX.test(text) && (cat || /place|spot|מקום|مكان/i.test(text))) return true;
  if (!cat || !ASK_RX.test(text) || text.length > 220) return false;
  if (/near|around|in |within|close|km|ק"מ|קילומטר|ליד|קרוב|בסביב|באזור|ב[א-ת]|قريب|في /i.test(text)) return true;
  // short direct asks with a place category ("recommend a museum", "find a pharmacy", "תמליץ על מסעדה") are local by default
  const q = text.trim().replace(/^(hey|hi|please|pls|can you|could you|would you)[,\s]+/i, '');
  return text.length < 90 && /^(find|recommend|suggest|show me|where('s| is| are| can i)|any good|best|top|good|nearest|closest|i('m| am) (looking for|hungry)|looking for|i need|i want)\b|^(תמליץ|תמליצי|המלץ|ממליץ|תמצא|מצא|חפש|תחפש|איפה|אני מחפש|יש פה|יש כאן)|^(اقترح|أوصي|ابحث|أين)/i.test(q) && !/\b(book|movie|film|song|album|show|series|game|app|recipe|novel|podcast)s?\b|ספר|סרט|שיר|סדרה|מתכון/i.test(text);
}

/* ================= DATA SOURCES ================= */
const OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter', 'https://maps.mail.ru/osm/tools/overpass/api/interpreter'];
async function overpass(c, r, cat, cuisine, signal){
  const tags = CATS[cat].tags, cu = cuisine ? `["cuisine"~"${cuisine.replace(/[^\w|; -]/g, '')}",i]` : '';
  const q = `[out:json][timeout:12];(${tags.map(([k, v]) => `nwr["${k}"="${v}"]["name"]${cu}(around:${Math.round(r)},${c.lat},${c.lon});`).join('')});out center tags 80;`;
  const tries = OVERPASS.map(u => LZ.tfetch(u, {method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body:'data=' + encodeURIComponent(q)}, 9000, signal)
    .then(async res => { if (!res.ok) throw new Error('http ' + res.status); const j = await res.json(); if (!j.elements) throw new Error('bad'); return j.elements; }));
  const els = await Promise.any(tries);
  return els.map(e => ({id: e.type + '/' + e.id, osmType: e.type, lat: e.lat ?? (e.center && e.center.lat), lon: e.lon ?? (e.center && e.center.lon), tags: e.tags || {}, src: 'osm'})).filter(p => p.lat != null && p.tags.name);
}
async function nominatim(c, r, cat, cuisine, signal){
  const b = bbox(c, r), q = (cuisine ? cuisine.split('|')[0] + ' ' : '') + CATS[cat].q;
  const u = `https://nominatim.openstreetmap.org/search?format=jsonv2&extratags=1&addressdetails=1&namedetails=1&limit=50&bounded=1&viewbox=${b.w},${b.n},${b.e},${b.s}&q=${encodeURIComponent(q)}${UA_EMAIL ? '&email=' + UA_EMAIL : ''}`;
  const res = await LZ.tfetch(u, {headers:{'Accept-Language': S().lang || 'en'}}, 12000, signal); if (!res.ok) throw new Error('nominatim ' + res.status);
  const j = await res.json();
  return j.filter(x => x.name).map(x => { const tg = Object.assign({}, x.extratags || {}, {name: x.name}); const nd = x.namedetails || {}; Object.keys(nd).forEach(k => { if (/^name:/.test(k)) tg[k] = nd[k]; }); tg[x.category] = x.type; const ad = x.address || {}; if (ad.road){ tg['addr:street'] = ad.road; if (ad.house_number) tg['addr:housenumber'] = ad.house_number; tg['addr:city'] = ad.city || ad.town || ad.village || ad.suburb || ''; } return {id: (x.osm_type || 'n')[0] + '/' + x.osm_id, osmType: x.osm_type, lat: +x.lat, lon: +x.lon, tags: tg, src: 'osm'}; });
}
async function photon(c, r, cat, cuisine, signal){
  const b = bbox(c, r), [k, v] = CATS[cat].tags[0];
  const u = `https://photon.komoot.io/api/?q=${encodeURIComponent((cuisine ? cuisine.split('|')[0] + ' ' : '') + CATS[cat].q)}&lat=${c.lat}&lon=${c.lon}&limit=50&bbox=${b.w},${b.s},${b.e},${b.n}&osm_tag=${k}:${v}`;
  const res = await LZ.tfetch(u, {}, 12000, signal); if (!res.ok) throw new Error('photon ' + res.status);
  const j = await res.json();
  return (j.features || []).filter(f => f.properties && f.properties.name).map(f => { const p = f.properties, [lon, lat] = f.geometry.coordinates; return {id: (p.osm_type || 'N').toLowerCase()[0] + '/' + p.osm_id, osmType: p.osm_type, lat, lon, tags: {name: p.name, [p.osm_key]: p.osm_value, 'addr:street': p.street || '', 'addr:housenumber': p.housenumber || '', 'addr:city': p.city || ''}, src: 'osm'}; });
}
async function findNearby(c, r, cat, cuisine, signal, log){
  let list = null, used = '';
  const ov = overpass(c, r, cat, cuisine, signal).then(x => (used = used || 'ov', x));
  // don't wait forever on busy mirrors: after 4s also ask the geocoder in parallel
  const nm = LZ.sleep(4000, signal).then(() => nominatim(c, r, cat, cuisine, signal));
  try { list = await Promise.any([ov.then(x => { if (!x.length && cuisine) throw new Error('empty'); return x; }), nm.then(x => { if (!x.length) throw new Error('empty'); return x; })]); }
  catch(e){ if (signal && signal.aborted) throw LZ.abortErr(); }
  if (!list || !list.length){ log('Trying another map source'); try { list = await photon(c, r, cat, cuisine, signal); } catch(e){ if (signal && signal.aborted) throw LZ.abortErr(); } }
  if ((!list || !list.length) && cuisine) return findNearby(c, r, cat, '', signal, log);
  return list || [];
}

/* ================= PHOTOS =================
   Only photos linked to the place itself: OSM image tag → Wikidata P18 → Wikipedia article image → the place's own website og:image → category illustration.
   Never nearby/geosearch photos (they can show the wrong place). */
const commonsURL = (file, w = 400) => 'https://commons.wikimedia.org/wiki/Special:FilePath/' + encodeURIComponent(String(file).replace(/^(File|Image):/i, '')) + '?width=' + w;
const AGG_RX = /tripadvisor|facebook|fbcdn|instagram|wolt|10bis|tenbis|google\.|goo\.gl|yelp|foursquare|linktr|rest\.co\.il|easy\.co\.il|zap\.co\.il|booking\.com|airbnb|tiktok|twitter|x\.com|youtube|wix(static)?\.com\/?$|ontopo|tabit|mishloha|zomato|opentable|thefork|ubereats|deliveroo/i;
async function photos(p, signal, cat){
  const tg = p.tags, out = [];
  const add = u => { if (u && !out.includes(u)) out.push(u); };
  if (tg.image){ if (/^https?:\/\/.*\.(jpe?g|png|webp)(\?|$)/i.test(tg.image)) add(tg.image); else if (/commons\.wikimedia\.org\/wiki\/File:(.+)$/i.test(tg.image)) add(commonsURL(decodeURIComponent(tg.image.match(/File:(.+)$/i)[1]))); else if (/^File:/i.test(tg.image)) add(commonsURL(tg.image)); }
  if (tg.wikimedia_commons && /^File:/i.test(tg.wikimedia_commons)) add(commonsURL(tg.wikimedia_commons));
  try {
    if (tg.wikidata && /^Q\d+$/.test(tg.wikidata)){
      const r = await LZ.tfetch(`https://www.wikidata.org/w/api.php?action=wbgetclaims&format=json&origin=*&entity=${tg.wikidata}&property=P18`, {}, 8000, signal);
      const j = await r.json(); ((j.claims && j.claims.P18) || []).slice(0, 2).forEach(c => add(commonsURL(c.mainsnak.datavalue.value)));
    }
    if (out.length < 2 && tg.wikipedia && /^[a-z]{2,3}:.+/.test(tg.wikipedia)){
      const [lg, ...rest] = tg.wikipedia.split(':');
      const r = await LZ.tfetch(`https://${lg}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(rest.join(':').replace(/ /g, '_'))}`, {}, 8000, signal);
      if (r.ok){ const j = await r.json(); add(j.originalimage && j.thumbnail ? j.thumbnail.source.replace(/\/\d+px-/, '/640px-') : j.thumbnail && j.thumbnail.source); if (j.extract) p.wiki = j.extract.slice(0, 300); }
    }
  } catch(e){ if (e.name === 'AbortError') throw e; }
  // the place's own website: its share image (og:image), read through the page reader
  if (!out.length && (tg.website || tg['contact:website'])){
    try {
      const w = tg.website || tg['contact:website'], u = /^https?:/.test(w) ? w : 'https://' + w;
      // directory/social pages are not the place's own site — their share image is the directory's logo, never the place
      if (AGG_RX.test(LZ.domainOf(u))) return out.slice(0, 3);
      const r = await LZ.tfetch('https://r.jina.ai/' + u, {headers: {Accept: 'application/json', 'X-Retain-Images': 'none', 'X-Return-Format': 'text'}}, 10000, signal);
      if (r.ok){ const j = await r.json(), md = (j.data && j.data.metadata) || {}; let img = md['og:image'] || md['twitter:image'] || md['og:image:url'] || md['og:image:secure_url'];
        if (Array.isArray(img)) img = img[0];
        if (img && !/logo|favicon|icon|default|placeholder|share[-_]?image|\.svg(\?|$)/i.test(img) && !AGG_RX.test(img)){ try { add(new URL(img, u).href); } catch(_){} } }
    } catch(e){ if (e.name === 'AbortError') throw e; }
  }
  return out.slice(0, 3);
}
function illustration(cat){
  const c = CATS[cat] || CATS.attraction, [a, b] = c.col;
  return 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}" stop-opacity=".55"/><stop offset="1" stop-color="#03140c"/></linearGradient><radialGradient id="r" cx=".7" cy=".2" r=".8"><stop offset="0" stop-color="${b}" stop-opacity=".5"/><stop offset="1" stop-color="${b}" stop-opacity="0"/></radialGradient></defs><rect width="320" height="180" fill="#04110a"/><rect width="320" height="180" fill="url(#g)"/><rect width="320" height="180" fill="url(#r)"/><g fill="none" stroke="#fff" stroke-opacity=".08"><circle cx="60" cy="150" r="60"/><circle cx="60" cy="150" r="95"/><circle cx="270" cy="20" r="50"/></g><text x="160" y="112" font-size="64" text-anchor="middle">${c.e}</text></svg>`);
}

/* ================= DETAILS ================= */
function pname(tg, lg){ return tg['name:' + lg] || tg.name || tg['name:en']; }
function typeLabel(p, cat){
  const tg = p.tags, cu = tg.cuisine ? tg.cuisine.split(';').slice(0, 2).map(x => x.replace(/_/g, ' ')).join(', ') : '';
  const base = t(({restaurant:'Restaurant', cafe:'Café', bar:'Bar', fast_food:'Fast food', ice_cream:'Ice cream', bakery:'Bakery', museum:'Museum', gallery:'Gallery', attraction:'Attraction', park:'Park', beach:'Beach', playground:'Playground', hotel:'Hotel', pharmacy:'Pharmacy', hospital:'Hospital / clinic', supermarket:'Supermarket', fuel:'Gas station', charging:'EV charging', atm:'ATM / bank', cinema:'Cinema', theatre:'Theatre', gym:'Gym', library:'Library', parking:'Parking', zoo:'Zoo'})[cat] || 'Place');
  return cu ? base + ' · ' + cu : base;
}
function addr(tg){ const s = [tg['addr:street'] && (tg['addr:street'] + (tg['addr:housenumber'] ? ' ' + tg['addr:housenumber'] : '')), tg['addr:city']].filter(Boolean).join(', '); return s; }
async function reverse(p, signal){
  try { const r = await LZ.tfetch(`https://photon.komoot.io/reverse?lat=${p.lat}&lon=${p.lon}&limit=1`, {}, 7000, signal); const j = await r.json(); const pr = j.features && j.features[0] && j.features[0].properties; if (pr) return [pr.street && (pr.street + (pr.housenumber ? ' ' + pr.housenumber : '')), pr.city || pr.district].filter(Boolean).join(', '); } catch(e){ if (e.name === 'AbortError') throw e; }
  return '';
}
function hoursNice(h){ return String(h || '').replace(/;\s*/g, ' · ').replace(/\bMo\b/g, t('Mon')).replace(/\bTu\b/g, t('Tue')).replace(/\bWe\b/g, t('Wed')).replace(/\bTh\b/g, t('Thu')).replace(/\bFr\b/g, t('Fri')).replace(/\bSa\b/g, t('Sat')).replace(/\bSu\b/g, t('Sun')).replace(/\bPH\b/g, t('Holidays')).replace(/\boff\b/g, t('closed')); }
// tiny opening_hours evaluator for common forms: "Mo-Fr 09:00-18:00; Sa 10:00-14:00", "24/7"
function openNow(h){
  if (!h) return null; if (/24\/7/.test(h)) return true;
  const D = ['Su','Mo','Tu','We','Th','Fr','Sa'], now = new Date(), d = now.getDay(), mins = now.getHours() * 60 + now.getMinutes();
  let res = null;
  for (const part of h.split(';')){
    const m = part.trim().match(/^((?:[A-Z][a-z](?:-[A-Z][a-z])?,?)+)?\s*((?:\d\d:\d\d-\d\d:\d\d,?)+|off|closed)$/); if (!m) continue;
    let days = true;
    if (m[1]){ days = m[1].split(',').some(r => { const [a, b] = r.split('-').map(x => D.indexOf(x)); if (a < 0) return false; if (b == null || b < 0) return a === d; return a <= b ? d >= a && d <= b : d >= a || d <= b; }); }
    if (!days) continue;
    if (/off|closed/.test(m[2])){ res = false; continue; }
    res = m[2].split(',').some(r => { const [s, e] = r.split('-').map(x => +x.slice(0, 2) * 60 + +x.slice(3)); return e > s ? mins >= s && mins < e : mins >= s || mins < e; });
  }
  return res;
}

/* ================= PLACES TOOL ================= */
async function understand(text, signal){
  const cat0 = catFor(text);
  const rm = text.match(/(\d+(?:[.,]\d+)?)\s*(km|kilomet|ק"מ|קמ|קילומטר|كم|كيلو|m\b|meter|metre|מטר|م\b|متر)/i);
  let radius = rm ? parseFloat(rm[1].replace(',', '.')) * (/^(m\b|meter|metre|מטר|م\b|متر)/i.test(rm[2]) ? 1 : 1000) : 0;
  let j = null;
  try {
    j = await LZ.chatJSON([{role:'system', content:`Extract a nearby-places search from the user message. Return ONLY JSON {"category":one of [${Object.keys(CATS).join(',')}],"cuisine":"OSM cuisine values joined by | (e.g. sushi|japanese) or empty","radius_m":number or 0,"near":"a named place/city/address the user wants to search around, or empty if they mean their own location","count":number of places wanted (default 5, max 8),"want":"short phrase of what makes a place good for them (e.g. romantic, kid-friendly, cheap), in English"}`}, {role:'user', content: text}], {tier:'fera', maxTokens: 200, signal, temperature: 0});
  } catch(e){ if (e.name === 'AbortError') throw e; }
  const cat = (j && CATS[j.category]) ? j.category : (cat0 || 'restaurant');
  if (!radius && j && +j.radius_m > 0) radius = +j.radius_m;
  return {cat, cuisine: (j && j.cuisine) ? String(j.cuisine).toLowerCase().replace(/[^a-z_|]/g, '') : '', radius: Math.max(200, Math.min(radius || 1500, 25000)), near: (j && j.near && !NEAR_RX.test(j.near)) ? String(j.near) : '', count: Math.max(3, Math.min(+(j && j.count) || 5, 8)), want: (j && j.want) || ''};
}
async function geocode(q, signal, around){
  const vb = around ? (() => { const b = bbox(around, 30000); return `&viewbox=${b.w},${b.n},${b.e},${b.s}`; })() : '';
  const r = await LZ.tfetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(q)}${vb}`, {}, 12000, signal);
  const j = await r.json(); if (!j.length) return null; return {lat: +j[0].lat, lon: +j[0].lon, name: j[0].display_name.split(',')[0], label: j[0].display_name};
}
async function runPlaces(text, ctx){
  const {work, signal} = ctx, lg = langOf(text), log = x => work.log(x);
  log('Understanding what you are looking for');
  const [q, here] = await Promise.all([understand(text, signal), get()]);
  let center = here, centerLabel = t('your location');
  if (q.near){ log('Finding ' + q.near); const g = await geocode(q.near, signal, here).catch(() => null); if (g){ center = g; centerLabel = g.name; } }
  if (!center) return {content: ({he:'כדי למצוא מקומות קרובים אני צריך את המיקום שלך 📍 אפשר לאשר מיקום בהגדרות ← מיקום, או לכתוב עיר/כתובת, למשל: "מסעדות טובות ליד דיזנגוף סנטר".', ar:'أحتاج إلى موقعك للعثور على أماكن قريبة 📍 فعّل الموقع من الإعدادات ← الموقع، أو اكتب مدينة/عنوانًا.'}[lg] || "To find places near you I need your location 📍 Turn it on in Settings → Location, or name a city or address, e.g. “best sushi near Dizengoff Center”."), cards: [{type:'geo-enable', data:{}, summary:'Asked the user to enable location'}]};
  log(`Searching OpenStreetMap · ${CATS[q.cat].e} ${q.cat.replace('_', ' ')} within ${fmtDist(q.radius)}`);
  let list = await findNearby(center, q.radius, q.cat, q.cuisine, signal, log);
  list.forEach(p => p.d = dist(center, p));
  let inR = list.filter(p => p.d <= q.radius * 1.05), widened = false;
  if (inR.length < 3 && q.radius < 5000){ log('Few results — widening the search'); const more = await findNearby(center, q.radius * 2.5, q.cat, q.cuisine, signal, log); more.forEach(p => p.d = dist(center, p)); list = more; inR = more.filter(p => p.d <= q.radius * 2.6); widened = true; }
  // de-dupe by name, prefer richer data
  const seen = new Map();
  inR.forEach(p => { const k = (p.tags.name || '').toLowerCase().trim(); const rich = Object.keys(p.tags).length; if (!seen.has(k) || Object.keys(seen.get(k).tags).length < rich) seen.set(k, p); });
  let cands = [...seen.values()].sort((a, b) => (Object.keys(b.tags).length > 4) - (Object.keys(a.tags).length > 4) || a.d - b.d).slice(0, 24).sort((a, b) => a.d - b.d);
  if (!cands.length) return {content: ({he:`לא מצאתי ${CATS[q.cat].e} במרחק ${fmtDist(q.radius)} מ${centerLabel}. נסו רדיוס גדול יותר או קטגוריה אחרת.`, ar:`لم أجد نتائج ضمن ${fmtDist(q.radius)}. جرّب نطاقًا أوسع.`}[lg] || `I couldn't find any ${CATS[q.cat].q} places within ${fmtDist(q.radius)} of ${centerLabel}. Try a bigger radius or another category.`)};
  log(`Found ${cands.length} candidates · ranking the best`);
  const brief = cands.map((p, i) => { const tg = p.tags; return `${i}. ${tg.name}${tg['name:en'] && tg['name:en'] !== tg.name ? ' (' + tg['name:en'] + ')' : ''} — ${Math.round(p.d)}m; ${['cuisine', 'diet:vegan', 'diet:vegetarian', 'outdoor_seating', 'opening_hours', 'website', 'wikidata', 'wikipedia', 'stars', 'description', 'fee', 'wheelchair'].filter(k => tg[k]).map(k => k + '=' + String(tg[k]).slice(0, 60)).join('; ')}`; }).join('\n');
  let rank = null;
  try {
    rank = await LZ.chatJSON([{role:'system', content:`You recommend places from REAL OpenStreetMap data. Pick the ${q.count} best candidates for the user's request (balance relevance, how well-known/notable they are — wikidata/wikipedia/website suggest notability —, data richness, and distance). NEVER invent ratings, reviews, prices or facts not in the data; you may use general well-known knowledge about famous places only if you are sure. Return ONLY JSON {"intro":"1-2 friendly sentences in ${LN[lg]}","picks":[{"i":candidate number,"why":"one short sentence in ${LN[lg]} on why it fits"}]}`}, {role:'user', content:`Request: ${text}\nWhat matters: ${q.want || 'overall quality'}\nCandidates:\n${brief}`}], {tier: ctx.tier, maxTokens: 900, signal, onStatus: log});
  } catch(e){ if (e.name === 'AbortError') throw e; }
  let picks = (rank && Array.isArray(rank.picks) ? rank.picks : []).filter(x => cands[+x.i]).slice(0, q.count);
  { const seen = new Set(); picks = picks.filter(x => !seen.has(+x.i) && seen.add(+x.i));
    // the model may pick fewer than asked — top up with the nearest remaining candidates (keeping its descriptions)
    for (let i = 0; i < cands.length && picks.length < Math.min(q.count, cands.length); i++) if (!seen.has(i)){ seen.add(i); picks.push({i, why: ''}); } }
  log('Getting photos & details');
  const places = await Promise.all(picks.map(async (pk) => {
    const p = cands[+pk.i], tg = p.tags;
    const [ph, ad] = await Promise.all([photos(p, signal, q.cat).catch(() => []), addr(tg) ? Promise.resolve(addr(tg)) : reverse(p, signal)]);
    return {id: p.id, name: pname(tg, lg), alt: tg.name !== pname(tg, lg) ? tg.name : '', lat: p.lat, lon: p.lon, d: Math.round(p.d), type: typeLabel(p, q.cat), cat: q.cat, photos: ph, address: ad, hours: tg.opening_hours || '', phone: tg.phone || tg['contact:phone'] || '', website: tg.website || tg['contact:website'] || '', stars: tg.stars && /^\d(\.\d)?S?$/.test(tg.stars) ? parseFloat(tg.stars) : 0, why: pk.why || '', wiki: p.wiki || '', osm: p.osmType && p.id ? 'https://www.openstreetmap.org/' + ({n:'node', w:'way', r:'relation'}[p.id[0]] || 'node') + '/' + p.id.split('/')[1] : ''};
  }));
  log('Done');
  const intro = (rank && rank.intro) || ({he:'הנה המקומות הכי מומלצים שמצאתי בקרבת מקום:', ar:'إليك أفضل الأماكن القريبة التي وجدتها:'}[lg] || 'Here are the best places I found nearby:');
  return {content: intro + (widened ? '\n\n_' + ({he:'הרחבתי מעט את טווח החיפוש כדי למצוא מספיק תוצאות.', ar:'وسّعت نطاق البحث قليلًا.'}[lg] || 'I widened the search a little to find enough results.') + '_' : ''),
    cards: [{type:'places', data:{places, center: {lat: center.lat, lon: center.lon, label: centerLabel}, lang: lg, radius: q.radius, cat: q.cat}, summary: 'You showed place cards: ' + places.map(p => `${p.name} (${p.d} m, lat ${p.lat.toFixed(5)}, lon ${p.lon.toFixed(5)})`).join('; ')}]};
}

/* ---------- place cards ---------- */
function PlacesCard(d){
  const box = el('div', 'places'); box.setAttribute('data-noi18n', '');
  const L = k => ({he:{nav:'ניווט', maps:'פתח בגוגל מפות', open:'פתוח עכשיו', closed:'סגור עכשיו', away:'ממך', site:'אתר', call:'התקשר', hours:'שעות', from:'מ'}, ar:{nav:'الملاحة', maps:'افتح في خرائط Google', open:'مفتوح الآن', closed:'مغلق الآن', away:'منك', site:'الموقع', call:'اتصال', hours:'الساعات', from:'من'}}[d.lang] || {nav:'Navigate', maps:'Open in Google Maps', open:'Open now', closed:'Closed now', away:'away', site:'Website', call:'Call', hours:'Hours', from:'from'})[k];
  box.dir = d.lang === 'en' ? 'ltr' : 'rtl';
  d.places.forEach((p, i) => {
    const c = el('div', 'pl-card'); c.style.setProperty('--i', i);
    const ph = p.photos && p.photos.length ? p.photos : [illustration(p.cat)];
    const on = openNow(p.hours);
    c.innerHTML = `<div class="pl-media">${ph.map((u, k) => `<img loading="lazy" alt="" class="${k ? '' : 'on'}" referrerpolicy="no-referrer">`).join('')}${ph.length > 1 ? `<div class="pl-dots">${ph.map((u, k) => `<i class="${k ? '' : 'on'}"></i>`).join('')}</div>` : ''}<span class="pl-rank">${i + 1}</span><span class="pl-dist">📍 ${esc(fmtDist(p.d))}</span></div>
      <div class="pl-body"><div class="pl-type">${CATS[p.cat] ? CATS[p.cat].e : '📍'} <span></span></div><h4 dir="auto"></h4>${p.alt ? '<div class="pl-alt" dir="auto"></div>' : ''}
      ${p.stars ? `<div class="pl-stars" title="Official star classification (OpenStreetMap)">${'★'.repeat(Math.round(p.stars))}${'☆'.repeat(Math.max(0, 5 - Math.round(p.stars)))} <small>${p.stars}★ hotel</small></div>` : ''}
      ${p.why ? '<p class="pl-why" dir="auto"></p>' : ''}
      <ul class="pl-info">${p.address ? '<li class="a">🏠 <span dir="auto"></span></li>' : ''}${p.hours ? `<li class="h">🕒 ${on != null ? `<b class="${on ? 'open' : 'shut'}">${L(on ? 'open' : 'closed')}</b> · ` : ''}<span dir="ltr"></span></li>` : ''}${p.phone ? `<li>📞 <a dir="ltr" href="tel:${esc(p.phone.split(/[;,]/)[0].replace(/[^\d+]/g, ''))}">${esc(p.phone.split(/[;,]/)[0])}</a></li>` : ''}${p.website ? `<li>🌐 <a target="_blank" rel="noopener" href="${esc(/^https?:/.test(p.website) ? p.website : 'https://' + p.website)}">${esc(LZ.domainOf(/^https?:/.test(p.website) ? p.website : 'https://' + p.website))}</a></li>` : ''}</ul>
      <div class="pl-acts"><button class="btn-primary pl-nav">🧭 ${L('nav')}</button><a class="btn-ghost pl-gm" target="_blank" rel="noopener" href="${esc(gmapsSearch(p))}">🗺 ${L('maps')}</a></div></div>`;
    $$('.pl-media img', c).forEach((im, k) => { im.src = ph[k]; const bad = () => { im.onerror = im.onload = null; im.src = illustration(p.cat); }; im.onerror = bad; if (!/^data:/.test(ph[k])) im.onload = () => { const w = im.naturalWidth, h = im.naturalHeight; if (w < 160 || h < 110 || w / h > 3.2 || h / w > 2.2) bad(); else im.onload = null; }; });
    $('.pl-type span', c).textContent = p.type; $('h4', c).textContent = p.name;
    if (p.alt) $('.pl-alt', c).textContent = p.alt;
    if (p.why) $('.pl-why', c).textContent = p.why;
    if (p.address) $('.pl-info .a span', c).textContent = p.address;
    if (p.hours) $('.pl-info .h span', c).textContent = hoursNice(p.hours);
    if (ph.length > 1){ let k = 0; const imgs = $$('.pl-media img', c), dots = $$('.pl-dots i', c); $('.pl-media', c).onclick = () => { imgs[k].classList.remove('on'); dots[k].classList.remove('on'); k = (k + 1) % imgs.length; imgs[k].classList.add('on'); dots[k].classList.add('on'); }; }
    $('.pl-nav', c).onclick = () => A.sendText(({he:'נווט אותי אל ', ar:'وجّهني إلى '}[d.lang] || 'Navigate me to ') + p.name, {nav: {name: p.name, lat: p.lat, lon: p.lon, address: p.address, cat: p.cat}}, 'navigate');
    box.appendChild(c);
  });
  return box;
}
A.registerCard('places', PlacesCard);
A.registerCard('geo-enable', () => {
  const b = el('div', 'geo-inline'); b.innerHTML = `<button class="btn-primary">📍 ${esc(t('Allow location'))}</button>`;
  $('button', b).onclick = async () => { const p = await enable(); if (p){ b.innerHTML = `<span class="ok">✓ ${esc(t('Location enabled'))}</span>`; } };
  return b;
});

/* ================= NAVIGATION ================= */
const ROUTERS = {
  car: ['https://router.project-osrm.org/route/v1/driving/', 'https://routing.openstreetmap.de/routed-car/route/v1/driving/'],
  foot: ['https://routing.openstreetmap.de/routed-foot/route/v1/foot/', 'https://router.project-osrm.org/route/v1/foot/']
};
async function route(mode, a, b, signal){
  for (const base of ROUTERS[mode]){
    try {
      const r = await LZ.tfetch(`${base}${a.lon},${a.lat};${b.lon},${b.lat}?overview=full&geometries=geojson&steps=true`, {}, 12000, signal);
      if (!r.ok) continue; const j = await r.json(); if (j.code !== 'Ok' || !j.routes || !j.routes[0]) continue;
      const rt = j.routes[0];
      // the public demo's foot profile can actually be a car profile — sanity-check walking speed
      if (mode === 'foot' && rt.distance > 300 && rt.distance / rt.duration > 2.6) continue;
      const steps = []; rt.legs.forEach(l => l.steps.forEach(s => steps.push({type: s.maneuver.type, mod: s.maneuver.modifier || '', name: s.name || '', d: Math.round(s.distance), exit: s.maneuver.exit, loc: s.maneuver.location})));
      const line = rt.geometry.coordinates; const keep = line.length > 900 ? Math.ceil(line.length / 900) : 1;
      return {distance: rt.distance, duration: rt.duration, line: line.filter((p, i) => i % keep === 0 || i === line.length - 1).map(([x, y]) => [+y.toFixed(5), +x.toFixed(5)]), steps: steps.slice(0, 60)};
    } catch(e){ if (e.name === 'AbortError') throw e; }
  }
  return null;
}
const STEP = {
  en:{depart:'Head', arrive:'Arrive at your destination', turn:'Turn', 'new name':'Continue', continue:'Continue', merge:'Merge', 'on ramp':'Take the ramp', 'off ramp':'Take the exit', fork:'Keep', 'end of road':'Turn', roundabout:'At the roundabout, take exit', rotary:'At the roundabout, take exit', 'exit roundabout':'Exit the roundabout', notification:'Continue', left:'left', right:'right', 'slight left':'slightly left', 'slight right':'slightly right', 'sharp left':'sharp left', 'sharp right':'sharp right', straight:'straight', uturn:'make a U-turn', onto:'onto', on:'on'},
  he:{depart:'צאו', arrive:'הגעתם ליעד', turn:'פנו', 'new name':'המשיכו', continue:'המשיכו', merge:'השתלבו', 'on ramp':'עלו על המחלף', 'off ramp':'צאו במחלף', fork:'הישארו', 'end of road':'בסוף הדרך פנו', roundabout:'בכיכר צאו ביציאה', rotary:'בכיכר צאו ביציאה', 'exit roundabout':'צאו מהכיכר', notification:'המשיכו', left:'שמאלה', right:'ימינה', 'slight left':'קלות שמאלה', 'slight right':'קלות ימינה', 'sharp left':'חדות שמאלה', 'sharp right':'חדות ימינה', straight:'ישר', uturn:'בצעו פניית פרסה', onto:'ל', on:'ב'},
  ar:{depart:'انطلق', arrive:'وصلت إلى وجهتك', turn:'انعطف', 'new name':'تابع', continue:'تابع', merge:'اندمج', 'on ramp':'خذ المنحدر', 'off ramp':'خذ المخرج', fork:'ابقَ', 'end of road':'انعطف', roundabout:'عند الدوار خذ المخرج', rotary:'عند الدوار خذ المخرج', 'exit roundabout':'اخرج من الدوار', notification:'تابع', left:'يسارًا', right:'يمينًا', 'slight left':'قليلًا لليسار', 'slight right':'قليلًا لليمين', 'sharp left':'بحدة لليسار', 'sharp right':'بحدة لليمين', straight:'مباشرة', uturn:'استدر للخلف', onto:'إلى', on:'على'}
};
const ARROW = {left:'⬅', right:'➡', 'slight left':'↖', 'slight right':'↗', 'sharp left':'↙', 'sharp right':'↘', straight:'⬆', uturn:'↩'};
function stepText(s, lg){
  const W = STEP[lg] || STEP.en, verb = W[s.type] || W.continue, mod = s.mod ? (W[s.mod] || s.mod) : '';
  if (s.type === 'arrive') return W.arrive;
  if (s.type === 'roundabout' || s.type === 'rotary') return `${verb} ${s.exit || 1}${s.name ? ' ' + W.onto + ' ' + s.name : ''}`;
  if (s.type === 'depart') return `${verb}${mod ? ' ' + mod : ''}${s.name ? ' ' + W.on + ' ' + s.name : ''}`;
  return `${verb}${mod && s.type !== 'new name' && s.type !== 'continue' ? ' ' + mod : ''}${s.name ? ' ' + W.onto + ' ' + s.name : ''}`;
}
async function runNavigate(text, ctx){
  const {work, signal, um} = ctx, lg = langOf(text), log = x => work.log(x);
  let dest = um && um.meta && um.meta.nav;
  log('Getting your location');
  const here = await get();
  if (!here) return {content: ({he:'כדי לנווט אני צריך את המיקום שלך 📍', ar:'أحتاج إلى موقعك للملاحة 📍'}[lg] || 'To navigate I need your location 📍'), cards: [{type:'geo-enable', data:{}}]};
  if (!dest){
    const q = text.replace(/^(please\s+)?(navigate( me)?|take me|directions|route|get me)\s+(to\s+)?|^(נווט|תנווט)( אותי)?\s*(אל|ל)?|^קח אותי\s*(אל|ל)?|^(خذني|وجّهني|وجهني)\s*(إلى)?/i, '').trim();
    // a place from an earlier card in this chat?
    const prev = (ctx.conv.messages || []).flatMap(m => (m.cards || []).filter(c => c.type === 'places').flatMap(c => c.data.places));
    const hit = prev.find(p => q && (p.name.toLowerCase().includes(q.toLowerCase()) || q.toLowerCase().includes(p.name.toLowerCase())));
    if (hit) dest = hit;
    else { log('Finding ' + q); const g = await geocode(q, signal, here); if (!g) return {content: ({he:`לא מצאתי את "${q}" במפה.`, ar:`لم أجد "${q}" على الخريطة.`}[lg] || `I couldn't find “${q}” on the map.`)}; dest = {name: g.name, lat: g.lat, lon: g.lon, address: g.label}; }
  }
  log('Calculating driving & walking routes');
  const [car, foot] = await Promise.all([route('car', here, dest, signal), route('foot', here, dest, signal)]);
  if (!car && !foot) return {content: ({he:'לא הצלחתי לחשב מסלול כרגע — נסו שוב בעוד רגע.', ar:'تعذر حساب المسار الآن.'}[lg] || "I couldn't calculate a route right now — please try again in a moment.")};
  log('Drawing the map');
  const straight = dist(here, dest);
  const pref = straight < 1800 && foot ? 'foot' : (car ? 'car' : 'foot');
  const s1 = car ? `🚗 ${fmtDist(car.distance)} · ${fmtMin(car.duration)}` : '', s2 = foot ? `🚶 ${fmtDist(foot.distance)} · ${fmtMin(foot.duration)}` : '';
  const content = ({he:`הנה המסלול אל **${dest.name}**: ${[s1, s2].filter(Boolean).join(' · ')}.`, ar:`إليك المسار إلى **${dest.name}**: ${[s1, s2].filter(Boolean).join(' · ')}.`}[lg] || `Here's your route to **${dest.name}**: ${[s1, s2].filter(Boolean).join(' · ')}.`);
  return {content, cards: [{type:'route', data:{from: {lat: here.lat, lon: here.lon}, to: {name: dest.name, lat: dest.lat, lon: dest.lon, address: dest.address || ''}, car, foot, mode: pref, lang: lg}, summary: `You showed a route map to ${dest.name}` + (car ? `; drive ${Math.round(car.distance)} m / ${Math.round(car.duration / 60)} min` : '') + (foot ? `; walk ${Math.round(foot.distance)} m / ${Math.round(foot.duration / 60)} min` : '')}]};
}
/* ---------- route card (Leaflet) ---------- */
const LEAF = 'https://unpkg.com/leaflet@1.9.4/dist/';
async function leaflet(){ if (!document.querySelector(`link[href="${LEAF}leaflet.css"]`)){ const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = LEAF + 'leaflet.css'; document.head.appendChild(l); } await LZ.loadScript(LEAF + 'leaflet.js'); }
function RouteCard(d){
  const lg = d.lang || 'en';
  const L2 = k => ({he:{car:'רכב', foot:'הליכה', start:'התחל בגוגל מפות', steps:'הוראות דרך', you:'אתם כאן'}, ar:{car:'سيارة', foot:'مشي', start:'ابدأ في خرائط Google', steps:'الاتجاهات', you:'أنت هنا'}}[lg] || {car:'Drive', foot:'Walk', start:'Start in Google Maps', steps:'Directions', you:'You are here'})[k];
  const box = el('div', 'route-card'); box.setAttribute('data-noi18n', ''); box.dir = lg === 'en' ? 'ltr' : 'rtl';
  box.innerHTML = `<div class="rc-head"><span class="rc-ic">🧭</span><div class="rc-t"><b dir="auto"></b><small dir="auto"></small></div></div>
    <div class="rc-map"><div class="rc-loading">🗺️</div></div>
    <div class="rc-modes">${['car', 'foot'].map(m => d[m] ? `<button data-m="${m}" class="${d.mode === m ? 'on' : ''}"><span>${m === 'car' ? '🚗' : '🚶'} ${L2(m)}</span><b>${fmtMin(d[m].duration)}</b><small>${fmtDist(d[m].distance)}</small></button>` : '').join('')}</div>
    <details class="rc-steps"><summary>📋 ${L2('steps')} <span class="n"></span></summary><ol></ol></details>
    <a class="btn-primary rc-go" target="_blank" rel="noopener">▶ ${L2('start')}</a>`;
  $('.rc-t b', box).textContent = d.to.name; $('.rc-t small', box).textContent = d.to.address || '';
  let map = null, poly = null, mode = d.mode;
  const paint = () => {
    const r = d[mode]; if (!r) return;
    $$('.rc-modes button', box).forEach(b => b.classList.toggle('on', b.dataset.m === mode));
    $('.rc-go', box).href = gmapsDir(d.to, mode);
    const ol = $('.rc-steps ol', box); ol.innerHTML = '';
    r.steps.forEach(s => { const li = el('li'); li.innerHTML = `<span class="ar">${s.type === 'arrive' ? '🏁' : s.type === 'depart' ? '📍' : (ARROW[s.mod] || '⬆')}</span><span class="tx" dir="auto"></span><span class="dd">${s.d ? fmtDist(s.d) : ''}</span>`; $('.tx', li).textContent = stepText(s, lg); ol.appendChild(li); });
    $('.rc-steps .n', box).textContent = '(' + r.steps.length + ')';
    if (map && window.L){ if (poly) poly.remove(); poly = L.polyline(r.line, {color: mode === 'foot' ? '#7dffcf' : getComputedStyle(document.documentElement).getPropertyValue('--acc').trim() || '#00ff9c', weight: 5, opacity: .9, dashArray: mode === 'foot' ? '2 9' : null, lineCap:'round'}).addTo(map); map.fitBounds(poly.getBounds(), {padding: [28, 28]}); }
  };
  $('.rc-modes', box).onclick = e => { const b = e.target.closest('button'); if (!b) return; mode = b.dataset.m; paint(); };
  paint();
  const init = async () => {
    try {
      await leaflet(); if (!box.isConnected) return;
      const host = $('.rc-map', box); host.innerHTML = '';
      map = L.map(host, {zoomControl: true, attributionControl: true, scrollWheelZoom: false, tap: true});
      // keyless OpenStreetMap tiles, darkened with a CSS filter (.rc-map .leaflet-tile-pane)
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom: 19, attribution: '© OpenStreetMap contributors', crossOrigin: true}).addTo(map);
      const dot = (cls, html) => L.divIcon({className: 'rc-pin ' + cls, html, iconSize: [30, 30], iconAnchor: [15, 15]});
      L.marker([d.from.lat, d.from.lon], {icon: dot('me', '<i></i>'), title: L2('you')}).addTo(map);
      L.marker([d.to.lat, d.to.lon], {icon: dot('dest', '<svg viewBox="0 0 24 24"><path d="M12 2a7 7 0 00-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 00-7-7zm0 9.5A2.5 2.5 0 1112 6.5a2.5 2.5 0 010 5z"/></svg>'), title: d.to.name}).addTo(map);
      paint();
      new ResizeObserver(() => map && map.invalidateSize()).observe(host);
    } catch(e){ $('.rc-map', box).innerHTML = `<div class="rc-loading">⚠️ ${esc(t('Map could not load'))}</div>`; }
  };
  const io = new IntersectionObserver(es => { if (es.some(x => x.isIntersecting)){ io.disconnect(); init(); } }); 
  requestAnimationFrame(() => io.observe(box));
  return box;
}
A.registerCard('route', RouteCard);

/* ================= REGISTER TOOLS ================= */
A.registerTool({id:'places', icon:'📍', label:'Places near you', test: isPlaces, run: runPlaces});
A.registerTool({id:'navigate', icon:'🧭', label:'Navigation', test: tx => /^(please\s+)?(navigate|directions to|route to|take me to|how do i get to)|^(נווט|תנווט|קח אותי|איך מגיעים|מסלול ל)|^(خذني|وجّهني|وجهني|كيف أصل)/i.test(tx.trim()), run: runNavigate});

/* ================= SETTINGS SECTION ================= */
A.registerSettings && A.registerSettings({id:'location', title:'Location', render(sec){
  const st = locStore();
  sec.innerHTML = `<h3>${esc(t('Location'))}</h3>
  <div class="set-row"><div class="lbl"><b>${esc(t('Use my location'))}</b><small>${esc(t('For nearby places, weather and routes. Stays on this device.'))}</small></div><label class="switch"><input type="checkbox" id="locOn" ${st.choice === 'allow' ? 'checked' : ''}><span></span></label></div>
  <div class="set-row"><div class="lbl"><b>${esc(t('Status'))}</b><small id="locStat"></small></div><button class="btn-ghost" id="locTest">📍 ${esc(t('Locate me'))}</button></div>
  <div class="set-row col"><div class="lbl"><b>${esc(t('Manual location'))}</b><small>${esc(t('Optional: a city or address to use instead of GPS'))}</small></div><div class="lab-row"><input type="text" id="locManual" dir="auto" style="flex:1" placeholder="e.g. Tel Aviv, Rothschild Blvd" value="${esc(st.manual ? st.manual.label : '')}"><button class="btn-ghost" id="locSet">${esc(t('Save'))}</button></div></div>`;
  const stat = () => { const s = locStore(); $('#locStat', sec).textContent = s.manual ? t('Manual') + ': ' + s.manual.label : s.choice === 'allow' ? (s.last ? t('On') + ' · ' + s.last.lat.toFixed(4) + ', ' + s.last.lon.toFixed(4) : t('On')) : s.blocked ? t('Blocked in the browser') : t('Off'); };
  stat();
  $('#locOn', sec).onchange = async e => { if (e.target.checked){ const p = await enable(); if (!p) e.target.checked = false; } else saveLoc({choice:'deny'}); stat(); };
  $('#locTest', sec).onclick = async () => { const p = await enable(); $('#locOn', sec).checked = !!p; stat(); };
  $('#locSet', sec).onclick = async () => { const v = $('#locManual', sec).value.trim(); if (!v){ saveLoc({manual: null}); stat(); return; } const g = await geocode(v).catch(() => null); if (!g) return A.toast(t('Could not find that place'), 'err'); saveLoc({manual: {lat: g.lat, lon: g.lon, label: g.label.split(',').slice(0, 2).join(','), ts: Date.now()}}); A.toast(t('Saved')); stat(); };
}});

window.Geo = {get, enable, prompt, dist, fmtDist, store: locStore, CATS};
firstVisit();
})();
