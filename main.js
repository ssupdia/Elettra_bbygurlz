// ============================================================
// Le chiavi di Supabase stanno in config.js (così, quando sostituisci
// main.js con una versione nuova, non perdi il collegamento).
// ============================================================
// config.js ha la precedenza; se la pagina fosse una copia vecchia che non lo carica,
// si usano questi valori (la chiave publishable è fatta per essere pubblica).
const CONFIG = window.ELETTRA_CONFIG || {
  url: 'https://tnrpttyhlamcnwravmik.supabase.co',
  key: 'sb_publishable_3iiRaVZvcvP83fqa28ZPUA_WV4nw1zE'
};
const SUPABASE_URL = CONFIG.url || '';
const SUPABASE_ANON_KEY = CONFIG.key || '';

const configurato = SUPABASE_URL.startsWith('https://') && SUPABASE_ANON_KEY.length > 20
  && !SUPABASE_URL.includes('INCOLLA') && !SUPABASE_ANON_KEY.includes('INCOLLA');
const db = configurato && window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// ---------- Tab della cultura pop ----------
document.querySelectorAll('.tab').forEach(function (tab) {
  tab.addEventListener('click', function () {
    document.querySelectorAll('.tab').forEach(function (t) { t.setAttribute('aria-selected', 'false'); });
    document.querySelectorAll('.panel').forEach(function (p) { p.classList.remove('on'); });
    tab.setAttribute('aria-selected', 'true');
    document.getElementById(tab.dataset.p).classList.add('on');
  });
});

// ---------- Apertura della lettera ----------
const btnLetter = document.getElementById('openLetter');
const paper = document.getElementById('paper');
btnLetter.addEventListener('click', function () {
  const aperta = paper.hidden;
  paper.hidden = !aperta;
  btnLetter.setAttribute('aria-expanded', String(aperta));
  btnLetter.textContent = aperta ? 'Chiudi la lettera' : 'Apri la lettera';
  if (aperta) paper.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
});

// ---------- Prima e dopo: a tutto schermo dopo la lettera ----------
(function () {
  const ba = document.getElementById('ba');
  if (!ba) return;
  const bottoneX = document.getElementById('baClose');
  const fine = document.getElementById('baFine');
  const rivedi = document.getElementById('baReplay');
  const sito = document.querySelectorAll('body > nav, body > header, body > section, body > footer');
  let apertoDa = null, giaMostrato = false, attesa = null, chiusura = null;

  function apri() {
    if (ba.classList.contains('on') && !ba.classList.contains('out')) return;
    clearTimeout(chiusura);
    apertoDa = document.activeElement;
    ba.classList.remove('out', 'in');
    ba.classList.add('on');
    void ba.offsetWidth; // l'animazione riparte da capo anche alla seconda apertura
    ba.classList.add('in');
    document.documentElement.classList.add('ba-aperto');
    sito.forEach(function (el) { el.inert = true; });
    bottoneX.focus({ preventScroll: true });
  }
  function chiudi() {
    if (!ba.classList.contains('on') || ba.classList.contains('out')) return;
    ba.classList.remove('in');
    ba.classList.add('out');
    sito.forEach(function (el) { el.inert = false; });
    document.documentElement.classList.remove('ba-aperto');
    chiusura = setTimeout(function () {
      ba.classList.remove('on', 'out');
      if (apertoDa && apertoDa.focus) apertoDa.focus({ preventScroll: true });
    }, 520);
  }
  bottoneX.addEventListener('click', chiudi);
  rivedi.addEventListener('click', apri);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') chiudi(); });

  // Quando la lettera è aperta compare il pulsante; appena arriva in vista, dopo un istante parte da solo (una volta sola)
  btnLetter.addEventListener('click', function () { if (!paper.hidden) fine.hidden = false; });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (voci) {
      voci.forEach(function (v) {
        clearTimeout(attesa);
        if (v.isIntersecting && !fine.hidden && !giaMostrato && !ba.classList.contains('on')) {
          attesa = setTimeout(function () { giaMostrato = true; apri(); }, 1400);
        }
      });
    }, { threshold: 0.9 }).observe(fine);
  }
})();

// ---------- Lightbox ----------
const box = document.getElementById('lightbox');
const boxImg = box.querySelector('img');
const boxVideo = box.querySelector('video');
document.addEventListener('click', function (e) {
  if (!e.target.matches('.ph:not(.track) img, .ph:not(.track) video')) return;
  if (e.target.tagName === 'VIDEO') {
    boxImg.hidden = true;
    boxVideo.hidden = false;
    boxVideo.src = e.target.dataset.src || e.target.currentSrc;
    boxVideo.play().catch(function () { /* resta in pausa: basta premere Play */ });
  } else {
    boxVideo.hidden = true;
    boxImg.hidden = false;
    boxImg.src = e.target.src;
    boxImg.alt = e.target.alt;
  }
  box.classList.add('on');
});
function chiudiBox() {
  box.classList.remove('on');
  boxImg.removeAttribute('src');
  boxVideo.pause();
  boxVideo.removeAttribute('src');
  boxVideo.load();
}
document.getElementById('closeBox').addEventListener('click', chiudiBox);
box.addEventListener('click', function (e) { if (e.target === box) chiudiBox(); });
document.addEventListener('keydown', function (e) { if (e.key === 'Escape') chiudiBox(); });

