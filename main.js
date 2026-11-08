// ============================================================
// CONFIGURAZIONE SUPABASE
// Dashboard di Supabase > Project Settings > API
// Incolla qui il Project URL e la chiave "anon public".
// La chiave anon è fatta per stare nel browser: i permessi li
// decidono le policy RLS (vedi supabase-setup.sql).
// ============================================================
const SUPABASE_URL = 'https://tnrpttyhlamcnwravmik.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_3iiRaVZvcvP83fqa28ZPUA_WV4nw1zE';

const configurato = !SUPABASE_URL.startsWith('INCOLLA') && !SUPABASE_ANON_KEY.startsWith('INCOLLA');
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

// Se le foto caricate non completano l'ultimo blocco, ripete le prime
// così la griglia non ha mai buchi (mosaico: multipli di 6, altrimenti di 4).
function riempiBuchi(g) {
  const base = g.classList.contains('mosaic') ? 6 : 4;
  const multiplo = parseInt(g.dataset.fill, 10) || base;
  const tessere = Array.from(g.children);
  if (!tessere.length || multiplo < 2) return;
  let i = 0;
  while (g.children.length % multiplo !== 0) {
    g.appendChild(tessere[i % tessere.length].cloneNode(true));
    i++;
  }
}

function riempiSegnaposto(g) {
  const cartella = g.dataset.folder;
  const n = parseInt(g.dataset.slots, 10) || 6;
  for (let i = 1; i <= n; i++) {
    const fig = creaFoto('foto/' + cartella + '/' + i + '.jpg', 'Foto ' + i);
    const label = document.createElement('span');
    label.textContent = (g.dataset.label || 'Foto') + ' ' + i;
    fig.prepend(label);
    fig.querySelector('img').onerror = function () { this.remove(); };
    g.appendChild(fig);
  }
}

async function caricaDaSupabase(g) {
  if (!db) return;
  const cartella = g.dataset.folder;
  try {
    const { data, error } = await db.storage.from('photos').list(cartella, {
      limit: 60, sortBy: { column: 'name', order: 'asc' }
    });
    if (error || !data) return;
    const file = data.filter(function (f) { return /\.(jpe?g|png|webp|gif|mp4|webm|mov|m4v)$/i.test(f.name); });
    if (!file.length) return;
    g.textContent = '';
    file.forEach(function (f, i) {
      const url = db.storage.from('photos').getPublicUrl(cartella + '/' + f.name).data.publicUrl;
      g.appendChild(creaFoto(url, 'Elettra, ' + cartella + ' ' + (i + 1)));
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

// ---------- Conto alla rovescia: venerdì 13 novembre 2026 ----------
(function () {
  const el = document.getElementById('countdown');
  const traguardo = new Date(2026, 10, 13, 0, 0, 0); // mese 10 = novembre
  function aggiorna() {
    const ms = traguardo - new Date();
    if (ms <= 0) { el.textContent = 'Oggi è il grande giorno: buon compleanno!'; return; }
    const giorni = Math.floor(ms / 86400000);
    const ore = Math.floor(ms % 86400000 / 3600000);
    const min = Math.floor(ms % 3600000 / 60000);
    el.textContent = 'Mancano ' + giorni + (giorni === 1 ? ' giorno, ' : ' giorni, ') + ore + (ore === 1 ? ' ora e ' : ' ore e ') + min + (min === 1 ? ' minuto' : ' minuti') + ' a venerdì 13.';
  }
  aggiorna();
  setInterval(aggiorna, 60000);
})();

// ---------- Foto di sfondo (destinazioni e pony) ----------
// Gli elementi con data-bgfolder e data-bgname cercano la foto
// "cartella/nome.(jpg|jpeg|png|webp)" prima su Supabase, poi in locale (foto/cartella/nome.jpg).
const ESTENSIONI = ['jpg', 'jpeg', 'png', 'webp'];
const VELO = 'linear-gradient(180deg, rgba(42,13,59,.2), rgba(42,13,59,.85))';

function provaImmagine(url) {
  return new Promise(function (ok, no) {
    const img = new Image();
    img.onload = function () { ok(url); };
    img.onerror = no;
    img.src = url;
  });
}

async function applicaSfondo(el) {
  const file = el.dataset.bgfolder + '/' + el.dataset.bgname;
  const candidati = [];
  if (db) ESTENSIONI.forEach(function (ext) {
    candidati.push(db.storage.from('photos').getPublicUrl(file + '.' + ext).data.publicUrl);
  });
  ESTENSIONI.forEach(function (ext) { candidati.push('foto/' + file + '.' + ext); });
  for (const url of candidati) {
    try {
      await provaImmagine(url);
      el.style.backgroundImage = VELO + ', url("' + url + '")';
      return;
    } catch (e) { /* prossimo candidato */ }
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

function apriPlayer(b) {
  pCover.style.backgroundImage = b.cover ? 'url("' + b.cover + '"), ' + SFONDO_COPERTINA : SFONDO_COPERTINA;
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
pAudio.addEventListener('error', function () {
  if (!pAudio.getAttribute('src')) return;
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
    img.onerror = function () { this.remove(); };
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
  tile.addEventListener('click', function () { apriPlayer(b); });
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
            cover: r.cover ? db.storage.from('photos').getPublicUrl('musica/' + r.cover).data.publicUrl : null,
            audio: r.audio ? db.storage.from('audio').getPublicUrl(r.audio).data.publicUrl : null
          };
        });
      }
    } catch (err) {
      console.error('Musica non caricata da Supabase:', err);
    }
  }
  if (!brani.length) {
    const n = parseInt(griglia.dataset.slots, 10) || 8;
    for (let i = 1; i <= n; i++) brani.push({ artist: '', title: '', cover: 'foto/musica/' + i + '.jpg', audio: 'audio/' + i + '.mp3' });
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
  const ANNO = 2026, MESE = 10, GIORNO = 13; // MESE: 0 = gennaio, 10 = novembre
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