// ---------- Gallerie ----------
// Ogni <div class="gallery" data-folder="nome" data-slots="N"> mostra:
//  1) le foto del bucket Supabase "photos", cartella "nome" (ordine alfabetico)
//  2) altrimenti le foto locali foto/nome/1.jpg, 2.jpg ...
//  3) altrimenti dei riquadri colorati segnaposto
const RE_VIDEO = /\.(mp4|webm|mov|m4v)(\?|#|$)/i;

function creaFoto(src, alt) {
  const fig = document.createElement('figure');
  fig.className = 'ph';
  if (RE_VIDEO.test(src)) {
    const v = document.createElement('video');
    v.src = src + '#t=0.1'; // mostra un fotogramma come anteprima
    v.dataset.src = src;
    v.muted = true;
    v.playsInline = true;
    v.preload = 'metadata';
    v.setAttribute('aria-label', alt);
    fig.classList.add('vid');
    fig.appendChild(v);
    return fig;
  }
  const img = document.createElement('img');
  img.src = src;
  img.alt = alt;
  img.loading = 'lazy';
  fig.appendChild(img);
  return fig;
}

// Un mosaico non ha buchi se le tessere sono un multiplo di 6 oppure un multiplo di 6 più 4:
// ogni blocco da 6 (una alta, una larga) riempie due righe, le ultime 4 tessere una riga intera.
function numeroSenzaBuchi(n, mosaico) {
  if (!mosaico) { while (n % 4 !== 0) n++; return n; }
  while (n % 6 !== 0 && n % 6 !== 4) n++;
  return n;
}

// Se le foto caricate sono meno del necessario (data-fill) o non completano l'ultimo blocco,
// ripete le prime così la griglia non ha mai buchi.
function riempiBuchi(g) {
  const minimo = parseInt(g.dataset.fill, 10) || 0;
  const tessere = Array.from(g.children);
  if (!tessere.length || minimo === 1) return;
  const totale = numeroSenzaBuchi(Math.max(tessere.length, minimo), g.classList.contains('mosaic'));
  for (let i = 0; g.children.length < totale; i++) g.appendChild(tessere[i % tessere.length].cloneNode(true));
  assegnaMosaico(g);
}

// Nel mosaico: la 1ª tessera di ogni blocco da 6 è alta, la 4ª è larga.
function assegnaMosaico(g) {
  if (!g.classList.contains('mosaic')) return;
  const blocchi = Math.floor(g.children.length / 6) * 6;
  Array.from(g.children).forEach(function (t, i) {
    t.classList.toggle('alta', i < blocchi && i % 6 === 0);
    t.classList.toggle('larga', i < blocchi && i % 6 === 3);
  });
}

function riempiSegnaposto(g) {
  const cartella = g.dataset.folder;
  const n = parseInt(g.dataset.slots, 10) || 6;
  for (let i = 1; i <= n; i++) {
    const fig = creaFoto('foto/' + cartella + '/' + i + '.jpeg', 'Foto ' + i);
    const label = document.createElement('span');
    label.textContent = (g.dataset.label || 'Foto') + ' ' + i;
    fig.prepend(label);
    fig.querySelector('img').onerror = function () { this.remove(); };
    g.appendChild(fig);
  }
  assegnaMosaico(g);
}

async function caricaDaSupabase(g) {
  if (!db) return;
  const cartella = g.dataset.folder;
  try {
    const { data, error } = await db.storage.from('photos').list(cartella, {
      limit: 60, sortBy: { column: 'name', order: 'asc' }
    });
    if (error || !data) return;
    const file = data.filter(function (f) { return /\.(jpe?g|png|webp|gif|mp4|webm|mov|m4v)$/i.test(f.name); }).sort(ORDINE_NUMERICO);
    if (!file.length) return;
    // didascalie facoltative dalla tabella photo_captions (solo quelle non vuote)
    const didascalie = {};
    try {
      const r = await db.from('photo_captions').select('file_name, caption').eq('folder', cartella);
      (r.data || []).forEach(function (x) { if (x.caption) didascalie[x.file_name] = x.caption; });
    } catch (e) { /* senza didascalie le foto si vedono lo stesso */ }
    g.textContent = '';
    file.forEach(function (f, i) {
      const url = db.storage.from('photos').getPublicUrl(cartella + '/' + f.name).data.publicUrl;
      const fig = creaFoto(url, didascalie[f.name] || ('Elettra, ' + cartella + ' ' + (i + 1)));
      fig.dataset.path = cartella + '/' + f.name; // per la modalità ?debug
      const media = fig.querySelector('img, video');
      media.dataset.bucket = 'photos';
      media.dataset.percorso = cartella + '/' + f.name;
      if (didascalie[f.name]) {
        const c = document.createElement('figcaption');
        c.textContent = didascalie[f.name];
        fig.appendChild(c);
      }
      g.appendChild(fig);
    });
    riempiBuchi(g);
  } catch (err) {
    console.error('Foto "' + cartella + '" non caricate da Supabase:', err);
  }
}

document.querySelectorAll('.gallery[data-folder]').forEach(function (g) {
  riempiSegnaposto(g);
  caricaDaSupabase(g);
});

// ---------- Lettera da Supabase ----------
// Tabella "letter": id = 1, body = testo (paragrafi separati da una riga vuota), signature = firma
async function caricaLettera() {
  if (!db) return;
  try {
    const { data, error } = await db.from('letter').select('body, signature').eq('id', 1).single();
    if (error || !data) return;
    paper.textContent = '';
    data.body.split(/\n\s*\n/).forEach(function (testo) {
      const p = document.createElement('p');
      p.textContent = testo.trim(); // textContent: niente HTML, niente rischi
      paper.appendChild(p);
    });
    if (data.signature) {
      const s = document.createElement('p');
      s.className = 'sign';
      s.textContent = data.signature;
      paper.appendChild(s);
    }
  } catch (err) {
    console.error('Lettera non caricata, uso il testo di riserva:', err);
  }
}
caricaLettera();

// ---------- Conti alla rovescia: compleanno (13 novembre) e festa (15 novembre) ----------
(function () {
  // ORARIO DELLA FESTA: cambia questi due numeri con l'ora vera (es. 18 e 30). A 0 e 0 conta fino a mezzanotte.
  const FESTA_ORA = 0, FESTA_MINUTI = 0;
  const COMPLEANNO = new Date(2026, 10, 13, 0, 0, 0);          // mese 10 = novembre
  const FINE_COMPLEANNO = new Date(2026, 10, 14, 0, 0, 0);
  const FESTA = new Date(2026, 10, 15, FESTA_ORA, FESTA_MINUTI, 0);
  const FINE_FESTA = new Date(2026, 10, 16, 0, 0, 0);
  const elC = document.getElementById('countdown');
  const elF = document.getElementById('countdownFesta');

  function plurale(n, uno, molti) { return n + ' ' + (n === 1 ? uno : molti); }
  function mancano(ms) {
    const giorni = Math.floor(ms / 86400000);
    const ore = Math.floor(ms % 86400000 / 3600000);
    const min = Math.floor(ms % 3600000 / 60000);
    return 'Mancano ' + plurale(giorni, 'giorno', 'giorni') + ', ' + plurale(ore, 'ora', 'ore') + ' e ' + plurale(min, 'minuto', 'minuti');
  }
  function aggiorna() {
    const ora = new Date();
    if (elC) {
      if (ora < COMPLEANNO) elC.textContent = mancano(COMPLEANNO - ora) + ' al compleanno · ven 13 nov';
      else if (ora < FINE_COMPLEANNO) elC.textContent = 'Oggi è il grande giorno: buon compleanno!';
      else elC.textContent = 'Il 13 è passato, ma la versione 18.0 è appena partita.';
    }
    if (elF) {
      if (ora < FESTA) elF.textContent = mancano(FESTA - ora) + ' alla festa · dom 15 nov';
      else if (ora < FINE_FESTA) elF.textContent = 'È il momento della festa: divertitevi!';
      else elF.textContent = 'La festa è finita, ma i ricordi restano.';
    }
  }
  aggiorna();
  setInterval(aggiorna, 30000);
})();

// ---------- Foto di sfondo (destinazioni e pony) ----------
// Gli elementi con data-bgfolder e data-bgname cercano la foto
// "cartella/nome.(jpg|jpeg|png|webp)" prima su Supabase, poi in locale (foto/cartella/nome.jpg).
const ESTENSIONI = ['jpeg', 'jpg', 'png', 'webp'];
const VELO = 'linear-gradient(180deg, rgba(42,13,59,.2), rgba(42,13,59,.85))';
const VELO_LEGGERO = 'linear-gradient(180deg, rgba(42,13,59,.05), rgba(42,13,59,.35))';

function provaImmagine(url) {
  return new Promise(function (ok, no) {
    const img = new Image();
    img.onload = function () { ok(url); };
    img.onerror = no;
    img.src = url;
  });
}

function impostaSfondo(el, url) {
  const velo = el.dataset.velo === 'leggero' ? VELO_LEGGERO : VELO;
  el.style.backgroundImage = velo + ', url("' + url + '")';
  el.style.backgroundSize = 'cover';
  el.style.backgroundPosition = 'center';
  el.style.backgroundRepeat = 'no-repeat';
}

// Nella cartella sceglie il file il cui nome contiene "nome" (es. twilight) oppure il numero indicato (es. 1.jpeg)
function scegliPerNome(nomi, nome, numero) {
  const stem = function (n) { return n.replace(/\.[^.]+$/, '').toLowerCase(); };
  return nomi.find(function (n) { return nome && stem(n).indexOf(nome.toLowerCase()) !== -1; })
    || nomi.find(function (n) { return numero && stem(n) === String(numero); })
    || null;
}

async function cercaNellaCartella(cartella, nome, numero) {
  for (const c of [cartella, cartella.toLowerCase()]) { // Supabase distingue le maiuscole
    try {
      const r = await db.storage.from('photos').list(c, { limit: 100 });
      const nomi = (r.data || []).filter(function (f) { return /\.(jpe?g|png|webp|gif)$/i.test(f.name); }).map(function (f) { return f.name; });
      const file = scegliPerNome(nomi, nome, numero);
      if (file) return { cartella: c, file: file };
    } catch (e) { /* prossima variante */ }
  }
  return null;
}

async function applicaSfondo(el) {
  if (db && el.dataset.bgnum) { // es. cartella Pony: twilight.jpeg / pinkie.jpeg oppure 1.jpeg / 2.jpeg
    const t = await cercaNellaCartella(el.dataset.bgfolder, el.dataset.bgname, el.dataset.bgnum);
    if (t) { await applicaSfondoFile(el, t.cartella, t.file); return; }
  }
  const file = el.dataset.bgfolder + '/' + el.dataset.bgname;
  const candidati = [];
  if (db) ESTENSIONI.forEach(function (ext) {
    candidati.push(db.storage.from('photos').getPublicUrl(file + '.' + ext).data.publicUrl);
  });
  ESTENSIONI.forEach(function (ext) { candidati.push('foto/' + file + '.' + ext); });
  for (const url of candidati) {
    try {
      await provaImmagine(url);
      impostaSfondo(el, url);
      return;
    } catch (e) { /* prossimo candidato */ }
  }
  if (db) { // ultima possibilità: link temporaneo (serve se il bucket non è pubblico)
    for (const ext of ESTENSIONI) {
      const u = await urlFirmato('photos', file + '.' + ext);
      if (!u) continue;
      try { await provaImmagine(u); impostaSfondo(el, u); return; } catch (e) { /* niente */ }
    }
  }
}
document.querySelectorAll('[data-bgfolder]').forEach(applicaSfondo);

// ---------- Musica ----------
// Brani dalla tabella "music" di Supabase (copertina in photos/musica, audio nel bucket "audio").
// Senza Supabase: foto/musica/1.jpg ... e audio/1.mp3 ... in locale.
const player = document.getElementById('player');
const pCover = document.getElementById('pCover');
const pTitle = document.getElementById('pTitle');
const pArtist = document.getElementById('pArtist');
const pAudio = document.getElementById('pAudio');
const pMsg = document.getElementById('pMsg');
const SFONDO_COPERTINA = 'linear-gradient(160deg, #f19ac0, #7a3fa8)';

let correnteB = null;
let audioRiprovato = false;

function apriPlayer(b, coverUrl) {
  correnteB = b;
  audioRiprovato = false;
  player.classList.remove('in-pausa');
  const cover = coverUrl || b.cover;
  pCover.style.backgroundImage = cover ? 'url("' + cover + '"), ' + SFONDO_COPERTINA : SFONDO_COPERTINA;
  pTitle.textContent = b.title || '';
  pArtist.textContent = b.artist || '';
  pMsg.hidden = true;
  if (b.audio) {
    pAudio.hidden = false;
    pAudio.src = b.audio;
    pAudio.play().catch(function () { /* il browser può chiedere un tocco su Play */ });
  } else {
    pAudio.hidden = true;
    pAudio.removeAttribute('src');
    pMsg.textContent = 'Per questo brano non c’è ancora un file audio.';
    pMsg.hidden = false;
  }
  player.classList.add('on');
}
function chiudiPlayer() {
  pAudio.pause();
  pAudio.removeAttribute('src');
  pAudio.load();
  player.classList.remove('on');
}
pAudio.addEventListener('error', async function () {
  if (!pAudio.getAttribute('src')) return;
  // prima prova con un link temporaneo (serve se il bucket non è pubblico)
  if (!audioRiprovato && correnteB && correnteB.audioPath) {
    audioRiprovato = true;
    const u = await urlFirmato('audio', correnteB.audioPath);
    if (u) { pAudio.src = u; pAudio.play().catch(function () {}); return; }
  }
  pMsg.textContent = 'Non riesco a caricare questo brano.';
  pMsg.hidden = false;
});
document.getElementById('closePlayer').addEventListener('click', chiudiPlayer);
player.addEventListener('click', function (e) { if (e.target === player) chiudiPlayer(); });
document.addEventListener('keydown', function (e) { if (e.key === 'Escape') chiudiPlayer(); });

function creaCopertina(b, i) {
  const tile = document.createElement('button');
  tile.type = 'button';
  tile.className = 'ph track';
  tile.setAttribute('aria-label', 'Ascolta ' + (b.title || 'brano ' + (i + 1)));
  const nota = document.createElement('span');
  nota.className = 'note';
  nota.textContent = '♪';
  tile.appendChild(nota);
  if (b.cover) {
    const img = document.createElement('img');
    img.src = b.cover;
    img.alt = '';
    img.loading = 'lazy';
    img.onerror = async function () {
      if (!this.dataset.firmato && b.coverPath) {
        this.dataset.firmato = '1';
        const u = await urlFirmato('photos', b.coverPath);
        if (u) { this.src = u; return; }
      }
      this.remove();
    };
    tile.appendChild(img);
  }
  if (b.title || b.artist) {
    const cap = document.createElement('span');
    cap.className = 'cap';
    const t = document.createElement('b');
    t.textContent = b.title || b.artist;
    cap.appendChild(t);
    if (b.title && b.artist) cap.appendChild(document.createTextNode(b.artist));
    tile.appendChild(cap);
  }
  tile.addEventListener('click', function () {
    const im = tile.querySelector('img');
    apriPlayer(b, im ? im.src : b.cover);
  });
  return tile;
}

async function caricaMusica() {
  const griglia = document.getElementById('musicGrid');
  let brani = [];
  if (db) {
    try {
      const { data, error } = await db.from('music')
        .select('artist, title, cover, audio').order('position', { ascending: true });
      if (!error && data) {
        brani = data.map(function (r) {
          return {
            artist: r.artist,
            title: r.title,
            cover: r.cover ? db.storage.from('photos').getPublicUrl('Musica/' + r.cover).data.publicUrl : null,
            coverPath: r.cover ? 'Musica/' + r.cover : null,
            audio: r.audio ? db.storage.from('audio').getPublicUrl(r.audio).data.publicUrl : null,
            audioPath: r.audio || null
          };
        });
      }
    } catch (err) {
      console.error('Musica non caricata da Supabase:', err);
    }
  }
  if (!brani.length && db) brani = await braniDalleCartelle();
  if (!brani.length) {
    const n = parseInt(griglia.dataset.slots, 10) || 8;
    for (let i = 1; i <= n; i++) brani.push({ artist: '', title: '', cover: 'foto/Musica/' + i + '.jpeg', audio: 'audio/' + i + '.mp3' });
  }
  // completa l'ultima riga ripetendo i primi brani, così la griglia non ha buchi
  const originali = brani.length;
  for (let k = 0; brani.length % 4 !== 0; k++) brani.push(brani[k % originali]);
  griglia.textContent = '';
  brani.forEach(function (b, i) { griglia.appendChild(creaCopertina(b, i)); });
}
caricaMusica();

// ---------- Calendario: novembre 2026, venerdì 13 cerchiato con un cuore ----------
(function () {
  const ANNO = 2026, MESE = 10, GIORNO = 13, FESTA = 15; // MESE: 0 = gennaio, 10 = novembre
  const cal = document.getElementById('cal');
  if (!cal) return;
  const mesi = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
  const giorni = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
  document.getElementById('calMese').textContent = mesi[MESE];
  document.getElementById('calAnno').textContent = ANNO;
  const griglia = document.getElementById('calGrid');

  giorni.forEach(function (g) {
    const d = document.createElement('div');
    d.className = 'dow';
    const full = document.createElement('span');
    full.className = 'full';
    full.textContent = g;
    const abbr = document.createElement('span');
    abbr.className = 'abbr';
    abbr.textContent = g.slice(0, 3);
    d.appendChild(full);
    d.appendChild(abbr);
    griglia.appendChild(d);
  });

  const primo = (new Date(ANNO, MESE, 1).getDay() + 6) % 7; // settimana da lunedì
  const nelMese = new Date(ANNO, MESE + 1, 0).getDate();
  const mesePrec = new Date(ANNO, MESE, 0).getDate();
  const totale = Math.ceil((primo + nelMese) / 7) * 7;
  const CUORE = '<svg class="heart" viewBox="0 0 200 180" aria-hidden="true">' +
    '<path pathLength="1" d="M100 168C24 108 10 46 56 30c24-8 40 6 44 26 4-20 20-34 44-26 46 16 32 78-44 138z"/>' +
    '<path pathLength="1" d="M104 172C20 106 4 40 54 24c26-9 42 8 46 30 5-22 22-38 48-28 48 17 30 84-44 146z"/></svg>';

  for (let i = 0; i < totale; i++) {
    const cella = document.createElement('div');
    cella.className = 'cell';
    let n;
    if (i < primo) { n = mesePrec - primo + i + 1; cella.classList.add('off'); }
    else if (i >= primo + nelMese) { n = i - primo - nelMese + 1; cella.classList.add('off'); }
    else { n = i - primo + 1; }
    const num = document.createElement('span');
    num.className = 'num';
    num.textContent = n;
    cella.appendChild(num);
    if (!cella.classList.contains('off') && n === GIORNO) {
      cella.classList.add('big');
      cella.setAttribute('aria-label', giorni[i % 7] + ' ' + n + ' ' + mesi[MESE].toLowerCase() + ' ' + ANNO + ': compleanno di Elettra');
      cella.insertAdjacentHTML('beforeend', CUORE); // stringa fissa, nessun dato esterno
      const etichetta = document.createElement('span');
      etichetta.className = 'label';
      etichetta.textContent = 'Elettra’s birthday';
      cella.appendChild(etichetta);
    }
    if (!cella.classList.contains('off') && n === FESTA) {
      cella.classList.add('party');
      cella.setAttribute('aria-label', giorni[i % 7] + ' ' + n + ' ' + mesi[MESE].toLowerCase() + ' ' + ANNO + ': festa di compleanno');
      const et = document.createElement('span');
      et.className = 'label';
      et.textContent = 'Festa';
      cella.appendChild(et);
    }
    griglia.appendChild(cella);
  }

  // il cuore si disegna quando il calendario entra nello schermo
  if ('IntersectionObserver' in window) {
    const oss = new IntersectionObserver(function (voci) {
      if (voci[0].isIntersecting) { cal.classList.add('visible'); oss.disconnect(); }
    }, { threshold: 0.35 });
    oss.observe(cal);
  } else {
    cal.classList.add('visible');
  }
})();

// ---------- Organizzazione per cartelle (bucket "photos") ----------
// Cartelle: Cibi, Luoghi, Mondo, Musica, Passatempi, Persone, Silly, Vibes (maiuscole: Supabase distingue).
// File numerati 1.jpeg, 2.jpeg ... ; brani nel bucket "audio" come 1.mp3, 2.mp3 ...
// Copertina: gey.jpeg fuori dalle cartelle (nome modificabile dalla tabella site_settings).

// ordina 1, 2, 3 ... 10, 11 (e non 1, 10, 11, 2)
function ORDINE_NUMERICO(a, b) {
  return a.name.localeCompare(b.name, undefined, { numeric: true });
}

// Se la tabella "music" è vuota, abbina da solo Musica/N.jpeg con audio/N.mp3
async function braniDalleCartelle() {
  try {
    const foto = await db.storage.from('photos').list('Musica', { limit: 100 });
    const audio = await db.storage.from('audio').list('', { limit: 100 });
    if (foto.error || audio.error || !foto.data || !audio.data) return [];
    const stem = function (nome) { return nome.replace(/\.[^.]+$/, ''); };
    const tracce = {};
    audio.data.forEach(function (f) {
      if (/\.(mp3|m4a|aac|ogg|wav|webm)$/i.test(f.name)) tracce[stem(f.name)] = f.name;
    });
    return foto.data
      .filter(function (f) { return /\.(jpe?g|png|webp|gif)$/i.test(f.name); })
      .sort(ORDINE_NUMERICO)
      .map(function (f) {
        const a = tracce[stem(f.name)];
        return {
          artist: '',
          title: '',
          cover: db.storage.from('photos').getPublicUrl('Musica/' + f.name).data.publicUrl,
          coverPath: 'Musica/' + f.name,
          audio: a ? db.storage.from('audio').getPublicUrl(a).data.publicUrl : null,
          audioPath: a || null
        };
      });
  } catch (err) {
    console.error('Musica dalle cartelle non caricata:', err);
    return [];
  }
}

// Sfondo da un file preciso (cartella + nome completo)
async function applicaSfondoFile(el, cartella, nomeFile) {
  const candidati = [];
  if (db) candidati.push(db.storage.from('photos').getPublicUrl(cartella + '/' + nomeFile).data.publicUrl);
  candidati.push('foto/' + cartella + '/' + nomeFile);
  for (const url of candidati) {
    try {
      await provaImmagine(url);
      impostaSfondo(el, url);
      return;
    } catch (e) { /* prossimo candidato */ }
  }
  if (db) {
    const u = await urlFirmato('photos', cartella + '/' + nomeFile);
    if (u) { try { await provaImmagine(u); impostaSfondo(el, u); } catch (e) { /* niente */ } }
  }
}

// Tabella "destinations": nome, posizione e foto (Luoghi/<photo>)
async function caricaDestinazioni() {
  if (!db) return;
  try {
    const { data, error } = await db.from('destinations')
      .select('position, name, photo').order('position', { ascending: true });
    if (error || !data || !data.length) return;
    const box = document.querySelector('.dests');
    box.textContent = '';
    data.forEach(function (r) {
      const card = document.createElement('article');
      card.className = 'dest';
      const n = document.createElement('span');
      n.className = 'n';
      n.textContent = r.position;
      const h = document.createElement('h3');
      h.textContent = r.name;
      card.appendChild(n);
      card.appendChild(h);
      box.appendChild(card);
      if (r.photo) applicaSfondoFile(card, 'Luoghi', r.photo);
    });
  } catch (err) {
    console.error('Destinazioni non caricate da Supabase:', err);
  }
}

// ---------- Impostazioni, copertina e foto della lettera ----------
let _impostazioni = null;
let _radice = null;

// Tabella "site_settings": cover_photo, letter_photo, nickname
function leggiImpostazioni() {
  if (_impostazioni) return _impostazioni;
  _impostazioni = (async function () {
    const imp = {};
    if (!db) return imp;
    try {
      const { data } = await db.from('site_settings').select('key, value');
      (data || []).forEach(function (r) { imp[r.key] = r.value; });
    } catch (err) {
      console.error('Impostazioni non caricate da Supabase:', err);
    }
    return imp;
  })();
  return _impostazioni;
}

// File (non cartelle) nella radice del bucket photos
function fileNellaRadice() {
  if (_radice) return _radice;
  _radice = (async function () {
    if (!db) return [];
    try {
      const r = await db.storage.from('photos').list('', { limit: 100 });
      return (r.data || [])
        .filter(function (f) { return f.id && /\.(jpe?g|png|webp|gif)$/i.test(f.name); })
        .map(function (f) { return f.name; });
    } catch (e) { return []; }
  })();
  return _radice;
}

function radiceNome(n) { return n.replace(/\.[^.]+$/, '').toLowerCase(); }

// Trova il file voluto anche se cambia l'estensione (gey.jpg / gey.jpeg) o le maiuscole
function scegliFile(nomi, voluto) {
  if (!voluto) return null;
  return nomi.find(function (n) { return n.toLowerCase() === voluto.toLowerCase(); })
    || nomi.find(function (n) { return radiceNome(n) === radiceNome(voluto); })
    || null;
}

// Mostra una foto nel contenitore: link pubblico, poi link temporaneo, poi file locali.
function mostraFoto(box, percorso, locali, alt) {
  const img = document.createElement('img');
  img.alt = alt;
  const candidati = [];
  if (db && percorso) {
    candidati.push(db.storage.from('photos').getPublicUrl(percorso).data.publicUrl);
    candidati.push(null); // null = link temporaneo
  }
  locali.forEach(function (l) { candidati.push(l); });
  let i = 0;
  async function prossimo() {
    while (i < candidati.length) {
      let url = candidati[i++];
      if (url === null) url = await urlFirmato('photos', percorso);
      if (url) { img.src = url; return; }
    }
    img.remove();
  }
  img.onerror = prossimo;
  prossimo();
  box.appendChild(img);
}

// Copertina: il file indicato (gey.jpeg); se non lo trova, cerca gey.* o la prima immagine nella radice
async function caricaCopertina() {
  const g = document.querySelector('.gallery[data-file]');
  if (!g) return;
  const imp = await leggiImpostazioni();
  if (imp.nickname) {
    const nick = document.getElementById('nick');
    if (nick) nick.textContent = imp.nickname;
  }
  const voluto = imp.cover_photo || g.dataset.file;
  let nome = voluto;
  if (db) {
    const nomi = await fileNellaRadice();
    nome = scegliFile(nomi, voluto) || scegliFile(nomi, g.dataset.file) || scegliFile(nomi, 'gey')
      || nomi.find(function (n) { return !/^lettera/i.test(n); }) || voluto;
  }
  const fig = document.createElement('figure');
  fig.className = 'ph';
  const label = document.createElement('span');
  label.textContent = 'Foto';
  fig.appendChild(label);
  g.appendChild(fig);
  mostraFoto(fig, nome, ['foto/' + nome, 'foto/gey.jpeg', 'foto/gey.jpg'], 'Elettra');
}

// Foto accanto alla lettera: lettera.* nella radice, oppure la prima della cartella "Lettera", oppure foto/lettera.jpeg
async function caricaFotoLettera() {
  const box = document.getElementById('letterPhoto');
  if (!box) return;
  let percorso = null;
  if (db) {
    const imp = await leggiImpostazioni();
    percorso = scegliFile(await fileNellaRadice(), imp.letter_photo || 'lettera.jpeg');
    if (!percorso) {
      try {
        const r = await db.storage.from('photos').list('Lettera', { limit: 100 });
        const primo = (r.data || [])
          .filter(function (f) { return /\.(jpe?g|png|webp|gif)$/i.test(f.name); })
          .sort(ORDINE_NUMERICO)[0];
        if (primo) percorso = 'Lettera/' + primo.name;
      } catch (e) { /* si usa il file locale */ }
    }
  }
  mostraFoto(box, percorso, ['foto/lettera.jpeg', 'foto/lettera.jpg'], 'Elettra');
}

// Prima e dopo: prima.* e dopo.* nella radice di photos, oppure foto/prima.jpeg e foto/dopo.jpeg
async function caricaPrimaDopo() {
  const nomi = db ? await fileNellaRadice() : [];
  [['baPrima', 'prima'], ['baDopo', 'dopo']].forEach(function (c) {
    const box = document.querySelector('#' + c[0] + ' .ba-img');
    if (!box) return;
    const percorso = db ? scegliFile(nomi, c[1] + '.jpeg') : null;
    mostraFoto(box, percorso, ESTENSIONI.map(function (e) { return 'foto/' + c[1] + '.' + e; }), 'Elettra, ' + c[1]);
  });
}

// Sticker dei profumi: nella cartella "Profumi" di photos cerca il file che contiene "left" e quello
// che contiene "right" nel nome (es. profumi_left.png), con qualsiasi estensione; poi i file locali.
function scegliSticker(nomi, lato) {
  const rango = function (n) { return /\.png$/i.test(n) ? 0 : /\.webp$/i.test(n) ? 1 : 2; }; // meglio png/webp (trasparenti)
  return nomi
    .filter(function (n) { return n.toLowerCase().indexOf(lato) !== -1; })
    .sort(function (a, b) { return rango(a) - rango(b); })[0] || null;
}

async function caricaSticker() {
  const figure = document.querySelectorAll('.sticker[data-sticker]');
  if (!figure.length) return;
  let nomi = [];
  if (db) {
    try {
      const r = await db.storage.from('photos').list('Profumi', { limit: 100 });
      nomi = (r.data || []).filter(function (f) { return /\.(png|webp|jpe?g|gif)$/i.test(f.name); }).map(function (f) { return f.name; });
    } catch (e) { console.error('Sticker non elencati:', e); }
  }
  figure.forEach(function (fig) {
    const lato = fig.dataset.sticker;
    const trovato = scegliSticker(nomi, lato);
    mostraFoto(fig, trovato ? 'Profumi/' + trovato : null,
      ['foto/Profumi/' + lato + '.png', 'foto/Profumi/profumi_' + lato + '.png'], '');
  });
}

caricaDestinazioni();
caricaCopertina();
caricaFotoLettera();
caricaPrimaDopo();
caricaSticker();

// ---------- Modalità controllo: apri il sito con ?debug in fondo all'indirizzo ----------
// Ogni foto mostra il suo percorso (es. Cibi/3.jpeg), così vedi subito se è nella sezione giusta.
if (/[?&]debug(=|&|$)/.test(location.search)) {
  document.body.classList.add('debug');
  pannelloControllo();
}

// Pannello diagnostico: mostra cosa funziona e cosa no nel collegamento con Supabase
async function pannelloControllo() {
  const box = document.createElement('pre');
  box.id = 'debugPanel';
  document.body.appendChild(box);
  const righe = [];
  const scrivi = function (t) { righe.push(t); box.textContent = righe.join('\n'); };
  scrivi('CONTROLLO COLLEGAMENTO');
  scrivi(window.supabase ? '✔ libreria Supabase caricata' : '✘ libreria Supabase NON caricata (rete o blocco della CDN)');
  scrivi(configurato ? '✔ chiavi inserite in config.js' : '✘ chiavi NON inserite: apri config.js e incolla Project URL e chiave anon');
  if (!db) { scrivi('Senza collegamento il sito usa solo i file locali (cartella foto).'); return; }
  try {
    const radice = await db.storage.from('photos').list('', { limit: 100 });
    const copertina = (document.querySelector('.gallery[data-file]') || {dataset: {}}).dataset.file;
    if (radice.error) scrivi('✘ bucket photos: ' + radice.error.message);
    else scrivi((radice.data.some(function (f) { return f.name === copertina; }) ? '✔ ' : '✘ ') + 'copertina ' + copertina + ' fuori dalle cartelle');
    if (!radice.error) scrivi('file nella radice di photos: ' + (radice.data.filter(function (f) { return f.id; }).map(function (f) { return f.name; }).join(', ') || 'nessuno'));
    const prova = await db.storage.from('photos').list('Cibi', { limit: 10 });
    const primo = (prova.data || []).find(function (f) { return /\.(jpe?g|png|webp|gif)$/i.test(f.name); });
    if (primo) {
      const u = db.storage.from('photos').getPublicUrl('Cibi/' + primo.name).data.publicUrl;
      try { await provaImmagine(u); scrivi('✔ bucket photos pubblico: i link diretti funzionano'); }
      catch (e) { scrivi('✘ bucket photos NON pubblico: il sito usa un link temporaneo di riserva'); }
    }
    const cartelle = ['Persone', 'Cibi', 'Silly', 'Vibes', 'Musica', 'Luoghi', 'Mondo', 'Passatempi'];
    for (const c of cartelle) {
      const r = await db.storage.from('photos').list(c, { limit: 100 });
      if (r.error) { scrivi('✘ ' + c + ': ' + r.error.message); continue; }
      const n = r.data.filter(function (f) { return f.name !== '.emptyFolderPlaceholder'; }).length;
      scrivi((n ? '✔ ' : '✘ ') + c + ': ' + n + ' file');
    }
    const po = await db.storage.from('photos').list('Pony', { limit: 100 });
    scrivi(po.error ? '✘ cartella Pony: ' + po.error.message
      : 'pony in Pony: ' + (po.data.filter(function (f) { return f.id; }).map(function (f) { return f.name; }).join(', ') || 'nessuno'));
    const pr = await db.storage.from('photos').list('Profumi', { limit: 100 });
    scrivi(pr.error ? '✘ cartella Profumi: ' + pr.error.message
      : 'sticker in Profumi: ' + (pr.data.filter(function (f) { return f.id; }).map(function (f) { return f.name; }).join(', ') || 'nessuno'));
    const a = await db.storage.from('audio').list('', { limit: 100 });
    scrivi(a.error ? '✘ bucket audio: ' + a.error.message : (a.data.length ? '✔ ' : '✘ ') + 'audio: ' + a.data.length + ' file');
    for (const t of ['photo_folders', 'site_settings', 'letter', 'destinations', 'music', 'photo_captions']) {
      const r = await db.from(t).select('*', { count: 'exact', head: true });
      scrivi(r.error ? '✘ tabella ' + t + ': ' + r.error.message : '✔ tabella ' + t + ': ' + r.count + ' righe');
    }
  } catch (err) {
    scrivi('✘ errore: ' + err.message);
  }
}

// ---------- Link temporanei di riserva ----------
// Se un file non si apre con il link pubblico (bucket impostato come privato),
// il sito chiede a Supabase un link temporaneo valido 24 ore e riprova.
async function urlFirmato(bucket, percorso) {
  if (!db) return null;
  try {
    const { data, error } = await db.storage.from(bucket).createSignedUrl(percorso, 86400);
    return error || !data ? null : data.signedUrl;
  } catch (e) {
    return null;
  }
}

// Riprova un'immagine/video con il link temporaneo; se fallisce ancora, nasconde
// l'elemento (o il suo contenitore data-avvolgi) quando è marcato con data-nascondi.
async function ripara(el) {
  if (!el || !el.dataset || !el.dataset.percorso) return;
  if (el.dataset.riprovato) { nascondiSeSegnato(el); return; }
  el.dataset.riprovato = '1';
  const url = await urlFirmato(el.dataset.bucket || 'photos', el.dataset.percorso);
  if (!url) { nascondiSeSegnato(el); return; }
  if (el.tagName === 'VIDEO') { el.dataset.src = url; el.src = url + '#t=0.1'; }
  else { el.src = url; }
}
function nascondiSeSegnato(el) {
  if (el.dataset.nascondi === undefined) return;
  (el.closest('[data-avvolgi]') || el).hidden = true;
}

// Gli errori di caricamento non "salgono": si ascoltano in fase di cattura.
document.addEventListener('error', function (e) { ripara(e.target); }, true);
// Immagini statiche (sticker, foto della lettera) già fallite prima che questo script partisse
document.querySelectorAll('img[data-percorso]').forEach(function (img) {
  if (img.complete && img.naturalWidth === 0) ripara(img);
});

// ---------- Player: il vinile si ferma quando la musica è in pausa ----------
pAudio.addEventListener('play', function () { player.classList.remove('in-pausa'); });
pAudio.addEventListener('pause', function () { player.classList.add('in-pausa'); });

// ---------- Comparsa morbida delle sezioni allo scorrimento ----------
(function () {
  if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.documentElement.classList.add('js');
  const oss = new IntersectionObserver(function (voci) {
    voci.forEach(function (v) {
      if (v.isIntersecting) { v.target.classList.add('visibile'); oss.unobserve(v.target); }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -6% 0px' });
  document.querySelectorAll('section .wrap > *').forEach(function (el) {
    el.classList.add('rivela');
    oss.observe(el);
  });
})();
